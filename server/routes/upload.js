import { Router } from "express";
import multer from "multer";
import { processAndStoreImage, isAllowedImageMime } from "../lib/imageUpload.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImageMime(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF."));
  },
});

router.post("/image", (req, res, next) => {
  console.log(
    `[upload] ${new Date().toISOString()} POST /api/upload/image folder=${req.body?.folder ?? "products"}`
  );
  upload.single("image")(req, res, (err) => {
    if (err) {
      console.error("[upload] multer error:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      console.warn("[upload] no file in request");
      return res.status(400).json({ error: "No image file provided (field name: image)" });
    }

    const folder = ["categories", "hero", "products"].includes(req.body?.folder)
      ? req.body.folder
      : "products";

    console.log(
      `[upload] processing ${req.file.originalname} (${req.file.mimetype}, ${req.file.size} bytes)`
    );

    const result = await processAndStoreImage(req, req.file.buffer, {
      folder,
      mime: req.file.mimetype,
    });

    console.log(`[upload] done → ${result.url}`);

    res.status(201).json({
      ...result,
      message: "Image converted to WebP and uploaded",
    });
  } catch (e) {
    console.error("[upload] failed:", e.message);
    res.status(400).json({ error: e.message || "Upload failed" });
  }
});

export default router;
