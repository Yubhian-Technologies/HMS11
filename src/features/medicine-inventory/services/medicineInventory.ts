import { z } from "zod";
import {
  CreateMedicineInventoryItemRequest,
  CreateMedicineInventoryItemResponse,
  UpdateMedicineInventoryItemRequest,
  SetMedicineInventoryItemStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createMedicineInventoryItem = createCallable(
  "createMedicineInventoryItem",
  CreateMedicineInventoryItemRequest,
  CreateMedicineInventoryItemResponse,
);
export const updateMedicineInventoryItem = createCallable(
  "updateMedicineInventoryItem",
  UpdateMedicineInventoryItemRequest,
  SuccessResponse,
);
export const setMedicineInventoryItemStatus = createCallable(
  "setMedicineInventoryItemStatus",
  SetMedicineInventoryItemStatusRequest,
  SuccessResponse,
);
