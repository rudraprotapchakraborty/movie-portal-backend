import { Router, Request, Response } from "express";
import { z } from "zod";
import { AuthRequest, authMiddleware } from "../../core/auth-middleware";
import { HttpException } from "../../core/http-exception";
import { escapeRegex, objectIdSchema } from "../../core/object-id";
import { validateRequest } from "../../core/validate-request";
import { Favorite } from "../../models/Favorite";
import { GENRES, IMovie, Movie } from "../../models/Movie";
import { IUser } from "../../models/User";

const router = Router();

const MAX_MOVIES = 200;
const MAX_MOVIES_DEMO = 15;
const NEWEST_YEAR = new Date().getFullYear() + 3;

type Owner = Pick<IUser, "fullName" | "isDemo"> & { _id: unknown };

const shape = (m: IMovie & { addedBy: Owner | unknown }) => {
  const owner = m.addedBy as unknown as Owner | null;
  return {
    id: String(m._id),
    title: m.title,
    genre: m.genre,
    duration: m.duration,
    release: m.release,
    rating: m.rating,
    summary: m.summary,
    poster: m.poster,
    source: m.source ?? null,
    isSeed: m.isSeed,
    addedBy: owner && typeof owner === "object" && "fullName" in owner ? { id: String(owner._id), name: owner.fullName } : null,
    createdAt: m.createdAt,
  };
};

const populateOwner = { path: "addedBy", select: "fullName isDemo" };

const posterUrl = z
  .url({ protocol: /^https?$/ })
  .max(500, "That link is too long");

const movieFields = {
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(100),
  genre: z.enum(GENRES),
  duration: z.coerce.number().int("Duration is in whole minutes").min(30, "Duration must be at least 30 minutes").max(400),
  release: z.coerce.number().int().min(1888, "Pick a real release year").max(NEWEST_YEAR),
  rating: z.coerce.number().min(0).max(10),
  summary: z.string().trim().min(10, "Summary must be at least 10 characters").max(1000),
  poster: posterUrl,
};

const createSchema = z.object({ body: z.object(movieFields) });
const updateSchema = z.object({
  params: z.object({ id: objectIdSchema }),
  body: z.object(movieFields).partial(),
});
const idSchema = z.object({ params: z.object({ id: objectIdSchema }) });

const listSchema = z.object({
  query: z.object({
    q: z.string().trim().max(80).optional(),
    genre: z.enum(GENRES).optional(),
    sort: z.enum(["newest", "oldest", "rating", "year", "title"]).optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
  }),
});

const SORTS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  rating: { rating: -1, createdAt: -1 },
  year: { release: -1, rating: -1 },
  title: { title: 1 },
} as const;

/** Public: search, filter, sort and paginate the catalogue. */
router.get("/", validateRequest(listSchema), async (req: Request, res: Response) => {
  // validateRequest only replaces the body, so read the query through the same schema to get real numbers
  const { q, genre, sort = "rating", page = 1, limit = 24 } = listSchema.parse({ query: req.query }).query;
  const filter: Record<string, unknown> = {};
  if (genre) filter.genre = genre;
  if (q) filter.title = new RegExp(escapeRegex(q), "i");

  const [rows, total] = await Promise.all([
    Movie.find(filter)
      .sort(SORTS[sort] as Record<string, 1 | -1>)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate(populateOwner),
    Movie.countDocuments(filter),
  ]);
  res.set("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
  res.json({ success: true, data: { movies: rows.map(shape), total, page, pages: Math.max(1, Math.ceil(total / limit)) } });
});

router.get("/top", async (_req: Request, res: Response) => {
  const rows = await Movie.find().sort({ rating: -1, createdAt: -1 }).limit(6).populate(populateOwner);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ success: true, data: rows.map(shape) });
});

router.get("/latest", async (_req: Request, res: Response) => {
  const rows = await Movie.find().sort({ createdAt: -1, release: -1 }).limit(8).populate(populateOwner);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ success: true, data: rows.map(shape) });
});

/** Genres that have at least one movie, with counts (for the filter chips). */
router.get("/genres", async (_req: Request, res: Response) => {
  const rows = await Movie.aggregate([{ $group: { _id: "$genre", count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  res.json({ success: true, data: rows.map((r) => ({ genre: r._id, count: r.count })) });
});

/** Movies the signed-in person added. */
router.get("/mine", authMiddleware, async (req: AuthRequest, res: Response) => {
  const rows = await Movie.find({ addedBy: req.user!.id }).sort({ createdAt: -1 }).populate(populateOwner);
  res.json({ success: true, data: rows.map(shape) });
});

router.get("/:id", validateRequest(idSchema), async (req: Request, res: Response) => {
  const movie = await Movie.findById(req.params.id).populate(populateOwner);
  if (!movie) throw new HttpException(404, "Movie not found");
  res.json({ success: true, data: shape(movie) });
});

router.post("/", authMiddleware, validateRequest(createSchema), async (req: AuthRequest, res: Response) => {
  const owner = req.user!.id;
  const limit = req.user!.isDemo ? MAX_MOVIES_DEMO : MAX_MOVIES;
  if ((await Movie.countDocuments({ addedBy: owner, isSeed: false })) >= limit) {
    throw new HttpException(400, `You can add up to ${limit} movies. Delete one to add another.`);
  }
  const movie = await Movie.create({ ...req.body, addedBy: owner });
  await movie.populate(populateOwner);
  res.status(201).json({ success: true, data: shape(movie) });
});

/**
 * Only the person who added a movie, or an admin, may change or delete it.
 * Shared test accounts may not touch the sample catalogue, nor anything that
 * belongs to a real member.
 */
const loadEditable = async (req: AuthRequest, id: string) => {
  const movie = await Movie.findById(id).populate(populateOwner);
  if (!movie) throw new HttpException(404, "Movie not found");

  const owner = movie.addedBy as unknown as Owner | null;
  const isOwner = owner && String(owner._id) === req.user!.id;
  if (!isOwner && req.user!.role !== "ADMIN") throw new HttpException(403, "You can only change movies you added");

  if (req.user!.isDemo && (movie.isSeed || !owner?.isDemo)) {
    throw new HttpException(403, "Test accounts can only change movies they added themselves.");
  }
  return movie;
};

router.patch("/:id", authMiddleware, validateRequest(updateSchema), async (req: AuthRequest, res: Response) => {
  const movie = await loadEditable(req, req.params.id as string);
  movie.set(req.body);
  await movie.save();
  res.json({ success: true, data: shape(movie) });
});

router.delete("/:id", authMiddleware, validateRequest(idSchema), async (req: AuthRequest, res: Response) => {
  const movie = await loadEditable(req, req.params.id as string);
  await Promise.all([Favorite.deleteMany({ movie: movie._id }), movie.deleteOne()]);
  res.json({ success: true, message: "Movie deleted" });
});

export { shape as shapeMovie, populateOwner };
export default router;

