import Redis from "ioredis";
import { envConfig } from "./envConfig";

export class RedisClient {
  private static instance: Redis;

  private constructor() {}

  public static getInstance(): Redis {
    if (!RedisClient.instance) {
      RedisClient.instance = new Redis(envConfig.REDIS_URI);
    }
    return RedisClient.instance;
  }
}

export type RedisClientType = Redis;
