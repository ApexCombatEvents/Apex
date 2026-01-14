"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type LiveScoringInterfaceProps = {
  boutId: string;
  redName: string;
  blueName: string;
  totalRounds?: number;
  onScoreUpdate?: () => void;
};

export default function LiveScoringInterface({
  boutId,
  redName,
  blueName,
  totalRounds = 3,
  onScoreUpdate,
}: LiveScoringInterfaceProps) {
  const supabase = createSupabaseBrowser();
  const [currentRound, setCurrentRound] = useState(1);
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [roundTime, setRoundTime] = useState(0);
  const [roundStarted, setRoundStarted] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<number, { red: number; blue: number }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadBoutState();
    loadScores();

    // Refresh every 5 seconds
    const interval = setInterval(() => {
      loadBoutState();
      if (isLive && roundStarted) {
        const elapsed = Math.floor((Date.now() - new Date(roundStarted).getTime()) / 1000);
        setRoundTime(elapsed);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [boutId, isLive, roundStarted]);

  async function loadBoutState() {
    try {
      const response = await fetch(`/api/bouts/${boutId}/live`);
      const data = await response.json();
      
      if (data.bout) {
        setIsLive(data.bout.is_live || false);
        setCurrentRound(data.bout.current_round || 1);
        setRoundTime(data.bout.round_time_seconds || 0);
        setRoundStarted(data.bout.round_started_at);
      }
    } catch (error) {
      console.error("Error loading bout state:", error);
    }
  }

  async function loadScores() {
    try {
      const response = await fetch(`/api/bouts/${boutId}/score`);
      const data = await response.json();
      
      if (data.scores) {
        const scoresMap: Record<number, { red: number; blue: number }> = {};
        data.scores.forEach((s: any) => {
          scoresMap[s.round_number] = {
            red: s.red_score,
            blue: s.blue_score,
          };
        });
        setScores(scoresMap);
        
        // Set current round scores if available
        if (scoresMap[currentRound]) {
          setRedScore(scoresMap[currentRound].red);
          setBlueScore(scoresMap[currentRound].blue);
        }
      }
    } catch (error) {
      console.error("Error loading scores:", error);
    }
  }

  async function startBout() {
    setSaving(true);
    try {
      const response = await fetch(`/api/bouts/${boutId}/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_live: true,
          current_round: 1,
          total_rounds: totalRounds,
          bout_started_at: new Date().toISOString(),
          round_started_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setIsLive(true);
        setCurrentRound(1);
        setRoundStarted(new Date().toISOString());
        setMessage("Bout started");
      }
    } catch (error) {
      setMessage("Failed to start bout");
    } finally {
      setSaving(false);
    }
  }

  async function endBout() {
    setSaving(true);
    try {
      const response = await fetch(`/api/bouts/${boutId}/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_live: false,
          bout_ended_at: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setIsLive(false);
        setMessage("Bout ended");
      }
    } catch (error) {
      setMessage("Failed to end bout");
    } finally {
      setSaving(false);
    }
  }

  async function nextRound() {
    if (currentRound >= totalRounds) return;

    // Save current round score first
    await saveScore();

    setSaving(true);
    try {
      const response = await fetch(`/api/bouts/${boutId}/live`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_round: currentRound + 1,
          round_started_at: new Date().toISOString(),
          round_time_seconds: 0,
        }),
      });

      if (response.ok) {
        setCurrentRound(currentRound + 1);
        setRedScore(scores[currentRound + 1]?.red || 0);
        setBlueScore(scores[currentRound + 1]?.blue || 0);
        setRoundStarted(new Date().toISOString());
        setRoundTime(0);
        setMessage(`Round ${currentRound + 1} started`);
      }
    } catch (error) {
      setMessage("Failed to start next round");
    } finally {
      setSaving(false);
    }
  }

  async function saveScore() {
    if (redScore < 0 || redScore > 10 || blueScore < 0 || blueScore > 10) {
      setMessage("Scores must be between 0 and 10");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/bouts/${boutId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round_number: currentRound,
          red_score: redScore,
          blue_score: blueScore,
        }),
      });

      if (response.ok) {
        setScores({ ...scores, [currentRound]: { red: redScore, blue: blueScore } });
        setMessage("Score saved");
        if (onScoreUpdate) onScoreUpdate();
      } else {
        const data = await response.json();
        setMessage(data.error || "Failed to save score");
      }
    } catch (error) {
      setMessage("Failed to save score");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  const totalRed = Object.values(scores).reduce((sum, s) => sum + s.red, 0);
  const totalBlue = Object.values(scores).reduce((sum, s) => sum + s.blue, 0);

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Live Scoring</h3>
        {isLive && (
          <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
            LIVE
          </span>
        )}
      </div>

      {/* Bout controls */}
      <div className="flex gap-2">
        {!isLive ? (
          <button
            onClick={startBout}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Start Bout
          </button>
        ) : (
          <>
            <button
              onClick={endBout}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              End Bout
            </button>
            {currentRound < totalRounds && (
              <button
                onClick={nextRound}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Next Round
              </button>
            )}
          </>
        )}
      </div>

      {/* Round info */}
      {isLive && (
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <span className="text-sm font-medium text-slate-700">Round {currentRound} of {totalRounds}</span>
            <span className="text-xs text-slate-500 ml-2">
              {formatTime(roundTime)}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-700">
            Total: {totalRed} - {totalBlue}
          </div>
        </div>
      )}

      {/* Score inputs */}
      {isLive && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-red-700">RED CORNER - {redName}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRedScore(Math.max(0, redScore - 1))}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="10"
                value={redScore}
                onChange={(e) => setRedScore(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                className="w-16 text-center text-lg font-bold border-2 border-red-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setRedScore(Math.min(10, redScore + 1))}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-blue-700">BLUE CORNER - {blueName}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBlueScore(Math.max(0, blueScore - 1))}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="10"
                value={blueScore}
                onChange={(e) => setBlueScore(Math.max(0, Math.min(10, parseInt(e.target.value) || 0)))}
                className="w-16 text-center text-lg font-bold border-2 border-blue-300 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setBlueScore(Math.min(10, blueScore + 1))}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      {isLive && (
        <button
          onClick={saveScore}
          disabled={saving}
          className="w-full px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Round Score"}
        </button>
      )}

      {/* Round scores summary */}
      {Object.keys(scores).length > 0 && (
        <div className="space-y-2 pt-4 border-t border-slate-200">
          <h4 className="text-sm font-medium text-slate-700">Round Scores</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="font-medium text-red-700">Red</div>
            <div className="font-medium text-blue-700">Blue</div>
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => (
              <>
                <div key={`red-${round}`}>
                  Round {round}: {scores[round]?.red ?? "-"}
                </div>
                <div key={`blue-${round}`}>
                  Round {round}: {scores[round]?.blue ?? "-"}
                </div>
              </>
            ))}
            <div className="font-bold text-red-700 pt-2 border-t">Total: {totalRed}</div>
            <div className="font-bold text-blue-700 pt-2 border-t">Total: {totalBlue}</div>
          </div>
        </div>
      )}

      {message && (
        <div className={`text-sm p-2 rounded-lg ${
          message.includes("saved") || message.includes("started") || message.includes("ended")
            ? "bg-green-50 text-green-700"
            : "bg-red-50 text-red-700"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}


