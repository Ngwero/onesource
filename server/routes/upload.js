import { Router } from "express";
import multer from "multer";
import { processAndStoreImage, isAllowedImageMime } from "../lib/imageUpload.js";
import { processAndStoreVideo, isAllowedVideoMime } from "../lib/videoUpload.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedImageMime(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported image type. Use JPEG, PNG, WebP, or GIF."));
  },
});

const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedVideoMime(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported video type. Use MP4 or WebM."));
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

    const folder = ["categories", "hero", "products", "suppliers", "kitchen"].includes(req.body?.folder)
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

/** Native MP4/WebM — required for reliable muted autoplay on iPhone. */
router.post("/video", (req, res, next) => {
  console.log(
    `[upload] ${new Date().toISOString()} POST /api/upload/video folder=${req.body?.folder ?? "kitchen"}`
  );
  uploadVideo.single("video")(req, res, (err) => {
    if (err) {
      console.error("[upload:video] multer error:", err.message);
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "No video file provided (field name: video)" });
    }
    const folder = ["kitchen", "hero"].includes(req.body?.folder)
      ? req.body.folder
      : "kitchen";

    const result = await processAndStoreVideo(req.file.buffer, {
      folder,
      mime: req.file.mimetype,
    });

    res.status(201).json({
      ...result,
      message: "Video uploaded",
    });
  } catch (e) {
    console.error("[upload:video] failed:", e.message);
    res.status(400).json({ error: e.message || "Upload failed" });
  }
});

export default router;
