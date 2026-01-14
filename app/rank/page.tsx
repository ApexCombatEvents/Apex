// app/rank/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type Ranking = {
  id: string;
  org: string;
  discipline: string;
  weight_class: string;
  rank: number;
  fighter_name: string;
  profile_id: string | null;
  as_of: string;
};

type Organization = {
  name: string;
  discipline: string;
  weight_classes: string[];
};

const ORGANIZATIONS: Organization[] = [
  // Boxing - Major Sanctioning Bodies
  {
    name: "WBC",
    discipline: "Boxing",
    weight_classes: [
      "Heavyweight",
      "Cruiserweight",
      "Light Heavyweight",
      "Super Middleweight",
      "Middleweight",
      "Super Welterweight",
      "Welterweight",
      "Super Lightweight",
      "Lightweight",
      "Super Featherweight",
      "Featherweight",
      "Super Bantamweight",
      "Bantamweight",
      "Super Flyweight",
      "Flyweight",
      "Light Flyweight",
      "Minimumweight",
    ],
  },
  {
    name: "WBA",
    discipline: "Boxing",
    weight_classes: [
      "Heavyweight",
      "Cruiserweight",
      "Light Heavyweight",
      "Super Middleweight",
      "Middleweight",
      "Super Welterweight",
      "Welterweight",
      "Super Lightweight",
      "Lightweight",
      "Super Featherweight",
      "Featherweight",
      "Super Bantamweight",
      "Bantamweight",
      "Super Flyweight",
      "Flyweight",
      "Light Flyweight",
      "Minimumweight",
    ],
  },
  {
    name: "IBF",
    discipline: "Boxing",
    weight_classes: [
      "Heavyweight",
      "Cruiserweight",
      "Light Heavyweight",
      "Super Middleweight",
      "Middleweight",
      "Super Welterweight",
      "Welterweight",
      "Super Lightweight",
      "Lightweight",
      "Super Featherweight",
      "Featherweight",
      "Super Bantamweight",
      "Bantamweight",
      "Super Flyweight",
      "Flyweight",
      "Light Flyweight",
      "Minimumweight",
    ],
  },
  {
    name: "WBO",
    discipline: "Boxing",
    weight_classes: [
      "Heavyweight",
      "Cruiserweight",
      "Light Heavyweight",
      "Super Middleweight",
      "Middleweight",
      "Super Welterweight",
      "Welterweight",
      "Super Lightweight",
      "Lightweight",
      "Super Featherweight",
      "Featherweight",
      "Super Bantamweight",
      "Bantamweight",
      "Super Flyweight",
      "Flyweight",
      "Light Flyweight",
      "Minimumweight",
    ],
  },
  // Muay Thai
  {
    name: "WBC Muay Thai",
    discipline: "Muay Thai",
    weight_classes: [
      "52kg",
      "54kg",
      "57kg",
      "61.2kg",
      "63.5kg",
      "67kg",
      "70kg",
      "72.5kg",
      "76.2kg",
      "79.4kg",
      "86.2kg",
      "95kg",
    ],
  },
  {
    name: "ONE Championship",
    discipline: "Muay Thai",
    weight_classes: [
      "Strawweight (52.2kg)",
      "Flyweight (61.2kg)",
      "Bantamweight (65.8kg)",
      "Featherweight (70.3kg)",
      "Lightweight (77.1kg)",
      "Welterweight (83.9kg)",
    ],
  },
  // Kickboxing
  {
    name: "GLORY",
    discipline: "Kickboxing",
    weight_classes: [
      "Heavyweight (95kg+)",
      "Light Heavyweight (95kg)",
      "Middleweight (85kg)",
      "Welterweight (77kg)",
      "Lightweight (70kg)",
      "Featherweight (65kg)",
      "Bantamweight (61.2kg)",
    ],
  },
  {
    name: "ONE Championship",
    discipline: "Kickboxing",
    weight_classes: [
      "Strawweight (52.2kg)",
      "Flyweight (61.2kg)",
      "Bantamweight (65.8kg)",
      "Featherweight (70.3kg)",
      "Lightweight (77.1kg)",
      "Welterweight (83.9kg)",
    ],
  },
  // MMA
  {
    name: "UFC",
    discipline: "MMA",
    weight_classes: [
      "Heavyweight (265lbs)",
      "Light Heavyweight (205lbs)",
      "Middleweight (185lbs)",
      "Welterweight (170lbs)",
      "Lightweight (155lbs)",
      "Featherweight (145lbs)",
      "Bantamweight (135lbs)",
      "Flyweight (125lbs)",
      "Women's Featherweight (145lbs)",
      "Women's Bantamweight (135lbs)",
      "Women's Flyweight (125lbs)",
      "Women's Strawweight (115lbs)",
    ],
  },
  {
    name: "ONE Championship",
    discipline: "MMA",
    weight_classes: [
      "Heavyweight (102.1kg+)",
      "Light Heavyweight (102.1kg)",
      "Middleweight (93kg)",
      "Welterweight (83.9kg)",
      "Lightweight (77.1kg)",
      "Featherweight (70.3kg)",
      "Bantamweight (65.8kg)",
      "Flyweight (61.2kg)",
      "Strawweight (56.7kg)",
      "Atomweight (52.2kg)",
    ],
  },
  // Bareknuckle
  {
    name: "BKFC",
    discipline: "Bareknuckle",
    weight_classes: [
      "Heavyweight (265lbs)",
      "Light Heavyweight (205lbs)",
      "Middleweight (185lbs)",
      "Welterweight (175lbs)",
      "Lightweight (165lbs)",
      "Featherweight (145lbs)",
      "Bantamweight (135lbs)",
      "Flyweight (125lbs)",
      "Women's Featherweight (145lbs)",
      "Women's Bantamweight (125lbs)",
    ],
  },
];

