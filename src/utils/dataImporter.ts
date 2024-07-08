import fs from "fs";
import path from "path";
import { Movie, IMovie } from "../models/Movie";
import { esClient } from "../config/elasticsearch";
import { Database } from "../config/database";
import logger from "../config/logger";
import { ErrorCause } from "@elastic/elasticsearch/lib/api/types";

interface ErroredDocument {
  status: number;
  error: ErrorCause;
  operation: any;
  document: any;
}

async function waitForMongoDB(
  maxRetries = 5,
  retryInterval = 5000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await Database.getInstance().connect();
      logger.info("Successfully connected to MongoDB");
      return;
    } catch (error) {
      logger.warn(
        `Failed to connect to MongoDB. Retrying in ${retryInterval / 1000} seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error("Failed to connect to MongoDB after multiple retries");
}

async function waitForElasticsearch(
  maxRetries = 5,
  retryInterval = 5000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await esClient.ping();
      logger.info("Successfully connected to Elasticsearch");
      return;
    } catch (error) {
      logger.warn(
        `Failed to connect to Elasticsearch. Retrying in ${retryInterval / 1000} seconds...`,
      );
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
  throw new Error("Failed to connect to Elasticsearch after multiple retries");
}

async function initializeMongoDBCollection() {
  try {
    await Movie.collection.drop();
    logger.info("MongoDB collection 'movies' dropped successfully");
  } catch (error) {
    logger.warn(
      "Failed to drop MongoDB collection 'movies'. It may not exist yet.",
    );
  }
}

async function initializeElasticsearchIndex() {
  try {
    const indexExists = await esClient.indices.exists({ index: "movies" });
    if (indexExists) {
      await esClient.indices.delete({ index: "movies" });
      logger.info("Elasticsearch index 'movies' deleted successfully");
    }

    await esClient.indices.create({
      index: "movies",
      body: {
        mappings: {
          properties: {
            id: { type: "integer" },
            title: { type: "text" },
            overview: { type: "text" },
            release_date: { type: "date" },
            vote_average: { type: "float" },
            popularity: { type: "float" },
            poster_path: { type: "text" },
            backdrop_path: { type: "text" },
            genre_ids: { type: "integer" },
            combinedEmbedding: { type: "float" },
          },
        },
      },
    });
    logger.info("Elasticsearch index 'movies' created successfully");
  } catch (error) {
    logger.error("Failed to initialize Elasticsearch index:", error);
    throw error;
  }
}

export async function importMovieData() {
  try {
    await waitForMongoDB();
    await waitForElasticsearch();

    await initializeMongoDBCollection();
    await initializeElasticsearchIndex();

    const filePath = path.join(
      __dirname,
      "..",
      "..",
      "sample-data",
      "movies.json",
    );
    let moviesData: IMovie[] = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Filter out movies with empty release_date and log warnings
    moviesData = moviesData.filter((movie) => {
      if (!movie.release_date) {
        logger.warn(
          `Movie with ID ${movie.id} has an empty release_date. Skipping...`,
        );
        return false;
      }
      return true;
    });

    for (const movieData of moviesData) {
      await Movie.updateOne(
        { id: movieData.id },
        { $set: movieData },
        { upsert: true },
      );
      logger.info(`Upserted movie: ${movieData.title} into MongoDB`);
    }

    const body = moviesData.flatMap((doc) => [
      { index: { _index: "movies" } },
      {
        id: doc.id,
        title: doc.title,
        overview: doc.overview,
        release_date: doc.release_date,
        vote_average: doc.vote_average,
        popularity: doc.popularity,
        poster_path: doc.poster_path,
        backdrop_path: doc.backdrop_path,
        genre_ids: doc.genre_ids,
        combinedEmbedding: doc.combinedEmbedding,
      },
    ]);

    const bulkResponse = await esClient.bulk({ refresh: true, body });

    if (bulkResponse.errors) {
      const erroredDocuments: ErroredDocument[] = [];
      bulkResponse.items.forEach((action, i) => {
        const operation = Object.keys(action)[0] as keyof typeof action;
        const response = action[operation];
        if (response && "error" in response) {
          erroredDocuments.push({
            status: response.status || 0,
            error: response.error as ErrorCause,
            operation: body[i * 2],
            document: body[i * 2 + 1],
          });
        }
      });
      logger.error(
        "Failed to index some documents in Elasticsearch:",
        erroredDocuments,
      );
    } else {
      logger.info(
        `Successfully indexed ${moviesData.length} documents in Elasticsearch`,
      );
    }

    logger.info("Data import completed successfully");
  } catch (error) {
    logger.error("Error importing data:", error);
    throw error;
  }
}
