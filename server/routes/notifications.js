import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  listNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
} from "../lib/notificationService.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const admin = req.query.admin === "true";
    const notifications = await listNotifications(db, { admin });
    res.json({ notifications });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = requireSupabase();
    const notification = await createNotification(db, req.body);
    res.status(201).json({ notification, message: "Notification sent" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const notification = await updateNotification(db, req.params.id, req.body);
    res.json({ notification, message: "Notification updated" });
  } catch (e) {
    const status = e.message === "Notification not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const notification = await deleteNotification(db, req.params.id);
    res.json({ notification, message: "Notification deactivated" });
  } catch (e) {
    const status = e.message === "Notification not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

export default router;
