import { z } from "zod";
import {
  CreateWardRequest,
  CreateWardResponse,
  UpdateWardRequest,
  SetWardStatusRequest,
  CreateRoomRequest,
  CreateRoomResponse,
  UpdateRoomRequest,
  SetRoomStatusRequest,
  CreateBedRequest,
  CreateBedResponse,
  SetBedStatusRequest,
} from "@hms/shared";
import { createCallable } from "@/lib/firebase/callable";

const SuccessResponse = z.object({ success: z.boolean() });

export const createWard = createCallable("createWard", CreateWardRequest, CreateWardResponse);
export const updateWard = createCallable("updateWard", UpdateWardRequest, SuccessResponse);
export const setWardStatus = createCallable("setWardStatus", SetWardStatusRequest, SuccessResponse);

export const createRoom = createCallable("createRoom", CreateRoomRequest, CreateRoomResponse);
export const updateRoom = createCallable("updateRoom", UpdateRoomRequest, SuccessResponse);
export const setRoomStatus = createCallable("setRoomStatus", SetRoomStatusRequest, SuccessResponse);

export const createBed = createCallable("createBed", CreateBedRequest, CreateBedResponse);
export const setBedStatus = createCallable("setBedStatus", SetBedStatusRequest, SuccessResponse);
