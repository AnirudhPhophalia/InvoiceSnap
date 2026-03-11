import jwt from "jsonwebtoken";
import type { AuthResponseUser, UserRecord } from "./types.js";
import { config } from "./config.js";

export interface AuthTokenPayload {
  sub: string;
  email: string;
}

export function signToken(user: UserRecord): string {
  return jwt.sign({ sub: user.id, email: user.email }, config.jwtSecret, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, config.jwtSecret) as AuthTokenPayload;
}

export function publicUser(user: UserRecord): AuthResponseUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    createdAt: user.createdAt,
  };
}
