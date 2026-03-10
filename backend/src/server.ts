import express from "express";
import cors from "cors";
import morgan from "morgan";
import { config } from "./config.js";
import { authRouter } from "./routes/auth-routes.js";
import { invoiceRouter } from "./routes/invoice-routes.js";
import { analyticsRouter } from "./routes/analytics-routes.js";
import { gstRouter } from "./routes/gst-routes.js";
import { settingsRouter } from "./routes/settings-routes.js";
import { extractRouter } from "./routes/extract-routes.js";
import { errorHandler, notFoundHandler } from "./middleware/error-middleware.js";

const app = express();

app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "invoicesnap-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/invoices", invoiceRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/gst-reports", gstRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/extract", extractRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running at http://localhost:${config.port}`);
});
