import * as tf from "@tensorflow/tfjs-node";
import * as use from "@tensorflow-models/universal-sentence-encoder";
import { Movie, IMovie } from "../models/Movie";
import { RedisClientType } from "../config/redis";
import { esClient } from "../config/elasticsearch";

export class EmbeddingService {
  private model: use.UniversalSentenceEncoder | null = null;
  private redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  async initialize() {
    await tf.ready();
    this.model = await use.load();
    console.log("Universal Sentence Encoder model loaded");
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.model) {
      throw new Error("Model not initialized");
    }
    const embeddings = await this.model.embed([text]);
    return Array.from(await embeddings.data());
  }

  async generateCombinedEmbedding(movie: IMovie): Promise<number[]> {
    const textToEmbed = `${movie.title} ${movie.overview} ${movie.genre_ids.join(" ")} ${movie.release_date}`;
    return this.generateEmbedding(textToEmbed);
  }

  async generateAndStoreEmbeddings() {
    const movies = await Movie.find({});
    for (const movie of movies) {
      const embedding = await this.generateCombinedEmbedding(movie);
      movie.combinedEmbedding = embedding;
      await movie.save();
      await this.indexMovieEmbeddingToElasticsearch(movie.id, embedding);
    }
    console.log("Combined embeddings generated and stored for all movies");
  }

  async indexMovieEmbeddingToElasticsearch(
    movieId: number,
    embedding: number[],
  ) {
    try {
      await esClient.update({
        index: "movies",
        id: movieId.toString(),
        body: {
          doc: {
            combinedEmbedding: embedding,
          },
        },
      });
    } catch (error: any) {
      if (
        error.meta &&
        error.meta.body &&
        error.meta.body.error.type === "document_missing_exception"
      ) {
        await esClient.index({
          index: "movies",
          id: movieId.toString(),
          body: {
            combinedEmbedding: embedding,
          },
        });
      } else {
        throw error;
      }
    }
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  async findSimilarMovies(
    movieId: number,
    limit: number = 10,
  ): Promise<IMovie[]> {
    const cacheKey = `similar_movies:${movieId}:${limit}`;
    const cachedResult = await this.redisClient.get(cacheKey);

    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const sourceMovie = await Movie.findOne({ id: movieId });
    if (!sourceMovie || !sourceMovie.combinedEmbedding) {
      throw new Error("Movie not found or embedding not available");
    }

    const allMovies = await Movie.find({ id: { $ne: movieId } });
    const similarMovies = allMovies
      .map((movie) => ({
        movie,
        similarity: this.cosineSimilarity(
          sourceMovie.combinedEmbedding!,
          movie.combinedEmbedding!,
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map((item) => {
        const { combinedEmbedding, ...movieWithoutEmbedding } =
          item.movie.toObject();
        return movieWithoutEmbedding as IMovie;
      });

    await this.redisClient.set(
      cacheKey,
      JSON.stringify(similarMovies),
      "EX",
      3600,
    );

    return similarMovies;
  }
}
