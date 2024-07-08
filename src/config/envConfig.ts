import dotenv from "dotenv";
dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  MONGODB_URI: string;
  REDIS_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  LOG_LEVEL: string;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  ELASTICSEARCH_NODE: string;
}

const getEnvVariable = (
  key: keyof EnvConfig,
  defaultValue?: string,
): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
};

export const envConfig: EnvConfig = {
  PORT: parseInt(getEnvVariable("PORT", "3000"), 10),
  NODE_ENV: getEnvVariable("NODE_ENV", "development"),
  MONGODB_URI: getEnvVariable("MONGODB_URI"),
  REDIS_URI: getEnvVariable("REDIS_URI"),
  JWT_SECRET: getEnvVariable("JWT_SECRET"),
  JWT_EXPIRATION: getEnvVariable("JWT_EXPIRATION", "1h"),
  LOG_LEVEL: getEnvVariable("LOG_LEVEL", "info"),
  RATE_LIMIT_WINDOW: parseInt(getEnvVariable("RATE_LIMIT_WINDOW", "10"), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(
    getEnvVariable("RATE_LIMIT_MAX_REQUESTS", "10"),
    10,
  ),
  ELASTICSEARCH_NODE: getEnvVariable(
    "ELASTICSEARCH_NODE",
    "http://localhost:9200",
  ),
};

if (envConfig.NODE_ENV === "development") {
  console.log("Environment Variables:", {
    ...envConfig,
    JWT_SECRET: "[REDACTED]", // 민감한 정보 숨기기
  });
}
