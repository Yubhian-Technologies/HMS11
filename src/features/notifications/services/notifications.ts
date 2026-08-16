import { z } from "zod";
import { MarkNotificationReadRequest } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const markNotificationRead = createCallable(
  "markNotificationRead",
  MarkNotificationReadRequest,
  SuccessResponse,
);
