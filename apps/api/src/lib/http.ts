import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError, type ZodSchema } from "zod";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function parseInput<T>(schema: ZodSchema<T>, value: unknown): T {
  return schema.parse(value);
}

export function routeParam(value: unknown, name: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, `${name} is required`);
  }
  return value;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const bodyError = error as { status?: unknown; type?: unknown };
  if (bodyError.type === "entity.parse.failed" && bodyError.status === 400) {
    return res.status(400).json({ error: "Request body must be valid JSON" });
  }
  if (bodyError.type === "entity.too.large" && bodyError.status === 413) {
    return res.status(413).json({ error: "Request body is too large" });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message
      }))
    });
  }

  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return res.status(409).json({ error: "A matching record already exists" });
    if (error.code === "P2025") return res.status(404).json({ error: "Record not found" });
    if (error.code === "P2003") return res.status(409).json({ error: "This record is still linked to another item" });
    if (error.code === "P2034") return res.status(409).json({ error: "The request conflicted with another update. Try again." });
    // The transaction never got a slot within Prisma's queue timeout. Nothing
    // is broken and nothing was written, so this is back-pressure rather than
    // a server fault: say so with 503 and Retry-After instead of a 500, which
    // would tell the client to give up on a request that is safe to repeat.
    if (error.code === "P2028") {
      res.setHeader("Retry-After", "1");
      return res.status(503).json({ error: "The server is busy. Try again in a moment." });
    }
  }

  console.error(error);
  return res.status(500).json({ error: "Unexpected server error" });
}