export default function RankPage() {
  const [selectedDiscipline, setSelectedDiscipline] = useState<string | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  const disciplines = Array.from(
    new Set(ORGANIZATIONS.map((org) => org.discipline))
  );

  const filteredOrgs = ORGANIZATIONS.filter(
    (org) => !selectedDiscipline || org.discipline === selectedDiscipline
  );

  useEffect(() => {
    async function loadRankings() {
      const supabase = createSupabaseBrowser();
      setLoading(true);

      let query = supabase.from("rankings").select("*");

      if (selectedDiscipline) {
        query = query.eq("discipline", selectedDiscipline);
      }

      if (selectedOrg) {
        query = query.eq("org", selectedOrg);
      }

      const { data, error } = await query.order("rank", { ascending: true });

      if (error) {
        console.error("Error loading rankings:", error);
      } else {
        setRankings(data || []);
      }

      setLoading(false);
    }

    loadRankings();
  }, [selectedDiscipline, selectedOrg]);

  // Group rankings by org, discipline, and weight_class
  const groupedRankings = rankings.reduce((acc, ranking) => {
    const key = `${ranking.org}|${ranking.discipline}|${ranking.weight_class}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(ranking);
    return acc;
  }, {} as Record<string, Ranking[]>);

  // Sort each group by rank
  Object.keys(groupedRankings).forEach((key) => {
    groupedRankings[key].sort((a, b) => a.rank - b.rank);
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <section className="card">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Rankings</h1>
        <p className="text-sm text-slate-600 mb-3">
          View official rankings by organization and weight class. Rankings are
          provided for informational purposes and are attributed to their
          respective organizations.
        </p>
        <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p className="font-semibold mb-1">Disclaimer:</p>
          <p>
            Rankings displayed are sourced from official organizations. Apex
            does not claim ownership of these rankings. All rankings are
            attributed to their respective sanctioning bodies. For official
            rankings, please visit the organization&apos;s official website.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="card">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Filter Rankings
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-600 mb-2 block">
              Discipline
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedDiscipline(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedDiscipline
                    ? "bg-purple-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                All
              </button>
              {disciplines.map((discipline) => (
                <button
                  key={discipline}
                  onClick={() => setSelectedDiscipline(discipline)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDiscipline === discipline
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {discipline}
                </button>
              ))}
            </div>
          </div>

          {selectedDiscipline && (
            <div>
              <label className="text-xs text-slate-600 mb-2 block">
                Organization
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedOrg(null)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    !selectedOrg
                      ? "bg-purple-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  All
                </button>
                {filteredOrgs.map((org) => (
                  <button
                    key={org.name}
                    onClick={() => setSelectedOrg(org.name)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedOrg === org.name
                        ? "bg-purple-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Rankings Display */}
      {loading ? (
        <div className="card">
          <p className="text-sm text-slate-600">Loading rankings...</p>
        </div>
      ) : Object.keys(groupedRankings).length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-600">
            No rankings available. Rankings will appear here once data has been
            imported.
          </p>
          <p className="text-xs text-slate-500 mt-2">
            To add rankings, you can import data from official sources or create
            Apex rankings through the admin panel.
          </p>
        </div>
      ) : (
        <section className="space-y-4">
          {Object.entries(groupedRankings).map(([key, rankingList]) => {
            const [org, discipline, weightClass] = key.split("|");
            const latestDate = rankingList[0]?.as_of
              ? new Date(rankingList[0].as_of).toLocaleDateString()
              : "N/A";

            return (
              <div key={key} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-semibold text-slate-900">
                        {discipline} – {weightClass}
                      </h2>
                      <span className="px-2 py-0.5 text-[10px] rounded-full bg-purple-50 text-purple-700 font-medium uppercase">
                        {org}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Updated: {latestDate}
                    </p>
                  </div>
                </div>

                <ol className="space-y-2">
                  {rankingList.map((ranking) => (
                    <li
                      key={ranking.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50"
                    >
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold text-sm flex-shrink-0">
                        {ranking.rank}
                      </span>
                      {ranking.profile_id ? (
                        <Link
                          href={`/profile/${ranking.profile_id}`}
                          className="flex-1 text-sm font-medium text-slate-900 hover:text-purple-700"
                        >
                          {ranking.fighter_name}
                        </Link>
                      ) : (
                        <span className="flex-1 text-sm font-medium text-slate-900">
                          {ranking.fighter_name}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </section>
      )}

      {/* Apex Rankings Notice */}
      <section className="card bg-purple-50 border-purple-200">
        <h2 className="font-semibold text-purple-900 mb-2">
          Apex Rankings (Coming Soon)
        </h2>
        <p className="text-sm text-purple-700">
          Apex will soon introduce its own ranking system based on fighter
          performance and match results within the platform. Stay tuned for
          updates.
        </p>
      </section>
    </div>
  );
}
