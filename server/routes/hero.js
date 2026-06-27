import { Router } from "express";
import { requireSupabase } from "../lib/supabase.js";
import {
  listHeroSlides,
  createHeroSlide,
  updateHeroSlide,
  deleteHeroSlide,
} from "../lib/heroService.js";

const router = Router();

router.get("/slides", async (req, res) => {
  try {
    const db = requireSupabase();
    const admin = req.query.admin === "true";
    const slides = await listHeroSlides(db, { admin });
    res.json({ slides });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/slides", async (req, res) => {
  try {
    const db = requireSupabase();
    const slide = await createHeroSlide(db, req.body);
    res.status(201).json({ slide, message: "Hero slide created" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/slides/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const slide = await updateHeroSlide(db, req.params.id, req.body);
    res.json({ slide, message: "Hero slide updated" });
  } catch (e) {
    const status = e.message === "Hero slide not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

router.delete("/slides/:id", async (req, res) => {
  try {
    const db = requireSupabase();
    const result = await deleteHeroSlide(db, req.params.id);
    res.json(result);
  } catch (e) {
    const status = e.message === "Hero slide not found" ? 404 : 400;
    res.status(status).json({ error: e.message });
  }
});

export default router;
