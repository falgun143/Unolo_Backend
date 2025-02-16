import cluster from "cluster";
import os from "os";
import prisma from "./lib/prismaClient";
import axios from "axios";
import sharp from "sharp";
import { redisClient } from "./redisConfig/redis";

const workerWorkers =  os.cpus().length;

async function fetchNextJob() {
  while (true) {
    try {
      const jobs = await redisClient.zRangeByScore("scheduled_jobs", 0, Date.now(), { LIMIT: { offset: 0, count: 1 } });
      if (jobs.length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 100)); 
        continue;
      }

      const jobData = JSON.parse(jobs[0]);
      const { jobId, visits } = jobData;
      const lockKey = `lock:${jobId}`;
      const lockAcquired = await redisClient.set(lockKey, "worker", { NX: true, EX: 30 });
      if (!lockAcquired) continue;

      await redisClient.zRem("scheduled_jobs", jobs[0]);
      return { jobId, visits };
    } catch (error) {
      console.error("Error fetching next job:", error);
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait before retrying
    }
  }
}

async function processJobs() {
  console.log("Worker started");
  while (true) {
    const jobData = await fetchNextJob();
    if (!jobData) continue;

    const { jobId, visits } = jobData;
    console.log(`Processing job: ${jobId}`);

    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { visits: true },
      });

      if (!job || job.status !== "ongoing") continue;

      await processJob(jobId, visits);
    } finally {
      await redisClient.del(`lock:${jobId}`); // Release the lock
      console.log(`job: ${jobId} processed`);

    }
  }
}

async function processJob(jobId: string, visits: any) {
  try {
    for (const visit of visits) {
      try {
        const imagesToInsert = await Promise.all(
          visit.images.map(async (image: any) => {
            const imageUrl = image.url;
            const cachedImage = await redisClient.get(`image:${imageUrl}`);

            let imageBuffer: Buffer;
            if (cachedImage) {
              imageBuffer = Buffer.from(cachedImage, "base64");
            } else {
              const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
              imageBuffer = response.data;
              await redisClient.set(`image:${imageUrl}`, imageBuffer.toString("base64"), { EX: 86400 });
            }

            const imageSharp = sharp(imageBuffer);
            const metadata = await imageSharp.metadata();
            const perimeter = 2 * (metadata.width! + metadata.height!);

            return {
              url: imageUrl,
              visitId: visit.id,
              perimeter,
            };
          })
        );

        if (imagesToInsert.length > 0) {
          await prisma.image.createMany({ data: imagesToInsert });
        }
      } catch (error) {
        console.log(error);
        await prisma.error.create({
          data: {
            store_id: visit.store_id,
            message: "Image processing failed",
            job: { connect: { id: jobId } },
          },
        });
      }
    }

    const errorCount = await prisma.error.count({ where: { jobId } });
    await prisma.job.update({
      where: { id: jobId },
      data: { status: errorCount > 0 ? "failed" : "completed" },
    });
  } catch (error) {
    console.log(error);
    await prisma.job.update({ where: { id: jobId }, data: { status: "failed" } });
    await prisma.error.create({
      data: {
        store_id: "unknown",
        message: "Unexpected error occurred",
        job: { connect: { id: jobId } },
      },
    });
  }
}

if (cluster.isPrimary) {
  // Create a worker for each allocated CPU core
  for (let i = 0; i < workerWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Starting a new worker.`);
    cluster.fork();
  });
} else {
  processJobs();
}
