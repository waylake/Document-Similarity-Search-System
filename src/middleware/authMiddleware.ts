import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RedisClient } from "../config/redis";
import { envConfig } from "../config/envConfig";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, envConfig.JWT_SECRET) as {
      userId: string;
    };
    const redis = RedisClient.getInstance();
    const storedToken = await redis.get(`auth_${decoded.userId}`);

    if (token !== storedToken) {
      throw new Error();
    }

    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate." });
  }
};
