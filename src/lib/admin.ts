export const ADMIN_COOKIE = "admin-auth";

export function isAdminAuthenticated(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((c) => c.trim() === `${ADMIN_COOKIE}=1`);
}
