import { MongoClient } from "mongodb";
import { config } from "./config.js";
import type { InvoiceRecord, UserRecord } from "./types.js";

let client: MongoClient | null = null;

function getClient(): MongoClient {
  if (!client) {
    client = new MongoClient(config.mongoUri);
  }
  return client;
}

export async function connectDb(): Promise<void> {
  const mongoClient = getClient();
  await mongoClient.connect();

  const db = mongoClient.db(config.mongoDbName);
  await Promise.all([
    db.collection<UserRecord>("users").createIndex({ email: 1 }, { unique: true }),
    db.collection<InvoiceRecord>("invoices").createIndex({ userId: 1, uploadedAt: -1 }),
  ]);
}

export function usersCollection() {
  return getClient().db(config.mongoDbName).collection<UserRecord>("users");
}

export function invoicesCollection() {
  return getClient().db(config.mongoDbName).collection<InvoiceRecord>("invoices");
}
