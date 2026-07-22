export const EXPIRY_WARNING_DAYS = 30;

export type ExpiryStatus = "expired" | "nearExpiry" | "ok";

export function getExpiryStatus(expiryDate: string): ExpiryStatus {
  const daysUntilExpiry = (new Date(expiryDate).getTime() - Date.now()) / 86_400_000;
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) return "nearExpiry";
  return "ok";
}
