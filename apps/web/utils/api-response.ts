import { NextResponse } from "next/server";

import type { ApiErrorResponse, ApiSuccessResponse } from "@/types/api";
import { AppError } from "@/utils/errors";

export function jsonSuccess<T>(
  data: T,
  init?: ResponseInit,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data }, init);
}

export function jsonError(
  error: AppError | { code: string; message: string; statusCode?: number },
): NextResponse<ApiErrorResponse> {
  const statusCode =
    error instanceof AppError ? error.statusCode : (error.statusCode ?? 500);
  const code = error instanceof AppError ? error.code : error.code;
  const message = error.message;

  return NextResponse.json(
    {
      success: false,
      error: { code, message },
    },
    { status: statusCode },
  );
}

export function notImplemented(layer: string): NextResponse<ApiErrorResponse> {
  return jsonError({
    code: "NOT_IMPLEMENTED",
    message: `${layer} layer is not implemented yet`,
    statusCode: 501,
  });
}
