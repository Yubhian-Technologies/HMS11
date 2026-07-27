import type { Role } from "@hms/shared";

/**
 * Split out from require-role.ts (which is server-only: cookies() +
 * firebase-admin) because client components like LoginForm need this pure
 * mapping without pulling server-only code into the client bundle.
 */
export function roleHome(role: Role): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "admin":
      return "/admin";
    case "office":
      return "/office";
    case "reception":
      return "/reception";
    case "doctor":
      return "/doctor";
    case "pharmacy":
      return "/pharmacy";
    case "lab":
      return "/lab";
    case "patient":
      return "/patient";
    case "nurse":
      return "/nurse";
    default: {
      const exhaustive: never = role;
      return exhaustive;
    }
  }
}
