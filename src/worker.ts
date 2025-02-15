import prisma from "./lib/prismaClient";
import axios from "axios";
import sharp from "sharp";
import { redisClient } from "./redisConfig/redis";

async function fetchNextJob() {
  while (true) {
    const jobs = await redisClient.zRangeByScore("scheduled_jobs", 0, Date.now(), { LIMIT: { offset: 0, count: 1 } });
    if (jobs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Prevent busy waiting
      continue;
    }

    const jobId = jobs[0];
    const lockKey = `lock:${jobId}`;
    const lockAcquired = await redisClient.set(lockKey, "worker", { NX: true, EX: 60 });
    if (!lockAcquired) continue;

    await redisClient.zRem("scheduled_jobs", jobId);
    return jobId;
  }
}

async function processJobs() {
  console.log("Worker started");
  while (true) {
    const jobId = await fetchNextJob();
    console.log(jobId)
    if (!jobId) continue;

    try {
      const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: { visits: true },
      });

      if (!job || job.status !== "ongoing") continue;

      console.log(`Processing job: ${jobId}`);
      await processJob(jobId, job.visits);
    } finally {
      await redisClient.del(`lock:${jobId}`); // Release lock
    }
  }
}

async function processJob(jobId: string, visits: any) {
  try {
    for (const visit of visits) {
      try {
        const imagesToInsert = [];
        
        const imageUrls = await prisma.image.findMany({
          where: { visitId: visit.id },
          select: { url: true },
        });

        for (const { url: imageUrl } of imageUrls) {
          const cachedImage = await redisClient.get(`image:${imageUrl}`);

          let imageBuffer: Buffer;
          if (cachedImage) {
            imageBuffer = Buffer.from(cachedImage, "base64");
          } else {
            const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
            imageBuffer = response.data;
            await redisClient.set(`image:${imageUrl}`, imageBuffer.toString("base64"), { EX: 86400 });
          }

          const image = sharp(imageBuffer);
          const metadata = await image.metadata();
          const perimeter = 2 * (metadata.width! + metadata.height!);

          imagesToInsert.push({
            url: imageUrl,
            visitId: visit.id as number,
            perimeter,
          });
        }

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

processJobs();
