import { z } from "zod";

/** FR-3.2. admin only, own hospital — docs/08-permission-matrix.md "Departments". */
export const CreateDepartmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export type CreateDepartmentRequest = z.infer<typeof CreateDepartmentRequest>;

export const CreateDepartmentResponse = z.object({
  departmentId: z.string(),
});
export type CreateDepartmentResponse = z.infer<typeof CreateDepartmentResponse>;

export const UpdateDepartmentRequest = z
  .object({
    hospitalId: z.string().min(1),
    departmentId: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export type UpdateDepartmentRequest = z.infer<typeof UpdateDepartmentRequest>;

export const SetDepartmentStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    departmentId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetDepartmentStatusRequest = z.infer<typeof SetDepartmentStatusRequest>;
