import { Schema, model, Document, Types } from "mongoose";

export interface IFavorite extends Document {
  user: Types.ObjectId;
  movie: Types.ObjectId;
  createdAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    movie: { type: Schema.Types.ObjectId, ref: "Movie", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// A movie can only be a favorite once per person
favoriteSchema.index({ user: 1, movie: 1 }, { unique: true });
favoriteSchema.index({ movie: 1 });

export const Favorite = model<IFavorite>("Favorite", favoriteSchema);
