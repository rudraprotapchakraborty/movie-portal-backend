/**
 * Fills the Movie Portal database with a sample catalogue and demo accounts.
 *
 *   npm run seed          create / refresh the demo data
 *   npm run seed:clear    remove it again
 *
 * The catalogue comes from scripts/movies.seed.json: real titles, runtimes,
 * release years, posters and synopses taken from Wikipedia and Wikidata.
 * Only accounts flagged `isDemo` (and the movies and favorites that belong to
 * them) are ever touched, so real members are never affected. Safe to run
 * repeatedly: the demo data is reset each time.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { connectDB, disconnectDB } from "../src/config/db";
import { env } from "../src/config/env";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/config/demo";
import { hashPassword } from "../src/utils/password";
import { User } from "../src/models/User";
import { Movie } from "../src/models/Movie";
import { Favorite } from "../src/models/Favorite";

interface SeedMovie {
  title: string;
  genre: string;
  duration: number;
  release: number;
  rating: number;
  summary: string;
  poster: string;
  source?: string;
}

const catalogue: SeedMovie[] = JSON.parse(readFileSync(join(__dirname, "movies.seed.json"), "utf8"));

const portrait = (g: "men" | "women", n: number) => `https://randomuser.me/api/portraits/${g}/${n}.jpg`;

const people = [
  { key: "admin", email: DEMO_ACCOUNTS[0].email, fullName: "Aria Admin", role: "ADMIN" as const, image: portrait("women", 65) },
  { key: "user", email: DEMO_ACCOUNTS[1].email, fullName: "Maya Fernandez", role: "USER" as const, image: portrait("women", 44) },
  { key: "tariq", email: "tariq.rahman@movieportal.demo", fullName: "Tariq Rahman", role: "USER" as const, image: portrait("men", 32) },
  { key: "noah", email: "noah.lindqvist@movieportal.demo", fullName: "Noah Lindqvist", role: "USER" as const, image: portrait("men", 75) },
  // Owns the sample catalogue. Nobody signs in as this account.
  { key: "curator", email: "curator@movieportal.demo", fullName: "Portal Curator", role: "USER" as const, image: portrait("men", 11) },
];

// Movies the shared accounts own themselves, so they can try editing and deleting
const ownedBy: Record<string, string[]> = {
  user: ["Interstellar", "Whiplash", "Parasite", "La La Land"],
  admin: ["Inception", "Gladiator"],
};

const favoritesOf: Record<string, string[]> = {
  user: ["The Dark Knight", "Dune", "Spirited Away", "Toy Story", "The Matrix", "Interstellar"],
  admin: ["The Godfather", "Inception", "Mad Max: Fury Road", "Parasite"],
  tariq: ["Star Wars: A New Hope", "Back to the Future"],
  noah: ["Blade Runner 2049", "Alien"],
};

const clear = async () => {
  const demo = await User.find({ isDemo: true }).select("_id");
  const ids = demo.map((u) => u._id);
  const movieIds = await Movie.distinct("_id", { addedBy: { $in: ids } });
  const favorites = await Favorite.deleteMany({ $or: [{ user: { $in: ids } }, { movie: { $in: movieIds } }] });
  const movies = await Movie.deleteMany({ addedBy: { $in: ids } });
  const users = await User.deleteMany({ isDemo: true });
  console.log(`Removed ${users.deletedCount} demo accounts, ${movies.deletedCount} movies and ${favorites.deletedCount} favorites.`);
};

const seed = async () => {
  await clear();
  const password = await hashPassword(DEMO_PASSWORD);

  const users: Record<string, InstanceType<typeof User>> = {};
  for (const p of people) {
    users[p.key] = await User.findOneAndUpdate(
      { email: p.email },
      {
        $set: {
          fullName: p.fullName,
          role: p.role,
          profileImageUrl: p.image,
          emailVerified: true,
          isBlocked: false,
          isDemo: true,
          password,
        },
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    ) as InstanceType<typeof User>;
  }

  const ownerKeyOf = (title: string) => Object.keys(ownedBy).find((k) => ownedBy[k].includes(title)) ?? "curator";

  // Oldest releases first, so "newest added" lists start with the most recent films
  const docs = catalogue.map((m, i) => {
    const owner = ownerKeyOf(m.title);
    return {
      ...m,
      addedBy: users[owner]._id,
      isSeed: owner === "curator",
      createdAt: new Date(Date.now() - (catalogue.length - i) * 60 * 60 * 1000),
    };
  });
  const inserted = await Movie.insertMany(docs);
  const byTitle = new Map(inserted.map((m) => [m.title, m._id]));

  let favorites = 0;
  for (const [key, titles] of Object.entries(favoritesOf)) {
    const rows = titles.flatMap((t, i) =>
      byTitle.has(t) ? [{ user: users[key]._id, movie: byTitle.get(t)!, createdAt: new Date(Date.now() - i * 60_000) }] : []
    );
    if (rows.length) await Favorite.insertMany(rows);
    favorites += rows.length;
  }

  console.log(`Seeded ${people.length} demo accounts, ${inserted.length} movies and ${favorites} favorites into "${env.MONGODB_DB}".`);
  console.log(`Demo password: ${DEMO_PASSWORD}`);
};

(async () => {
  await connectDB();
  if (process.argv[2] === "clear") await clear();
  else await seed();
  await disconnectDB();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
