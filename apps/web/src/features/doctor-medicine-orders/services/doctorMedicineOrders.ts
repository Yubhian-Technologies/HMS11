import { AssignMedicineOrderRequest, AssignMedicineOrderResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const assignMedicineOrder = createCallable(
  "assignMedicineOrder",
  AssignMedicineOrderRequest,
  AssignMedicineOrderResponse,
);
