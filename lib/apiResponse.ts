import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiOk<T> = {
  ok: true;
  data: T;
};

export type ApiFail = {
  ok: false;
  error: ApiError;
};

export type ApiResponse<T> = ApiOk<T> | ApiFail;

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data } satisfies ApiOk<T>, init);
}

export function fail(code: ApiErrorCode, message: string, status = 500, details?: unknown) {
  // Avoid accidentally returning full Error objects (which can include stack traces)
  const safeDetails =
    details instanceof Error
      ? { name: details.name, message: details.message }
      : details;

  return NextResponse.json(
    { ok: false, error: { code, message, ...(safeDetails !== undefined ? { details: safeDetails } : {}) } } satisfies ApiFail,
    { status }
  );
}

export function badRequest(message: string, details?: unknown) {
  return fail("BAD_REQUEST", message, 400, details);
}

export function unauthorized(message = "Unauthorized", details?: unknown) {
  return fail("UNAUTHORIZED", message, 401, details);
}

export function internalError(message = "Internal error", details?: unknown) {
  return fail("INTERNAL_ERROR", message, 500, details);
}