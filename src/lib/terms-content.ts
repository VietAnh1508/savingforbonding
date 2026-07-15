export interface TermsRule {
  heading: string;
  body: string;
  bullets?: string[];
}

export const termsTitle = "Terms & Conditions (T&C) 🍻";

export const termsIntro =
  "By continuing with the game, you confirm that you've read, understood, and agreed to the following terms:";

export const termsRules: TermsRule[] = [
  {
    heading: "The first, and most important, rule",
    body: "Match outcomes are decided by the official result — the Organizers are always right. If the Organizers are wrong, please re-read rule 1. 😎",
  },
  {
    heading: "No requests to fix data after it's locked in",
    body: "Predictions and star picks lock 5 minutes before kickoff, and challenge stakes are final once sent — no take-backs after that.",
    bullets: [
      '"I clicked the wrong thing"',
      '"My connection lagged"',
      '"Just let me fix it one last time"',
    ],
  },
  {
    heading: "This is savings, not gambling",
    body: "Every beer debt goes straight into the team bonding fund — nobody's pocketing cash here. So no need to report us to the police or any authorities; we're just saving up for the next hangout, not running a casino.",
  },
  {
    heading: "You're responsible for your own decisions",
    body: 'Every prediction costs at least one beer, win or lose. Guess wrong and you owe more; skip voting on a finished match and you still owe for ghosting. Pick wrong, learn for next season — the Organizers do not offer "refunds of faith."',
  },
  {
    heading: "Beer duty is mandatory 🍺",
    body: 'Losers, wrong predictors, challenge losers, or anyone who boldly promised "I\'ll buy beer if I\'m wrong" must fulfill their duty within a reasonable time. Forgetting, avoiding, or sudden memory loss will not be accepted.',
  },
];

export const termsClosing =
  "By joining, you confirm you agree to the terms above and are ready to fulfill your beer duty if luck isn't on your side. 🍻";
