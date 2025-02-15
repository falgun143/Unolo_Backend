import express from "express";
import prisma from "./lib/prismaClient";
import { v4 as uuidv4 } from "uuid";
import { redisClient } from "./redisConfig/redis";
import { Payload } from "./types/type";

export const app = express();

app.use(express.json());

let request = 0;

// Endpoint to create a new job
app.post("/processJob", async (req: any, res: any) => {
  const payload: Payload = req.body;

  // Basic Input Validation
  if (!("count" in payload) || !("visits" in payload)) {
    return res.status(400).send({ error: "Missing keys" });
  } else if (payload.count !== payload.visits.length) {
    return res
      .status(400)
      .send({ error: "Visits length should be equal to count" });
  }

  try {
    let visits = payload.visits;
    console.log("Visits are", visits);
    if (!visits || visits.length === 0) {
      return res.status(400).json({ error: "No visits provided" });
    }

    const jobId = uuidv4();
     await prisma.job.create({
      data: {
        id: jobId,
        status: "ongoing",
        visits: {
          create: visits.map((visit: any) => ({
            store_id: visit.store_id,
            visit_time: visit.visit_time,
            images: {
              create: visit.image_url.map((url: string) => ({
                url,
              })),
            },
          })),
        },
      },
      include: {
        visits: true,
      },
    });

    // Add job to Redis queue for processing
    await redisClient.zAdd("scheduled_jobs", [
      { score: Date.now(), value: jobId },
    ]);
    console.log(`Job ${request} scheduled for processing`);

    res
      .status(200)
      .json({ job_id: jobId, message: "Job scheduled for processing" });
    request++;
  } catch (error) {
    console.error("Error processing job:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Endpoint to get job status
app.get("/api/status/:jobId", async (req: any, res: any) => {
  try {
    const { jobId } = req.params;
    const job = await prisma.job.findUnique({ where: { id: jobId } });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.status(200).json({ job_id: jobId, status: job.status });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});
