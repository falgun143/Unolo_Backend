import express from "express";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import axios from "axios";
export const app = express();
import { v4 as uuidv4 } from "uuid";

import { Payload } from "./types/type.js";
const prisma = new PrismaClient();


app.post("/processJob", async (req: any, res: any) => {
  const payload: Payload = req.body;
  console.log(payload);

  // Basic Input Validation
  if (!("count" in payload) || !("visits" in payload)) {
    return res.status(400).send({ error: "Missing keys" });
  } else if (payload.count !== payload.visits.length) {
    return res
      .status(400)
      .send({ error: "Visits length should be equal to count" });
  }

  const jobId = uuidv4();
  const createdJob = await prisma.job.create({
    data: {
      id: jobId,
      status: "ongoing",
      visits: {
        create: payload.visits.map((visit) => ({
          store_id: visit.store_id,
          visit_time: visit.visit_time,
        })),
      },
    },
    include: {
      visits: true,
    },
  });
  console.log("Job processing started");

  const visitsWithImages = createdJob.visits.map((visit, index) => ({
    ...visit,
    image_url: payload.visits[index].image_url,
  }));
  console.log(visitsWithImages);

  res.status(201).send({ job_id: jobId });
  await processJob(jobId, visitsWithImages);
});

app.get("/api/status", async (req: any, res: any) => {
  const jobId = req.query.jobid as string;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      visits: {
        include: {
          images: true,
        },
      },
      error: true,
    },
  });

  if (!job) {
    return res.status(400).send({ error: "Job ID does not exist" });
  }

  if (job.status === "failed") {
    return res.status(400).send({
      status: job.status,
      job_id: job.id,
      error: job.error.map((err) => ({
        store_id: err.store_id,
        error: err.message,
      })),
    });
  }

  res.status(200).send({
    status: job.status,
    job_id: job.id,
  });
});

async function processJob(jobId: string, visits: any) {
    try {
      for (const visit of visits) {
        try {
          for (const imageUrl of visit.image_url) {
            const response = await axios.get(imageUrl, {
              responseType: "arraybuffer",
            });
            console.log(response.data);
  
            const image = await sharp(response.data);
            const metadata = await image.metadata();
            const perimeter = 2 * (metadata.width! + metadata.height!);
  
            await new Promise((resolve) =>
              setTimeout(resolve, Math.random() * 300 + 100)
            );
  
            await prisma.image.create({
              data: {
                url: imageUrl,
                perimeter,
                visit: {
                  connect: { id: visit.id },
                },
              },
            });
          }
        } catch (error) {
          await prisma.error.create({
            data: {
              store_id: visit.store_id,
              message: "Image download failed",
              job: {
                connect: { id: jobId },
              },
            },
          });
        }
      }
  
      const errorCount = await prisma.error.count({
        where: { jobId },
      });
  
      if (errorCount > 0) {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "failed" },
        });
      } else {
        await prisma.job.update({
          where: { id: jobId },
          data: { status: "completed" },
        });
      }
  
      console.log("Job processing completed");
    } catch (error) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "failed",
        },
      });
      await prisma.error.create({
        data: {
          store_id: "unknown",
          message: "Unexpected error occurred",
          job: {
            connect: { id: jobId },
          },
        },
      });
    }
  }
