import { Movie, IMovie } from "../models/Movie";
import { Client } from "@elastic/elasticsearch";

export class MovieService {
  private esClient: Client;

  constructor(esClient: Client) {
    this.esClient = esClient;
  }

  async createMovie(movieData: Partial<IMovie>): Promise<IMovie> {
    const movie = new Movie(movieData);
    await movie.save();
    await this.indexMovieToElasticsearch(movie);
    return movie;
  }

  async getMovieById(id: number): Promise<IMovie | null> {
    return Movie.findOne({ id });
  }

  async searchMovies(query: string, page: number = 1, limit: number = 10) {
    if (!query) {
      throw new Error("Query parameter is required");
    }

    const result = await this.esClient.search({
      index: "movies",
      body: {
        query: {
          multi_match: {
            query: query,
            fields: ["title", "overview"],
          },
        },
        from: (page - 1) * limit,
        size: limit,
      },
    });

    return (result.hits?.hits || []).map((hit: any) => {
      const { combinedEmbedding, ...movieWithoutEmbedding } = hit._source;
      return movieWithoutEmbedding;
    });
  }

  private async indexMovieToElasticsearch(movie: IMovie) {
    await this.esClient.index({
      index: "movies",
      id: movie.id.toString(),
      body: {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        release_date: movie.release_date,
        vote_average: movie.vote_average,
        popularity: movie.popularity,
        combinedEmbedding: movie.combinedEmbedding,
      },
    });
  }
}
