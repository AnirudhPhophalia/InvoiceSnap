import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ message: "Not Found" });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof Error) {
    res.status(500).json({ message: err.message });
    return;
  }

  res.status(500).json({ message: "Internal server error" });
}
