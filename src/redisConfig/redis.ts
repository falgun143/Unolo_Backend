import { createClient } from "redis";
export const redisClient = createClient({
  username: 'default',
  password: 'deTHhVG1JmWejocMr664MbGnh4OCwOKp',
  socket: {
      host: 'redis-10271.crce179.ap-south-1-1.ec2.redns.redis-cloud.com',
      port: 10271
  }
});

redisClient.on('error', err => console.log('Redis Client Error', err));

async function initializeRedis() {
  if (!redisClient.isOpen) {
      await redisClient.connect();
  }
}

initializeRedis().catch(console.error);