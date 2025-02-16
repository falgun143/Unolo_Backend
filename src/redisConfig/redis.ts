import { createClient } from "redis";
export const redisClient = createClient({
  username: "default",
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || "6379"),
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || "10000"),
  },
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));

async function initializeRedis() {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  try {
    await redisClient.flushAll();
    console.log("Redis cache cleared.");
  } catch (error) {
    console.error("Error clearing Redis cache:", error);
  }
}

initializeRedis().catch(console.error);
