"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MatchStatus } from "../../../../generated/prisma";

import { StarIcon } from "~/app/_components/icons/star-icon";
import { DayPredictModal } from "~/app/_components/match/day-predict-modal";
import { MatchCard } from "~/app/_components/match/match-card";
import {
  formatMatchDate,
  MATCH_DISPLAY_TIMEZONE,
  starsAllocatedForStage,
  toVietnamDatetimeLocal,
} from "~/lib/match";
import { api, type RouterOutputs } from "~/trpc/react";

type Match = RouterOutputs["match"]["listMatches"][number];

type TabId = "upcoming" | "completed";

function groupByDate(matches: Match[], descending = false) {
  const grouped = matches.reduce(
    (acc, match) => {
      const key = toVietnamDatetimeLocal(match.kickoffAt).slice(0, 10);
      acc[key] ??= [];
      acc[key].push(match);
      return acc;
    },
    {} as Record<string, Match[]>,
  );

  return Object.keys(grouped)
    .sort(descending ? (a, b) => b.localeCompare(a) : undefined)
    .map((key) => ({ dateKey: key, matches: grouped[key]! }));
}

type StageGroup = {
  stage: string | null;
  dateGroups: ReturnType<typeof groupByDate>;
};

function groupByStageAndDate(matches: Match[], descending = false): StageGroup[] {
  const seenStages: (string | null)[] = [];
  for (const m of matches) {
    if (!seenStages.includes(m.stage)) seenStages.push(m.stage);
  }
  const orderedStages = descending ? [...seenStages].reverse() : seenStages;
  return orderedStages.map((stage) => ({
    stage,
    dateGroups: groupByDate(matches.filter((m) => m.stage === stage), descending),
  }));
}

function formatTabDate(dateKey: string): { weekday: string; date: string } {
  const date = new Date(`${dateKey}T12:00:00+07:00`);
  const weekday = date.toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: MATCH_DISPLAY_TIMEZONE,
  });
  const dayMonth = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: MATCH_DISPLAY_TIMEZONE,
  });
  return { weekday, date: dayMonth };
}

// Where a section must be (from viewport top) to be considered "active"
const SCROLL_SPY_THRESHOLD = 185;
// Where to land the section top after a tab click (header height + breathing room)
const SCROLL_TARGET_OFFSET = 185;

