import { httpsCallable } from "firebase/functions";
import type { z, ZodType } from "zod";
import { functions } from "./client";

/**
 * Every httpsCallable in this app is wrapped through here so the request is
 * validated client-side before it leaves the browser and the response is
 * validated before feature code touches it — callers never see raw
 * `unknown` data from the wire.
 */
export function createCallable<ReqSchema extends ZodType, ResSchema extends ZodType>(
  name: string,
  requestSchema: ReqSchema,
  responseSchema: ResSchema,
) {
  const callable = httpsCallable(functions, name);

  return async (input: z.input<ReqSchema>): Promise<z.output<ResSchema>> => {
    const payload = requestSchema.parse(input);
    const result = await callable(payload);
    return responseSchema.parse(result.data);
  };
}
