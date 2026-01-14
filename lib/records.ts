// lib/records.ts
export type Winner = "red" | "blue" | "draw" | "no_contest" | null;
export type Side = "red" | "blue";

export type RecordTriple = {
  wins: number;
  losses: number;
  draws: number;
};

function parseRecord(record: string | null | undefined): RecordTriple {
  if (!record) return { wins: 0, losses: 0, draws: 0 };

  const m = record.trim().match(/^(\d+)-(\d+)-(\d+)$/);
  if (!m) return { wins: 0, losses: 0, draws: 0 };

  return {
    wins: parseInt(m[1], 10) || 0,
    losses: parseInt(m[2], 10) || 0,
    draws: parseInt(m[3], 10) || 0,
  };
}

function formatRecord({ wins, losses, draws }: RecordTriple): string {
  const safeWins = Math.max(0, wins);
  const safeLosses = Math.max(0, losses);
  const safeDraws = Math.max(0, draws);
  return `${safeWins}-${safeLosses}-${safeDraws}`;
}

// How one fighter's record should change when a single bout's winner changes
export function diffForSide(
  oldWinner: Winner,
  newWinner: Winner,
  side: Side
): RecordTriple {
  const delta: RecordTriple = { wins: 0, losses: 0, draws: 0 };

  const apply = (winner: Winner, sign: 1 | -1) => {
    if (!winner || winner === "no_contest") return;

    if (winner === "draw") {
      delta.draws += sign;
    } else {
      const fighterWon = winner === side;
      if (fighterWon) delta.wins += sign;
      else delta.losses += sign;
    }
  };

  // remove old outcome, add new outcome
  apply(oldWinner, -1);
  apply(newWinner, 1);

  return delta;
}

// Take the current record string and apply a delta
export function applyRecordDelta(
  currentRecord: string | null | undefined,
  delta: RecordTriple
): string {
  const base = parseRecord(currentRecord);
  return formatRecord({
    wins: base.wins + delta.wins,
    losses: base.losses + delta.losses,
    draws: base.draws + delta.draws,
  });
}
