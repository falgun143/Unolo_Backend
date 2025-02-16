import { createClient } from "redis";
export const redisClient = createClient({
  username: 'default',
  password: 'deTHhVG1JmWejocMr664MbGnh4OCwOKp',
  socket: {
    host: 'redis-10271.crce179.ap-south-1-1.ec2.redns.redis-cloud.com',
    port: 10271,
    connectTimeout: 10000, 
  }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

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