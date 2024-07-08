import { User } from "../models/User";
import { hashPassword, comparePassword } from "../utils/passwordUtils";
import jwt from "jsonwebtoken";
import { RedisClient } from "../config/redis";
import Redis from "ioredis";
import { envConfig } from "../config/envConfig";

export class AuthService {
  private redis: Redis;

  constructor() {
    this.redis = RedisClient.getInstance();
  }

  public async register(
    username: string,
    email: string,
    password: string,
  ): Promise<any> {
    const hashedPassword = await hashPassword(password);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    return user;
  }

  public async login(username: string, password: string): Promise<string> {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("User not found");
    }

    const isValid = await comparePassword(password, user.password);
    if (!isValid) {
      throw new Error("Invalid password");
    }

    const token = jwt.sign({ userId: user._id }, envConfig.JWT_SECRET, {
      expiresIn: envConfig.JWT_EXPIRATION,
    });

    await this.redis.set(
      `auth_${user._id}`,
      token,
      "EX",
      parseInt(envConfig.JWT_EXPIRATION),
    );

    return token;
  }
}
