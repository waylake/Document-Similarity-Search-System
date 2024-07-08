import { Request, Response } from "express";
import { MovieService } from "../services/movieService";
import { EmbeddingService } from "../services/embeddingService";

export class MovieController {
  private movieService: MovieService;
  private embeddingService: EmbeddingService;

  constructor(movieService: MovieService, embeddingService: EmbeddingService) {
    this.movieService = movieService;
    this.embeddingService = embeddingService;
  }

  async getMovieById(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const movie = await this.movieService.getMovieById(Number(id));
      if (movie) {
        res.json(movie);
      } else {
        res.status(404).json({ error: "Movie not found" });
      }
    } catch (error) {
      res
        .status(500)
        .json({ error: "An error occurred while fetching the movie" });
    }
  }

  async searchMovies(req: Request, res: Response) {
    const { query, page, limit } = req.query;
    try {
      const movies = await this.movieService.searchMovies(
        query as string,
        Number(page) || 1,
        Number(limit) || 10,
      );
      res.json(movies);
    } catch (error) {
      res
        .status(500)
        .json({ error: "An error occurred while searching movies" });
    }
  }

  async getSimilarMovies(req: Request, res: Response) {
    const { id } = req.params;
    const { limit } = req.query;
    try {
      const similarMovies = await this.embeddingService.findSimilarMovies(
        Number(id),
        Number(limit) || 10,
      );
      res.json(similarMovies);
    } catch (error) {
      res
        .status(500)
        .json({ error: "An error occurred while finding similar movies" });
    }
  }
}
