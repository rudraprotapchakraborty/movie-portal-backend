import { Schema, model, Document, Types } from "mongoose";

export const GENRES = [
  "action",
  "adventure",
  "animation",
  "comedy",
  "crime",
  "drama",
  "fantasy",
  "horror",
  "romance",
  "sci-fi",
  "thriller",
] as const;
export type Genre = (typeof GENRES)[number];

export interface IMovie extends Document {
  title: string;
  genre: Genre;
  /** minutes */
  duration: number;
  /** release year */
  release: number;
  /** 0 to 10, given by whoever added the movie */
  rating: number;
  summary: string;
  poster: string;
  /** Where the details came from, for sample catalogue entries */
  source?: string;
  addedBy: Types.ObjectId;
  /** Sample catalogue entries; shared test accounts may not change these */
  isSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const movieSchema = new Schema<IMovie>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    genre: { type: String, enum: GENRES, required: true },
    duration: { type: Number, required: true, min: 30, max: 400 },
    release: { type: Number, required: true, min: 1888, max: 2100 },
    rating: { type: Number, required: true, min: 0, max: 10 },
    summary: { type: String, required: true, trim: true, minlength: 10, maxlength: 1000 },
    poster: { type: String, required: true, trim: true, maxlength: 500 },
    source: { type: String, trim: true, maxlength: 300 },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    isSeed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

movieSchema.index({ genre: 1, rating: -1 });
movieSchema.index({ rating: -1, createdAt: -1 });

export const Movie = model<IMovie>("Movie", movieSchema);
