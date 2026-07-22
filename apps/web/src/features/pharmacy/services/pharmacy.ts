import { DispenseMedicineRequest, DispenseMedicineResponse } from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

export const dispenseMedicine = createCallable(
  "dispenseMedicine",
  DispenseMedicineRequest,
  DispenseMedicineResponse,
);
