import { z } from "zod";

/** FR-3.5. admin only, own hospital, per branch. */
export const CreateWardRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    building: z.string().min(1),
    floor: z.string().min(1),
    name: z.string().min(1),
  })
  .strict();
export type CreateWardRequest = z.infer<typeof CreateWardRequest>;

export const CreateWardResponse = z.object({ wardId: z.string() });
export type CreateWardResponse = z.infer<typeof CreateWardResponse>;

export const SetWardStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    wardId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetWardStatusRequest = z.infer<typeof SetWardStatusRequest>;

export const CreateRoomRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    wardId: z.string().min(1),
    roomNumber: z.string().min(1),
  })
  .strict();
export type CreateRoomRequest = z.infer<typeof CreateRoomRequest>;

export const CreateRoomResponse = z.object({ roomId: z.string() });
export type CreateRoomResponse = z.infer<typeof CreateRoomResponse>;

export const SetRoomStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    roomId: z.string().min(1),
    status: z.enum(["active", "disabled"]),
  })
  .strict();
export type SetRoomStatusRequest = z.infer<typeof SetRoomStatusRequest>;

export const CreateBedRequest = z
  .object({
    hospitalId: z.string().min(1),
    branchId: z.string().min(1),
    roomId: z.string().min(1),
    bedNumber: z.string().min(1),
  })
  .strict();
export type CreateBedRequest = z.infer<typeof CreateBedRequest>;

export const CreateBedResponse = z.object({ bedId: z.string() });
export type CreateBedResponse = z.infer<typeof CreateBedResponse>;

export const BedStatus = z.enum(["available", "occupied", "reserved", "cleaning", "maintenance"]);

export const SetBedStatusRequest = z
  .object({
    hospitalId: z.string().min(1),
    bedId: z.string().min(1),
    status: BedStatus,
  })
  .strict();
export type SetBedStatusRequest = z.infer<typeof SetBedStatusRequest>;
