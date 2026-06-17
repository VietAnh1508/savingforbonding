"use client";

import { useState } from "react";

import { api, type RouterOutputs } from "~/trpc/react";
import { MatchCard } from "./match-card";
import { MatchForm } from "./match-form";

type Match = RouterOutputs["admin"]["listAll"][number];

export function MatchesPanel() {
  const { data: matches = [], isLoading } = api.admin.listAll.useQuery();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [formOpen, setFormOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">(
    "upcoming",
  );

  if (isLoading) {
    return <p className="text-white/50">Loading matches...</p>;
  }

  const filteredMatches = matches.filter((m) =>
    activeTab === "upcoming"
      ? m.status !== "COMPLETED"
      : m.status === "COMPLETED",
  );

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-white/10 bg-white/5">
        <button
          type="button"
          onClick={() => setFormOpen((o) => !o)}
          className="flex w-full items-center justify-between px-6 py-4 text-left"
        >
          <span className="text-lg font-semibold">
            {editingMatch ? "Edit Match" : "Add New Match"}
          </span>
          <span className="text-white/40">{formOpen ? "▲" : "▼"}</span>
        </button>
        {formOpen && (
          <div className="border-t border-white/10 px-6 pb-6 pt-4">
            <MatchForm
              key={editingMatch?.id ?? "new"}
              editingMatch={editingMatch}
              onSuccess={() => { setEditingMatch(null); setFormOpen(false); }}
              onCancel={() => { setEditingMatch(null); setFormOpen(false); }}
            />
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Matches</h2>
          <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
            {(["upcoming", "completed"] as const).map((tab) => {
              const count =
                tab === "upcoming"
                  ? matches.filter((m) => m.status !== "COMPLETED").length
                  : matches.filter((m) => m.status === "COMPLETED").length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-md px-3 py-1 capitalize transition ${
                    activeTab === tab
                      ? "bg-white/15 font-medium text-white"
                      : "text-white/50 hover:text-white/80"
                  }`}
                >
                  {tab}{" "}
                  <span className="text-xs text-white/40">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {filteredMatches.length === 0 ? (
            <p className="text-white/50">No {activeTab} matches.</p>
          ) : (
            filteredMatches.map((match) => (
              <MatchCard key={match.id} match={match} onEdit={(m) => { setEditingMatch(m); setFormOpen(true); }} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
