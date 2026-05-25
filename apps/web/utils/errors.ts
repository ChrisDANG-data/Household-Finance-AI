export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: { code: string; statusCode?: number; details?: unknown } = {
      code: "INTERNAL_ERROR",
    },
  ) {
    super(message);
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toAppError(
  error: unknown,
  fallbackMessage = "An unexpected error occurred",
): AppError {
  if (isAppError(error)) return error;
  if (error instanceof Error) {
    return new AppError(error.message, { code: "INTERNAL_ERROR" });
  }
  return new AppError(fallbackMessage, { code: "INTERNAL_ERROR" });
}
