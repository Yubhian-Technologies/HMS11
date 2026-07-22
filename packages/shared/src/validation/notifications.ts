import { z } from "zod";

/** FR-16.2. Any authenticated user, own notification only. */
export const MarkNotificationReadRequest = z
  .object({
    notificationId: z.string().min(1),
  })
  .strict();
export type MarkNotificationReadRequest = z.infer<typeof MarkNotificationReadRequest>;
