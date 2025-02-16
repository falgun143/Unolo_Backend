import cluster from "cluster";
import os from "os";
import { app } from "./express-app.js";

const port = 3000;
const serverWorkers = 2

if (cluster.isPrimary) {
  for (let i = 0; i < serverWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Starting a new worker.`);
    cluster.fork();
  });
} else {
  app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });
}