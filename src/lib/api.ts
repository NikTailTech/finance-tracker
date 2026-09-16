import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status = 400, details?: unknown) {
  return NextResponse.json({ error, details }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError("Validation failed", 400, error.issues);
  }
  if (error instanceof Error) {
    if (error.message.includes("Unique constraint")) {
      return jsonError(error.message, 409);
    }
    console.error(error);
    return jsonError(error.message, 500);
  }
  console.error(error);
  return jsonError("Internal server error", 500);
}
