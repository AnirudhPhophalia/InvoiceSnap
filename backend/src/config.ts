import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

const root = process.cwd();

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",
  dataFile: path.resolve(root, process.env.DATA_FILE || "./data/db.json"),
};
