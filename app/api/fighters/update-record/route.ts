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

    console.log("=== UPDATE RECORD API CALLED ===");
    console.log("Fighter ID:", fighterId);
    console.log("New Total Record (from request):", newTotalRecord || "not provided");

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
      console.log("Fighter not found:", fighterId);
      return NextResponse.json({ error: "Fighter not found" }, { status: 404 });
    }
    
    console.log("Current record_base from DB:", profile.record_base);

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

    // 3. Calculate Stats from Apex bouts ONLY
    // Manual fight history is NOT included in automatic calculations
    // because users include those in their manual record entry
    const apexRecord: RecordTriple = { wins: 0, losses: 0, draws: 0 };
    let last5 = "";
    let streak = 0;
    let streakBroken = false;

    console.log("Found", bouts?.length || 0, "Apex bouts with results");
    console.log("Found", manualFights?.length || 0, "manual fight history entries (NOT counted in record)");

    if (bouts) {
      // Calculate Wins, Losses, Draws from Apex bouts ONLY
      for (const bout of bouts) {
        const isRed = bout.red_fighter_id === fighterId;
        const result = bout.winner_side;

        console.log(`Bout ${bout.id}: isRed=${isRed}, winner_side=${result}`);

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
    
    console.log("Apex record calculated (excluding manual fights):", formatRecord(apexRecord));

    // NOTE: Manual fight history is NOT added to apexRecord anymore
    // Users are expected to include their manual fights in their record_base
    // Manual fights are only used for display on the profile page

    // Calculate Last 5 and Streak from Apex bouts ONLY
    // Manual fights are excluded from these calculations too
    const allFights = [
      ...(bouts || []).map(b => ({
        date: b.created_at,
        result: b.winner_side,
        isApex: true,
        isRed: b.red_fighter_id === fighterId
      }))
      // Manual fights are NOT included - they're for profile display only
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (allFights.length > 0) {
      // Form: Last 5 Apex bouts (WWLDW format)
      const recent5 = allFights.slice(0, 5).reverse();
      last5 = recent5.map(fight => {
        if (fight.result === "draw") return "D";
        if (fight.result === "no_contest") return "N";
        
        const won = (fight.isRed && fight.result === "red") || (!fight.isRed && fight.result === "blue");
        return won ? "W" : "L";
      }).join("");

      // Streak: Consecutive wins from Apex bouts
      for (const fight of allFights) {
        if (streakBroken) break;
        if (fight.result === "draw" || fight.result === "no_contest") {
          streakBroken = true;
          break;
        }
        
        const won = (fight.isRed && fight.result === "red") || (!fight.isRed && fight.result === "blue");
        
        if (won) streak++;
        else streakBroken = true;
      }
    }

    // 4. Update the profile with total record
    let recordBaseToSave = profile.record_base;
    let finalTotalRecord = "";

    // Also fetch current record to compare and prevent accidental resets
    const { data: currentProfile } = await supabaseAdmin
      .from("profiles")
      .select("record")
      .eq("id", fighterId)
      .single();
    
    const currentRecord = parseRecord(currentProfile?.record);

    if (newTotalRecord) {
      // If user provided a new total from settings, set BOTH record and record_base to that value
      // This treats the user's input as the definitive record, NOT as "total including Apex wins"
      // The user's manually entered record should be preserved as-is
      recordBaseToSave = newTotalRecord;
      finalTotalRecord = newTotalRecord;
      console.log("Using user-provided total as BOTH record and record_base:", newTotalRecord);
      console.log("This preserves the user's manual entry without subtracting Apex wins");
    } else {
      // Standard recalculation
      const base = parseRecord(profile.record_base || "0-0-0");
      console.log("Parsed record_base:", formatRecord(base));
      
      finalTotalRecord = formatRecord({
        wins: base.wins + apexRecord.wins,
        losses: base.losses + apexRecord.losses,
        draws: base.draws + apexRecord.draws,
      });
      console.log("Calculated final record:", finalTotalRecord, "= record_base", formatRecord(base), "+ apex", formatRecord(apexRecord));
      
      // Safety check: If the new record would have FEWER WINS than current,
      // this is suspicious and we should investigate before applying
      const newTotal = parseRecord(finalTotalRecord);
      const newTotalFights = newTotal.wins + newTotal.losses + newTotal.draws;
      const currentTotalFights = currentRecord.wins + currentRecord.losses + currentRecord.draws;
      
      console.log("Current record in DB:", currentProfile?.record);
      console.log("New record would be:", finalTotalRecord);
      console.log("Current total fights:", currentTotalFights, "New total fights:", newTotalFights);
      console.log("Current wins:", currentRecord.wins, "New wins:", newTotal.wins);
      
      // If wins would decrease, log extensively and skip the update
      if (newTotal.wins < currentRecord.wins) {
        console.warn(`⚠️ RECORD WOULD LOSE WINS for fighter ${fighterId}!`);
        console.warn(`Current: ${currentProfile?.record} → Would become: ${finalTotalRecord}`);
        console.warn(`Wins would decrease from ${currentRecord.wins} to ${newTotal.wins}`);
        console.warn(`Apex bouts found: ${bouts?.length || 0}`);
        console.warn(`Manual fights found: ${manualFights?.length || 0}`);
        console.warn(`record_base: ${profile.record_base}`);
        
        // Don't apply updates that reduce wins unless there are fewer total bouts than current wins
        const totalBoutsAndFights = (bouts?.length || 0) + (manualFights?.length || 0);
        if (totalBoutsAndFights < currentRecord.wins) {
          console.warn(`SKIPPING UPDATE: Total bouts/fights (${totalBoutsAndFights}) is less than current wins (${currentRecord.wins})`);
          return NextResponse.json({ 
            success: true, 
            totalRecord: currentProfile?.record || finalTotalRecord,
            last5,
            streak,
            skipped: true,
            reason: "Would reduce wins unexpectedly"
          });
        }
      }
      
      if (newTotalFights < currentTotalFights && (bouts?.length || 0) === 0 && (manualFights?.length || 0) === 0) {
        console.log(`Skipping record update for fighter ${fighterId}: would reduce total fights from ${currentTotalFights} to ${newTotalFights} with no bouts or manual fights`);
        return NextResponse.json({ 
          success: true, 
          totalRecord: currentProfile?.record || finalTotalRecord,
          last5,
          streak,
          skipped: true,
          reason: "Would reduce record with no bouts"
        });
      }
    }
    
    console.log("=== FINAL UPDATE ===");
    console.log("Setting record to:", finalTotalRecord);
    console.log("Setting record_base to:", recordBaseToSave);
    console.log("=== END UPDATE RECORD API ===");

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
