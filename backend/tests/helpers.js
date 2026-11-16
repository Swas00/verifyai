const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const net = require("net");
const mongoose = require("mongoose");

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Spawns a throwaway local mongod (no download, uses the installed binary).
async function startMongo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verifyai-test-mongo-"));
  const port = await freePort();
  const proc = spawn("mongod", ["--dbpath", dir, "--port", String(port), "--bind_ip", "127.0.0.1"], { stdio: "ignore" });
  const uri = `mongodb://127.0.0.1:${port}/verifyai_test`;
  for (let i = 0; i < 50; i++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 500 });
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  if (mongoose.connection.readyState !== 1) throw new Error("test mongod failed to start");
  return {
    async stop() {
      await mongoose.disconnect();
      proc.kill();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

// Stub of the ml-service /analyze endpoint.
async function startMlStub(handler) {
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      const { status, body } = handler(req);
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    });
  });
  await new Promise((r) => server.listen(0, r));
  return { url: `http://127.0.0.1:${server.address().port}`, stop: () => new Promise((r) => server.close(r)) };
}

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);

module.exports = { startMongo, startMlStub, JPEG };
