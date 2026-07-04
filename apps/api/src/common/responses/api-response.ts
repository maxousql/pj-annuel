import type { ApiResponse } from "@content-ai/shared";
import { ok } from "@content-ai/shared";

export function successResponse<TData>(
  data: TData,
  meta?: Record<string, unknown>,
): ApiResponse<TData> {
  return ok(data, meta);
}
