import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth-middleware.js";
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

  res.json({ extracted });
});
