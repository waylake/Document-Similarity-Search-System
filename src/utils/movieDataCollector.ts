import axios from "axios";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;
const BASE_URL = "https://api.themoviedb.org/3";
const SAMPLE_DATA_DIR = path.join(__dirname, "..", "..", "sample-data");

interface Movie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  popularity: number;
  poster_path: string;
  backdrop_path: string;
  genre_ids: number[];
}

interface TMDBResponse {
  page: number;
  results: Movie[];
  total_pages: number;
  total_results: number;
}

async function fetchMovies(page: number = 1): Promise<TMDBResponse> {
  try {
    const response = await axios.get<TMDBResponse>(
      `${BASE_URL}/discover/movie`,
      {
        params: {
          include_adult: false,
          include_video: false,
          language: "en-US",
          page: page,
          sort_by: "popularity.desc",
        },
        headers: {
          Authorization: `Bearer ${TMDB_API_TOKEN}`,
          accept: "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching movies:", error);
    throw error;
  }
}

async function collectAndSaveMovieData(pages: number = 5): Promise<void> {
  let allMovies: Movie[] = [];

  for (let i = 1; i <= pages; i++) {
    const data = await fetchMovies(i);
    allMovies = [...allMovies, ...data.results];
    console.log(`Collected ${data.results.length} movies from page ${i}`);
  }

  if (!fs.existsSync(SAMPLE_DATA_DIR)) {
    fs.mkdirSync(SAMPLE_DATA_DIR, { recursive: true });
  }

  const filePath = path.join(SAMPLE_DATA_DIR, "movies.json");
  fs.writeFileSync(filePath, JSON.stringify(allMovies, null, 2));

  console.log(`Collected ${allMovies.length} movies and saved to ${filePath}`);
}

collectAndSaveMovieData().catch(console.error);
