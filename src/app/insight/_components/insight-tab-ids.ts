export type TabId =
  | "accuracy"
  | "rankHistory"
  | "beerPool"
  | "mostFollowed"
  | "starEfficiency";

export const TABS: { id: TabId; label: string }[] = [
  { id: "accuracy", label: "Best Predictors" },
  { id: "rankHistory", label: "Rank History" },
  { id: "beerPool", label: "Beer Pool" },
  { id: "mostFollowed", label: "Most Followed" },
  { id: "starEfficiency", label: "Star Efficiency" },
];

export const TAB_IDS = TABS.map((tab) => tab.id);
