import cluster from "cluster";
import os from "os";
import { app } from "./express-app.js";

const port = 3000;
const cpuCount = os.cpus().length;

if (cluster.isPrimary) {
  // Creating a worker for each CPU
  for (let i = 0; i < cpuCount; i++) {
    cluster.fork();
  }
} else {
  app.listen(port, () => {
    console.log("listening on port 3000");
  });
}

cluster.on("exit", (worker, code, signal) => {
  console.log(`worker ${worker.process.pid} died`);
  console.log("Starting a new worker");
  cluster.fork();
});