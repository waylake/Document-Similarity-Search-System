import express from "express";
import swaggerUi from "swagger-ui-express";
import { Database } from "./config/database";
import authRoutes from "./routes/authRoutes";
import movieRoutes from "./routes/movieRoutes";
import { envConfig } from "./config/envConfig";
import { swaggerSpec } from "./config/swagger";
import { loggingMiddleware } from "./middleware/loggingMiddleware";
import logger from "./config/logger";
import { EmbeddingService } from "./services/embeddingService";
import { importMovieData } from "./utils/dataImporter";
import { RedisClient } from "./config/redis";

class App {
  public app: express.Application;
  private embeddingService: EmbeddingService;

  constructor() {
    this.app = express();
    this.embeddingService = new EmbeddingService(RedisClient.getInstance());
    this.config();
    this.routes();
  }

  private config(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    this.app.use(loggingMiddleware);
  }

  private routes(): void {
    this.app.use("/auth", authRoutes);
    this.app.use("/movies", movieRoutes);
  }

  private async initializeDatabase(): Promise<void> {
    try {
      const database = Database.getInstance();
      await database.connect();
      logger.info("Database initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize database:", error);
      throw error;
    }
  }

  private initializeSwagger(): void {
    this.app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    logger.info("Swagger initialized");
  }

  private async initializeEmbeddingService(): Promise<void> {
    try {
      await this.embeddingService.initialize();
      await this.embeddingService.generateAndStoreEmbeddings();
      logger.info("Embedding service initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize embedding service:", error);
      throw error;
    }
  }

  private async importData(): Promise<void> {
    try {
      logger.info("Starting data import process");
      await importMovieData();
      logger.info("Movie data imported successfully");
    } catch (error) {
      logger.error("Failed to import movie data:", error);
    }
  }

  public async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.importData();
      this.initializeSwagger();
      await this.initializeEmbeddingService();
    } catch (error) {
      logger.error("Failed to initialize application:", error);
      throw error;
    }
  }

  public async start(): Promise<void> {
    try {
      await this.initialize();
      this.app.listen(envConfig.PORT, () => {
        logger.info(`Server is running on port ${envConfig.PORT}`);
        logger.info(
          `Swagger documentation is available at http://localhost:${envConfig.PORT}/api-docs`,
        );
      });
    } catch (error) {
      logger.error("Failed to start the server:", error);
      process.exit(1);
    }
  }
}

// 전역 에러 핸들러
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

const application = new App();
application.start().catch((error) => {
  logger.error("Unhandled error during server startup:", error);
  process.exit(1);
});

export default application.app;
