import { Router } from "express";
import multer from "multer";
import { invoicesCollection } from "../db.js";
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

extractRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File is required" });
    return;
  }

  if (!supportedMimeTypes.has(req.file.mimetype)) {
    res.status(400).json({
      message: "Unsupported invoice file format. Please upload PDF, PNG, JPG, JPEG, or WebP.",
    });
    return;
  }

  const extracted = await extractInvoiceFromFile(
    req.file.originalname,
    req.file.buffer,
    req.file.mimetype,
  );

  const corrected = await applyLearnedCorrections(req.user!.id, extracted);
  const historicalInvoices = await invoicesCollection()
    .find({ userId: req.user!.id })
    .sort({ uploadedAt: -1 })
    .limit(400)
    .toArray();

  corrected.category = suggestExpenseCategory(corrected, historicalInvoices);

  res.json({ extracted: corrected });
});
