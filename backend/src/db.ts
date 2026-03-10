import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.js";
import type { Database } from "./types.js";

const initialDb: Database = {
  users: [],
  invoices: [],
};

let writeQueue: Promise<void> = Promise.resolve();

async function ensureDbFile(): Promise<void> {
  const dir = path.dirname(config.dataFile);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(config.dataFile);
  } catch {
    await fs.writeFile(config.dataFile, JSON.stringify(initialDb, null, 2), "utf8");
  }
}

export async function readDb(): Promise<Database> {
  await ensureDbFile();
  const raw = await fs.readFile(config.dataFile, "utf8");

  try {
    const parsed = JSON.parse(raw) as Database;
    return {
      users: parsed.users || [],
      invoices: parsed.invoices || [],
    };
  } catch {
    return initialDb;
  }
}

export async function writeDb(nextDb: Database): Promise<void> {
  await ensureDbFile();

  writeQueue = writeQueue.then(async () => {
    await fs.writeFile(config.dataFile, JSON.stringify(nextDb, null, 2), "utf8");
  });

  await writeQueue;
}
