import { Router } from "express";
import { MovieController } from "../controllers/movieController";
import { MovieService } from "../services/movieService";
import { EmbeddingService } from "../services/embeddingService";
import { esClient } from "../config/elasticsearch";
import { RedisClient } from "../config/redis";

const router = Router();

const movieService = new MovieService(esClient);
const redisClient = RedisClient.getInstance();
const embeddingService = new EmbeddingService(redisClient);
const movieController = new MovieController(movieService, embeddingService);

/**
 * @swagger
 * /movies/search:
 *   get:
 *     summary: Search for movies
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: true
 *         description: Query string for searching movies
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: A list of movies
 */
router.get("/search", movieController.searchMovies.bind(movieController));

/**
 * @swagger
 * /movies/{id}/similar:
 *   get:
 *     summary: Get similar movies by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the movie to find similar movies for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of similar movies to return
 *     responses:
 *       200:
 *         description: A list of similar movies
 */
router.get(
  "/:id/similar",
  movieController.getSimilarMovies.bind(movieController),
);

export default router;
