import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing required Supabase environment variables.");
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

type RecordTriple = {
  wins: number;
  losses: number;
  draws: number;
};

function parseRecord(record: string | null | undefined): RecordTriple {
  if (!record) return { wins: 0, losses: 0, draws: 0 };
  const nums = record.match(/\d+/g);
  if (!nums || nums.length === 0) return { wins: 0, losses: 0, draws: 0 };
  return {
    wins: parseInt(nums[0] ?? "0", 10) || 0,
    losses: parseInt(nums[1] ?? "0", 10) || 0,
    draws: parseInt(nums[2] ?? "0", 10) || 0,
  };
}

function formatRecord({ wins, losses, draws }: RecordTriple): string {
  return `${Math.max(0, wins)}-${Math.max(0, losses)}-${Math.max(0, draws)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fighterId, newTotalRecord } = body;

    if (!fighterId) {
      return NextResponse.json({ error: "Missing fighterId" }, { status: 400 });
    }

    // 1. Fetch current profile record_base
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("record_base")
      .eq("id", fighterId)
      .single();

    if (fetchError || !profile) {
      return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
    }

    // 2. Fetch ALL bouts for this fighter that have a result
    const { data: bouts, error: boutsError } = await supabaseAdmin
      .from("event_bouts")
      .select("id, winner_side, red_fighter_id, blue_fighter_id, created_at")
      .or(`red_fighter_id.eq.${fighterId},blue_fighter_id.eq.${fighterId}`)
      .not("winner_side", "is", null)
      .order("created_at", { ascending: false });

    if (boutsError) throw boutsError;

    // 2.5 Fetch ALL manual fight history entries
    const { data: manualFights, error: manualError } = await supabaseAdmin
      .from("fighter_fight_history")
      .select("result, event_date")
      .eq("fighter_profile_id", fighterId);

    if (manualError) throw manualError;

    // 3. Calculate Stats
    const apexRecord: RecordTriple = { wins: 0, losses: 0, draws: 0 };
    let last5 = "";
    let streak = 0;
    let streakBroken = false;

    if (bouts) {
      // Calculate Wins, Losses, Draws from Apex bouts
      for (const bout of bouts) {
        const isRed = bout.red_fighter_id === fighterId;
        const result = bout.winner_side;

        if (result === "draw") {
          apexRecord.draws++;
        } else if (result === "no_contest") {
          // ignore
        } else {
          const won = (isRed && result === "red") || (!isRed && result === "blue");
          if (won) apexRecord.wins++;
          else apexRecord.losses++;
        }
      }
    }

    // Add manual fight history to apexRecord counts
    if (manualFights) {
      for (const fight of manualFights) {
        if (fight.result === "win") apexRecord.wins++;
        else if (fight.result === "loss") apexRecord.losses++;
        else if (fight.result === "draw") apexRecord.draws++;
      }
    }

    // Combine all fights for Last 5 and Streak
    const allFights = [
      ...(bouts || []).map(b => ({
        date: b.created_at,
        result: b.winner_side,
        isApex: true,
        isRed: b.red_fighter_id === fighterId
      })),
      ...(manualFights || []).map(f => ({
        date: f.event_date,
        result: f.result,
        isApex: false,
        isRed: true // Manual results are always from fighter perspective
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allFights.length > 0) {
      // Form: Last 5 bouts (WWLDW format)
      const recent5 = allFights.slice(0, 5).reverse();
      last5 = recent5.map(fight => {
        if (fight.result === "draw") return "D";
        if (fight.result === "no_contest") return "N";
        
        let won = false;
        if (fight.isApex) {
          won = (fight.isRed && fight.result === "red") || (!fight.isRed && fight.result === "blue");
        } else {
          won = fight.result === "win";
        }
        return won ? "W" : "L";
      }).join("");

      // Streak: Consecutive wins
      for (const fight of allFights) {
        if (streakBroken) break;
        if (fight.result === "draw" || fight.result === "no_contest") {
          streakBroken = true;
          break;
        }
        
        let won = false;
        if (fight.isApex) {
          won = (fight.isRed && fight.result === "red") || (!fight.isRed && fight.result === "blue");
        } else {
          won = fight.result === "win";
        }
        
        if (won) streak++;
        else streakBroken = true;
      }
    }

    // 4. Update the profile with total record
    let recordBaseToSave = profile.record_base;
    let finalTotalRecord = "";

    if (newTotalRecord) {
      // If user provided a new total from settings, reverse-calculate the base
      const updatedTotal = parseRecord(newTotalRecord);
      const calculatedBase = {
        wins: updatedTotal.wins - apexRecord.wins,
        losses: updatedTotal.losses - apexRecord.losses,
        draws: updatedTotal.draws - apexRecord.draws,
      };
      recordBaseToSave = formatRecord(calculatedBase);
      finalTotalRecord = newTotalRecord;
    } else {
      // Standard recalculation
      const base = parseRecord(profile.record_base || "0-0-0");
      finalTotalRecord = formatRecord({
        wins: base.wins + apexRecord.wins,
        losses: base.losses + apexRecord.losses,
        draws: base.draws + apexRecord.draws,
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ 
        record: finalTotalRecord,
        record_base: recordBaseToSave,
        last_5_form: last5 || null,
        current_win_streak: streak
      })
      .eq("id", fighterId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      totalRecord: finalTotalRecord,
      last5,
      streak
    });
  } catch (error: any) {
    console.error("Update record error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
