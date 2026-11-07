import { Router } from "express";
import { Favorite } from "../../models/Favorite";
import { Movie } from "../../models/Movie";
import { User } from "../../models/User";

const router = Router();

/** Aggregate counts only (no personal data) for the landing page. */
router.get("/stats", async (_req, res) => {
  const [movies, members, favorites] = await Promise.all([
    Movie.estimatedDocumentCount(),
    User.countDocuments({ emailVerified: true, isBlocked: false }),
    Favorite.estimatedDocumentCount(),
  ]);
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json({ success: true, data: { movies, members, favorites } });
});

export default router;
