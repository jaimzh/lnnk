import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const shortenRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 s"), // 5 requests per 60 seconds
  analytics: true,
  prefix: "@upstash/ratelimit/shorten",
});

export const signupRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: false,
  prefix: "@upstash/ratelimit/signup",
});
