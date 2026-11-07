import { Router, Response } from "express";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../../core/auth-middleware";
import { HttpException } from "../../core/http-exception";
import { objectIdSchema } from "../../core/object-id";
import { validateRequest } from "../../core/validate-request";
import { Favorite } from "../../models/Favorite";
import { Movie } from "../../models/Movie";
import { populateOwner, shapeMovie } from "../movies/movie.routes";

const router = Router();
router.use(authMiddleware);

const movieIdSchema = z.object({ params: z.object({ movieId: objectIdSchema }) });

/** The person's favorite movies, most recently added first. */
router.get("/", async (req: AuthRequest, res: Response) => {
  const favorites = await Favorite.find({ user: req.user!.id }).sort({ createdAt: -1 }).populate({
    path: "movie",
    populate: populateOwner,
  });
  // A favorite whose movie was deleted in the meantime is skipped
  const movies = favorites.flatMap((f) => (f.movie ? [shapeMovie(f.movie as never)] : []));
  res.json({ success: true, data: movies });
});

/** Just the ids, so cards anywhere can show a filled heart. */
router.get("/ids", async (req: AuthRequest, res: Response) => {
  const ids = await Favorite.distinct("movie", { user: req.user!.id });
  res.json({ success: true, data: ids.map(String) });
});

/** Adding twice is fine: it stays a single favorite. */
router.put("/:movieId", validateRequest(movieIdSchema), async (req: AuthRequest, res: Response) => {
  if (!(await Movie.exists({ _id: req.params.movieId }))) throw new HttpException(404, "Movie not found");
  await Favorite.updateOne(
    { user: req.user!.id, movie: req.params.movieId },
    { $setOnInsert: { user: req.user!.id, movie: req.params.movieId } },
    { upsert: true }
  );
  res.json({ success: true, message: "Added to favorites" });
});

router.delete("/:movieId", validateRequest(movieIdSchema), async (req: AuthRequest, res: Response) => {
  await Favorite.deleteOne({ user: req.user!.id, movie: req.params.movieId });
  res.json({ success: true, message: "Removed from favorites" });
});

export default router;
