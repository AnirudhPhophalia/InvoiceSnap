import { Router } from "express";
import multer from "multer";
import { v4 as uuid } from "uuid";
import { invoicesCollection } from "../db.js";
import { sourceDocumentsCollection } from "../db.js";
import { requireAuth } from "../middleware/auth-middleware.js";
import { suggestExpenseCategory } from "../utils/categorize.js";
import { applyLearnedCorrections } from "../utils/corrections.js";
import { extractInvoiceFromFile } from "../utils/extract.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const supportedMimeTypes = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

export const extractRouter = Router();

extractRouter.use(requireAuth);

async function processFile(userId: string, file: Express.Multer.File) {
  if (!supportedMimeTypes.has(file.mimetype)) {
    throw new Error("Unsupported invoice file format. Please upload PDF, PNG, JPG, JPEG, or WebP.");
  }

  const sourceDocumentId = uuid();
  await sourceDocumentsCollection().insertOne({
    id: sourceDocumentId,
    userId,
    fileName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    content: file.buffer,
    createdAt: new Date().toISOString(),
  });

  const extracted = await extractInvoiceFromFile(file.originalname, file.buffer, file.mimetype);
  const corrected = await applyLearnedCorrections(userId, extracted);
  const historicalInvoices = await invoicesCollection()
    .find({ userId })
    .sort({ uploadedAt: -1 })
    .limit(400)
    .toArray();

  corrected.category = suggestExpenseCategory(corrected, historicalInvoices);
  return { ...corrected, sourceDocumentId };
}

extractRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File is required" });
    return;
  }

  const corrected = await processFile(req.user!.id, req.file);

  res.json({ extracted: corrected });
});

extractRouter.post("/batch", upload.array("files", 12), async (req, res) => {
  const files = req.files;
  if (!files || !Array.isArray(files) || files.length === 0) {
    res.status(400).json({ message: "At least one file is required" });
    return;
  }

  const results: Array<{
    fileName: string;
    extracted?: Awaited<ReturnType<typeof processFile>>;
    error?: string;
  }> = [];

  for (const file of files) {
    try {
      const extracted = await processFile(req.user!.id, file);
      results.push({ fileName: file.originalname, extracted });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed";
      results.push({ fileName: file.originalname, error: message });
    }
  }

  res.json({
    results,
    summary: {
      total: results.length,
      success: results.filter((row) => Boolean(row.extracted)).length,
      failed: results.filter((row) => Boolean(row.error)).length,
    },
  });
});
