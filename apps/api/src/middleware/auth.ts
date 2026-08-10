import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { HttpError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";

export type AuthRequest = Request & {
  user: {
    id: string;
    email: string;
    name: string;
    sessionId: string;
  };
};

export type SessionTokenPayload = {
  sub: string;
  sid: string;
  email: string;
  name: string;
};

export const sessionCookieName = "planora_session";

export function assertSecureAuthConfiguration() {
  getJwtSecret();
}

export function getSessionExpiry(rememberMe = false) {
  return new Date(Date.now() + (rememberMe ? 30 * 86_400_000 : 12 * 60 * 60_000));
}

export function signToken(
  user: { id: string; email: string; name: string },
  sessionId: string,
  rememberMe = false
) {
  const expiresIn = (rememberMe ? "30d" : process.env.JWT_EXPIRES_IN ?? "12h") as SignOptions["expiresIn"];
  return jwt.sign({ sub: user.id, sid: sessionId, email: user.email, name: user.name }, getJwtSecret(), {
    algorithm: "HS256",
    audience: "planora-clients",
    issuer: "planora-api",
    expiresIn
  });
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const credentials = readSessionCredentials(req);
  const token = credentials.token;

  if (!token) return next(new HttpError(401, "Authentication required"));
  if (!credentials.isBearer && isUnsafeMethod(req.method) && !isTrustedOrigin(req.headers.origin)) {
    return next(new HttpError(403, "Request origin is not allowed"));
  }

  try {
    const payload = jwt.verify(token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: "planora-clients",
      issuer: "planora-api"
    }) as SessionTokenPayload;
    const session = await prisma.authSession.findFirst({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: {
        user: { select: { id: true, email: true, name: true } }
      }
    });
    if (!session) throw new HttpError(401, "Session is no longer active");
    (req as AuthRequest).user = { ...session.user, sessionId: session.id };
    if (Date.now() - session.lastUsedAt.getTime() > 15 * 60_000) {
      await prisma.authSession.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } });
    }
    return next();
  } catch (error) {
    if (error instanceof HttpError) return next(error);
    return next(new HttpError(401, "Invalid or expired session"));
  }
}

export function readLogoutSession(req: Request): SessionTokenPayload | null {
  const credentials = readSessionCredentials(req);
  if (!credentials.token) return null;
  if (!credentials.isBearer && isUnsafeMethod(req.method) && !isTrustedOrigin(req.headers.origin)) {
    throw new HttpError(403, "Request origin is not allowed");
  }

  try {
    const payload = jwt.verify(credentials.token, getJwtSecret(), {
      algorithms: ["HS256"],
      audience: "planora-clients",
      issuer: "planora-api",
      ignoreExpiration: true
    }) as SessionTokenPayload;
    return typeof payload.sub === "string" && typeof payload.sid === "string" ? payload : null;
  } catch {
    return null;
  }
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  const invalidProductionSecret =
    !secret ||
    secret.length < 32 ||
    secret.startsWith("change-this-in-production") ||
    secret === "planora-local-dev-secret";
  if (invalidProductionSecret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be a non-placeholder value of at least 32 characters in production");
    }
    return "planora-local-dev-secret";
  }
  return secret;
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return undefined;
}

function readSessionCredentials(req: Request) {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  return {
    token: bearerToken ?? readCookie(req.headers.cookie, sessionCookieName),
    isBearer: Boolean(bearerToken)
  };
}

function isUnsafeMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

function isTrustedOrigin(origin: string | undefined) {
  if (!origin) return false;
  const configured = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes(origin);
}
