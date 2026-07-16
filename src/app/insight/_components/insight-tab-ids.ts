export type TabId = "accuracy" | "rankHistory" | "beerPool" | "mostFollowed";

export const TABS: { id: TabId; label: string }[] = [
  { id: "accuracy", label: "Best Predictors" },
  { id: "rankHistory", label: "Rank History" },
  { id: "beerPool", label: "Beer Pool" },
  { id: "mostFollowed", label: "Most Followed" },
];

export const TAB_IDS = TABS.map((tab) => tab.id);
