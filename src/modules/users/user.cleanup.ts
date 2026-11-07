import { HydratedDocument } from "mongoose";
import { IUser } from "../../models/User";
import { Movie } from "../../models/Movie";
import { Favorite } from "../../models/Favorite";

/**
 * Deletes a user together with everything that points at them: their
 * favorites, the movies they added, and other people's favorites of those movies.
 */
export const deleteUserAndContent = async (user: HydratedDocument<IUser>) => {
  const movieIds = await Movie.distinct("_id", { addedBy: user._id });
  await Promise.all([
    Favorite.deleteMany({ $or: [{ user: user._id }, { movie: { $in: movieIds } }] }),
    Movie.deleteMany({ addedBy: user._id }),
  ]);
  await user.deleteOne();
};
