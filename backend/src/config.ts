import dotenv from "dotenv";

dotenv.config();

const authCookieSameSite: "lax" | "strict" | "none" =
  process.env.AUTH_COOKIE_SAME_SITE === "strict" || process.env.AUTH_COOKIE_SAME_SITE === "none"
    ? process.env.AUTH_COOKIE_SAME_SITE
    : "lax";

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDbName: process.env.MONGODB_DB_NAME || "invoicesnap",
  authCookieName: process.env.AUTH_COOKIE_NAME || "invoicesnap_auth",
  isProduction: process.env.NODE_ENV === "production",
  authCookieSameSite,
};
