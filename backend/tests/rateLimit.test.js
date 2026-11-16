process.env.JWT_SECRET = "test-secret";
process.env.LOGIN_RATE_LIMIT = "3";
const test = require("node:test");
const request = require("supertest");

test("login is rate limited after N attempts", async () => {
  const app = require("../app");
  for (let i = 0; i < 3; i++) {
    // no DB needed: missing fields returns 400 before any query
    await request(app).post("/api/auth/login").send({}).expect(400);
  }
  await request(app).post("/api/auth/login").send({}).expect(429);
});
