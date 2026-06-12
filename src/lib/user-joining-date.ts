/** Best available registration date for display on the leaderboard. */
export function resolveUserJoiningDate(input: {
  createdAt?: Date | null;
  earliestVoteAt?: Date | null;
}): Date {
  if (input.createdAt) {
    return input.createdAt;
  }

  if (input.earliestVoteAt) {
    return input.earliestVoteAt;
  }

  return new Date();
}
