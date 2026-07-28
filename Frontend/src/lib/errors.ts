export const appErrorCodes = [
  "VALIDATION_ERROR",
  "AUTHENTICATION_REQUIRED",
  "PERMISSION_DENIED",
  "RESOURCE_NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "DATABASE_UNAVAILABLE",
  "UNEXPECTED_ERROR",
] as const;

export type AppErrorCode = (typeof appErrorCodes)[number];

export class SafeAppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = "SafeAppError";
    this.code = code;
  }
}

const messages: Record<AppErrorCode, string> = {
  VALIDATION_ERROR: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบแล้วลองใหม่",
  AUTHENTICATION_REQUIRED: "กรุณาเข้าสู่ระบบอีกครั้ง",
  PERMISSION_DENIED: "คุณไม่มีสิทธิ์ทำรายการนี้",
  RESOURCE_NOT_FOUND: "ไม่พบข้อมูลที่ต้องการ",
  CONFLICT: "ข้อมูลถูกเปลี่ยนแปลงหรือมีอยู่แล้ว กรุณารีเฟรชแล้วลองใหม่",
  RATE_LIMITED: "ทำรายการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่",
  DATABASE_UNAVAILABLE: "ระบบข้อมูลไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง",
  UNEXPECTED_ERROR: "เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง",
};

export function safeError(code: AppErrorCode, message = messages[code]) {
  return new SafeAppError(code, message);
}

export function toSafeError(error: unknown, fallbackCode: AppErrorCode = "UNEXPECTED_ERROR") {
  if (error instanceof SafeAppError) return error;
  if (error instanceof Error && error.name === "ZodError") return safeError("VALIDATION_ERROR");
  return safeError(fallbackCode);
}

/** Server-only diagnostic metadata. Raw messages are intentionally excluded. */
export function logInternalError(operation: string, error: unknown) {
  const metadata = error && typeof error === "object"
    ? {
        operation,
        name: "name" in error && typeof error.name === "string" ? error.name : "UnknownError",
        code: "code" in error && typeof error.code === "string" ? error.code : undefined,
        status: "status" in error && typeof error.status === "number" ? error.status : undefined,
      }
    : { operation, name: "UnknownError" };
  console.error("DEV-LIFE internal error", metadata);
}
