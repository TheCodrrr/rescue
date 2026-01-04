import { spawn } from "child_process";

// Start complaint worker
const worker = spawn("node", ["queues/complaintWorker.js"], {
  stdio: "inherit",
  env: process.env,
});

// Start main server
const server = spawn("node", ["src/index.js"], {
  stdio: "inherit",
  env: process.env,
});

// Handle exits
worker.on("exit", (code) => {
  console.log(`Complaint Worker exited with code ${code}`);
});
server.on("exit", (code) => {
  console.log(`Main Server exited with code ${code}`);
});
