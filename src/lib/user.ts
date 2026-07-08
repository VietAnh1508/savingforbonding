export const NAME_CHANGE_COOLDOWN_HOURS = 24;

/** Returns when the next name change becomes allowed, or null if allowed now. */
export function nameChangeAvailableAt(
  nameUpdatedAt: Date | null | undefined,
): Date | null {
  if (!nameUpdatedAt) return null;

  const availableAt = new Date(
    nameUpdatedAt.getTime() + NAME_CHANGE_COOLDOWN_HOURS * 60 * 60 * 1000,
  );
  return availableAt > new Date() ? availableAt : null;
}