function MatchList({
  stageGroups,
  isSignedIn,
  emptyMessage,
}: {
  stageGroups: StageGroup[];
  isSignedIn: boolean;
  emptyMessage: string;
}) {
  const [modalDateKey, setModalDateKey] = useState<string | null>(null);
  const showStageHeadings = stageGroups.length > 1;
  const allDateGroups = stageGroups.flatMap((sg) => sg.dateGroups);

  const hasKnockoutStages = stageGroups.some(
    ({ stage }) => starsAllocatedForStage(stage) > 0,
  );
  const { data: starAllotments } = api.vote.getStarAllotments.useQuery(
    undefined,
    { enabled: isSignedIn && hasKnockoutStages },
  );

  if (allDateGroups.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-12 text-center">
        <p className="text-lg text-foreground/60">{emptyMessage}</p>
      </div>
    );
  }

  const modalGroup = modalDateKey
    ? allDateGroups.find((g) => g.dateKey === modalDateKey)
    : null;

  const singleStage = !showStageHeadings ? stageGroups[0] : undefined;
  const showSingleStageBudget =
    singleStage !== undefined &&
    isSignedIn &&
    starsAllocatedForStage(singleStage.stage) > 0 &&
    singleStage.dateGroups.some((dg) => dg.matches.some((m) => m.votingOpen));
  const singleStageAllotment = showSingleStageBudget
    ? starAllotments?.find((a) => a.stage === singleStage!.stage)
    : undefined;

  return (
    <>
      {showSingleStageBudget && (
        <div className="mb-2 flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
          <StarIcon filled={false} />
          <span>
            {!starAllotments
              ? "…"
              : `${singleStageAllotment?.remaining ?? 0} of ${singleStageAllotment?.allocated ?? 0} stars remaining this round`}
          </span>
        </div>
      )}
      <div className={showStageHeadings ? "space-y-12" : "space-y-8"}>
        {stageGroups.map(({ stage, dateGroups }) => {
          const stageAllotment = starAllotments?.find((a) => a.stage === stage);
          const hasVotableInStage = dateGroups.some((dg) =>
            dg.matches.some((m) => m.votingOpen),
          );
          const showStarBudget =
            isSignedIn &&
            starsAllocatedForStage(stage) > 0 &&
            hasVotableInStage;

          return (
          <div key={stage ?? "__null__"}>
            {showStageHeadings && (
              <div className="mb-8 flex items-center gap-3">
                <div className="h-px flex-1 bg-foreground/10" />
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-foreground/40">
                    {stage ?? "Other"}
                  </span>
                  {showStarBudget && (
                    <span className="flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400">
                      <StarIcon filled={false} />
                      {starAllotments
                        ? `${stageAllotment?.remaining ?? 0}/${stageAllotment?.allocated ?? 0}`
                        : "…"}
                    </span>
                  )}
                </div>
                <div className="h-px flex-1 bg-foreground/10" />
              </div>
            )}
            <div className="space-y-8">
              {dateGroups.map(({ dateKey, matches: dayMatches }) => {
                const hasVotable = dayMatches.some((m) => m.votingOpen);
                const hasAnyVote = dayMatches.some(
                  (m) => m.votingOpen && m.userVoteOutcome != null,
                );
                const isVotingClosed =
                  !hasVotable &&
                  dayMatches.some((m) => m.status !== MatchStatus.COMPLETED);

                return (
                  <section key={dateKey} id={`date-section-${dateKey}`}>
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-emerald-400">
                        {formatMatchDate(dayMatches[0]!.kickoffAt)}
                      </h2>
                      {isSignedIn && hasVotable && (
                        <button
                          type="button"
                          onClick={() => setModalDateKey(dateKey)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                            hasAnyVote
                              ? "border border-emerald-500/50 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                              : "bg-emerald-600 text-white hover:bg-emerald-500"
                          }`}
                        >
                          {hasAnyVote ? "Edit predictions" : "Predict all"}
                        </button>
                      )}
                      {isSignedIn && isVotingClosed && (
                        <span className="text-sm text-foreground/30">
                          Voting closed
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {dayMatches.map((match) => (
                        <MatchCard
                          key={match.id}
                          match={match}
                          isSignedIn={isSignedIn}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>

      {modalGroup && (
        <DayPredictModal
          matches={modalGroup.matches}
          dateLabel={formatMatchDate(modalGroup.matches[0]!.kickoffAt)}
          onClose={() => setModalDateKey(null)}
        />
      )}
    </>
  );
}

function syncUrl(tab: TabId) {
  history.replaceState(null, "", tab !== "upcoming" ? `/?tab=${tab}` : "/");
}

export function MatchTabs({ isSignedIn }: { isSignedIn: boolean }) {
  const [activeTab, setActiveTab] = useState<TabId>("upcoming");
  const [activeDateKey, setActiveDateKey] = useState<string>("");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isProgrammaticScrollRef = useRef(false);
  const userClickedDateRef = useRef(false);
  const pillBarRef = useRef<HTMLDivElement | null>(null);
  const [pillOverflow, setPillOverflow] = useState({
    left: false,
    right: false,
  });

  const { data: allMatches = [] } = api.match.listMatches.useQuery({});

  const upcoming = useMemo(
    () =>
      allMatches.filter(
        (m) =>
          m.status === MatchStatus.SCHEDULED ||
          m.status === MatchStatus.LIVE ||
          m.status === MatchStatus.POSTPONED,
      ),
    [allMatches],
  );
  const completed = useMemo(
    () => allMatches.filter((m) => m.status === MatchStatus.COMPLETED),
    [allMatches],
  );

  const activeMatches = activeTab === "upcoming" ? upcoming : completed;
  const descending = activeTab === "completed";
  const groups = useMemo(() => groupByDate(activeMatches, descending), [activeMatches, descending]);
  const stageGroups = useMemo(
    () => groupByStageAndDate(activeMatches, descending),
    [activeMatches, descending],
  );

  // Reset active date when the tab or groups change
  useEffect(() => {
    setActiveDateKey(groups[0]?.dateKey ?? "");
  }, [activeTab, groups]);

  // Scroll-spy: update active date tab based on scroll position
  useEffect(() => {
    if (groups.length <= 1) return;

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;
      let next = groups[0]!.dateKey;
      for (const { dateKey } of groups) {
        const el = document.getElementById(`date-section-${dateKey}`);
        if (el && el.getBoundingClientRect().top <= SCROLL_SPY_THRESHOLD) {
          next = dateKey;
        }
      }
      setActiveDateKey(next);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [groups]);

  // Auto-center the active date tab in the tab bar, and scroll the match list
  // when the change was triggered by a user click (not the scroll-spy).
  useEffect(() => {
    tabRefs.current[activeDateKey]?.scrollIntoView({
      inline: "center",
      behavior: "smooth",
      block: "nearest",
    });

    if (!userClickedDateRef.current) return;
    userClickedDateRef.current = false;

    const el = document.getElementById(`date-section-${activeDateKey}`);
    if (!el) {
      isProgrammaticScrollRef.current = false;
      return;
    }

    const top =
      el.getBoundingClientRect().top + window.scrollY - SCROLL_TARGET_OFFSET;
    window.scrollTo({ top, behavior: "smooth" });

    const done = () => {
      isProgrammaticScrollRef.current = false;
    };
    window.addEventListener("scrollend", done, { once: true });
    setTimeout(done, 700);
  }, [activeDateKey]);

  // Track scroll position of the pill bar to show/hide edge fade masks.
  useEffect(() => {
    const el = pillBarRef.current;
    if (!el) return;
    const update = () => {
      setPillOverflow({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [groups]);

  const selectDate = (dateKey: string) => {
    userClickedDateRef.current = true;
    isProgrammaticScrollRef.current = true;
    setActiveDateKey(dateKey);
  };

  // Read tab from URL client-side after hydration to avoid SSR mismatch
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "completed") setActiveTab("completed");
  }, []);

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-foreground/10 bg-foreground/5 p-12 text-center">
        <p className="text-lg text-foreground/60">No matches found.</p>
        <p className="mt-2 text-sm text-foreground/40">
          Run <code className="text-emerald-400">npm run sync:fifa</code> to
          pull the World Cup schedule from FIFA, or add matches in the{" "}
          <a href="/admin" className="text-emerald-400 hover:underline">
            admin page
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Combined sticky header: tab switcher + date tabs */}
      <div className="sticky top-[56px] md:top-[73px] z-40 w-screen ml-[calc(50%_-_50vw)] border-b border-foreground/10 bg-white/90 pl-[calc(50vw_-_50%)] pr-[calc(50vw_-_50%)] pt-2 pb-2 backdrop-blur-sm dark:bg-black/90">
        <h1 className="mb-2 flex items-baseline gap-3 text-2xl font-bold">
          <button
            type="button"
            onClick={() => {
              syncUrl("upcoming");
              setActiveTab("upcoming");
            }}
            className={`transition ${activeTab === "upcoming" ? "" : "text-foreground/30 hover:text-foreground/50"}`}
          >
            Upcoming
          </button>
          <span className="text-foreground/20">|</span>
          <button
            type="button"
            onClick={() => {
              syncUrl("completed");
              setActiveTab("completed");
            }}
            className={`transition ${activeTab === "completed" ? "" : "text-foreground/30 hover:text-foreground/50"}`}
          >
            Completed
            {completed.length > 0 && (
              <span className="ml-2 text-base font-normal text-foreground/40">
                ({completed.length})
              </span>
            )}
          </button>
        </h1>

        {groups.length > 1 && (
          <div className="relative">
            {pillOverflow.left && (
              <div className="pointer-events-none absolute left-0 top-0 h-full w-10 bg-gradient-to-r from-white dark:from-black z-10" />
            )}
            {pillOverflow.right && (
              <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-white dark:from-black z-10" />
            )}
            <div
              ref={pillBarRef}
              className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {groups.map(({ dateKey }) => {
                const isActive = dateKey === activeDateKey;
                const { weekday, date } = formatTabDate(dateKey);
                return (
                  <button
                    key={dateKey}
                    ref={(el) => {
                      tabRefs.current[dateKey] = el;
                    }}
                    onClick={() => selectDate(dateKey)}
                    className={`shrink-0 rounded-lg px-5 py-1.5 text-center transition-colors ${
                      isActive
                        ? "bg-emerald-400 text-black"
                        : "bg-foreground/5 text-foreground/60 hover:bg-foreground/10"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wide">
                      {weekday}
                    </div>
                    <div className="text-sm font-semibold">{date}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-foreground/60">
        Predict World Cup outcomes — win or lose, you owe beer
      </p>

      <div>
        <MatchList
          stageGroups={stageGroups}
          emptyMessage={
            activeTab === "upcoming"
              ? "No upcoming matches found."
              : "No completed matches yet."
          }
          isSignedIn={isSignedIn}
        />
      </div>
    </div>
  );
}

