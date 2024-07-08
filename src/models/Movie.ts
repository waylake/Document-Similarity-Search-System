import mongoose, { Document, Schema } from "mongoose";

export interface IMovie extends Document {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  popularity: number;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
  combinedEmbedding?: number[];
}

const MovieSchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  overview: { type: String, required: true },
  release_date: { type: String, required: true },
  vote_average: { type: Number, required: true },
  popularity: { type: Number, required: true },
  poster_path: { type: String },
  backdrop_path: { type: String },
  genre_ids: [{ type: Number }],
  combinedEmbedding: [{ type: Number }],
});

export const Movie = mongoose.model<IMovie>("Movie", MovieSchema);
