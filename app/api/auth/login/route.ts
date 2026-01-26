import { NextRequest } from "next/server";
import crypto from "crypto";
import { badRequest, internalError, ok, unauthorized } from "@/lib/apiResponse";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

const APP_PASSWORD = process.env.APP_PASSWORD || "password";
const MOBILE_PASSWORD = process.env.MOBILE_PASSWORD;

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// POST - Login with password
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
    const password = typeof body?.password === "string" ? body.password : "";

    if (!password) {
      return badRequest("Password required");
    }

    const isRemoteMode = process.env.OS_REMOTE_MODE === 'true';
    const correctPassword = isRemoteMode ? MOBILE_PASSWORD : APP_PASSWORD;

    if (!correctPassword) {
      return badRequest(isRemoteMode ? "Mobile password not configured" : "App password not configured");
    }

    if (password !== correctPassword) {
      return unauthorized("Invalid password");
    }

    // In remote mode, set httpOnly cookie
    if (isRemoteMode) {
      cookies().set('mobile-auth', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24, // 24 hours
        path: '/',
      });
      return ok({ success: true });
    }

    // Desktop mode - use device token approach
    const deviceToken = generateDeviceToken();
    const tokenHash = hashPassword(deviceToken + APP_PASSWORD);

    return ok({
      success: true,
      deviceToken,
      tokenHash
    });
  } catch (error) {
    console.error("Login error:", error instanceof Error ? error.message : error);
    return internalError("Login failed");
  }
}

// PUT - Validate existing session
export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { deviceToken?: unknown; tokenHash?: unknown }
      | null;

    const deviceToken = typeof body?.deviceToken === "string" ? body.deviceToken : "";
    const tokenHash = typeof body?.tokenHash === "string" ? body.tokenHash : "";

    if (!deviceToken || !tokenHash) {
      return ok({ valid: false });
    }

    const expectedHash = hashPassword(deviceToken + APP_PASSWORD);
    const valid = tokenHash === expectedHash;

    return ok({ valid });
  } catch (error) {
    console.error("Session validation error:", error instanceof Error ? error.message : error);
    return ok({ valid: false });
  }
}