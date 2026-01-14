"use client";

import { useState, useEffect } from "react";

type LiveScoreboardProps = {
  boutId: string;
  redName: string;
  blueName: string;
  totalRounds?: number;
  autoRefresh?: boolean;
};

type Score = {
  round_number: number;
  red_score: number;
  blue_score: number;
};

type BoutState = {
  is_live: boolean;
  current_round: number;
  round_time_seconds: number;
  total_rounds: number;
};

export default function LiveScoreboard({
  boutId,
  redName,
  blueName,
  totalRounds = 3,
  autoRefresh = true,
}: LiveScoreboardProps) {
  const [scores, setScores] = useState<Score[]>([]);
  const [boutState, setBoutState] = useState<BoutState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData();
      }, 5000); // Refresh every 5 seconds

      return () => clearInterval(interval);
    }
  }, [boutId, autoRefresh]);

  async function loadData() {
    try {
      // Load scores
      const scoresResponse = await fetch(`/api/bouts/${boutId}/score`);
      const scoresData = await scoresResponse.json();
      if (scoresData.scores) {
        setScores(scoresData.scores);
      }

      // Load bout state
      const stateResponse = await fetch(`/api/bouts/${boutId}/live`);
      const stateData = await stateResponse.json();
      if (stateData.bout) {
        setBoutState({
          is_live: stateData.bout.is_live || false,
          current_round: stateData.bout.current_round || 1,
          round_time_seconds: stateData.bout.round_time_seconds || 0,
          total_rounds: stateData.bout.total_rounds || totalRounds,
        });
      }
    } catch (error) {
      console.error("Error loading scoreboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const totalRed = scores.reduce((sum, s) => sum + s.red_score, 0);
  const totalBlue = scores.reduce((sum, s) => sum + s.blue_score, 0);

  if (loading) {
    return (
      <div className="card text-center py-8 text-slate-600">
        Loading scoreboard...
      </div>
    );
  }

  if (!boutState?.is_live && scores.length === 0) {
    return null; // Don't show if bout isn't live and no scores
  }

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Scoreboard</h3>
        {boutState?.is_live && (
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
            LIVE
          </span>
        )}
      </div>

      {/* Fighter names and totals */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 bg-red-50 rounded-lg border-2 border-red-200">
          <div className="text-xs font-medium text-red-700 mb-1">RED CORNER</div>
          <div className="text-lg font-bold text-red-900">{redName}</div>
          <div className="text-2xl font-extrabold text-red-600 mt-2">{totalRed}</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <div className="text-xs font-medium text-blue-700 mb-1">BLUE CORNER</div>
          <div className="text-lg font-bold text-blue-900">{blueName}</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-2">{totalBlue}</div>
        </div>
      </div>

      {/* Round info */}
      {boutState?.is_live && (
        <div className="flex items-center justify-center gap-4 p-3 bg-slate-100 rounded-lg">
          <div className="text-center">
            <div className="text-xs text-slate-600">Round</div>
            <div className="text-xl font-bold text-slate-900">
              {boutState.current_round} / {boutState.total_rounds}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-600">Time</div>
            <div className="text-xl font-bold text-slate-900">
              {formatTime(boutState.round_time_seconds)}
            </div>
          </div>
        </div>
      )}

      {/* Round-by-round scores */}
      {scores.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-700">Round Scores</div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="font-medium text-slate-600">Round</div>
            <div className="font-medium text-red-700 text-center">Red</div>
            <div className="font-medium text-blue-700 text-center">Blue</div>
            {Array.from({ length: boutState?.total_rounds || totalRounds }, (_, i) => i + 1).map((round) => {
              const roundScore = scores.find(s => s.round_number === round);
              const isCurrentRound = boutState?.is_live && boutState.current_round === round;
              return (
                <>
                  <div key={`label-${round}`} className={`${isCurrentRound ? "font-bold" : ""}`}>
                    Round {round} {isCurrentRound && "●"}
                  </div>
                  <div key={`red-${round}`} className={`text-center ${isCurrentRound ? "font-bold text-red-700" : ""}`}>
                    {roundScore?.red_score ?? "-"}
                  </div>
                  <div key={`blue-${round}`} className={`text-center ${isCurrentRound ? "font-bold text-blue-700" : ""}`}>
                    {roundScore?.blue_score ?? "-"}
                  </div>
                </>
              );
            })}
            <div className="font-bold text-slate-900 pt-2 border-t">Total</div>
            <div className="font-bold text-red-700 text-center pt-2 border-t">{totalRed}</div>
            <div className="font-bold text-blue-700 text-center pt-2 border-t">{totalBlue}</div>
          </div>
        </div>
      )}
    </div>
  );
}


