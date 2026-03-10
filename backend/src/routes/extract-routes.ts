import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth-middleware.js";
import { generateExtractionFromFilename } from "../utils/extract.js";

const upload = multer({ storage: multer.memoryStorage() });

export const extractRouter = Router();

extractRouter.use(requireAuth);

extractRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File is required" });
    return;
  }

  const extracted = generateExtractionFromFilename(req.file.originalname);
  res.json({ extracted });
});
