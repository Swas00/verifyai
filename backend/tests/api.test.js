process.env.JWT_SECRET = "test-secret";
process.env.LOGIN_RATE_LIMIT = "1000";
const test = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const bcrypt = require("bcrypt");
const { startMongo, startMlStub, JPEG } = require("./helpers");

let mongo, ml, app, Officer, Case, token;
const ANALYSIS = { risk: { level: "LOW", score: 7 }, face: { match: true } };

test.before(async () => {
  mongo = await startMongo();
  ml = await startMlStub(() => ({ status: 200, body: ANALYSIS }));
  process.env.ML_SERVICE_URL = ml.url;
  app = require("../app");
  Officer = require("../models/Officer");
  Case = require("../models/Case");
  await Officer.create({ name: "T", email: "t@x.io", passwordHash: await bcrypt.hash("pw12345", 4), role: "officer" });
});

test.after(async () => {
  await ml.stop();
  await mongo.stop();
});

const screen = (tok, doc = JPEG, selfie = JPEG, ct = "image/jpeg") =>
  request(app)
    .post("/api/screening/screen")
    .set("Authorization", `Bearer ${tok}`)
    .attach("document", doc, { filename: "d.jpg", contentType: ct })
    .attach("selfie", selfie, { filename: "s.jpg", contentType: "image/jpeg" });

test("login: rejects missing fields, bad creds; accepts good creds", async () => {
  await request(app).post("/api/auth/login").send({}).expect(400);
  await request(app).post("/api/auth/login").send({ email: "t@x.io", password: "nope" }).expect(401);
  await request(app).post("/api/auth/login").send({ email: "no@x.io", password: "pw12345" }).expect(401);
  const res = await request(app).post("/api/auth/login").send({ email: "T@X.io", password: "pw12345" }).expect(200);
  assert.ok(res.body.token);
  token = res.body.token;
});

test("protected routes require a valid token", async () => {
  await request(app).get("/api/cases").expect(401);
  await request(app).get("/api/cases").set("Authorization", "Bearer garbage").expect(401);
  await request(app).get("/api/audit/verify").expect(401);
  await request(app).post("/api/screening/screen").expect(401);
});

test("screening: missing files -> 400, non-image mimetype -> 415, fake image bytes -> 415", async () => {
  await request(app).post("/api/screening/screen").set("Authorization", `Bearer ${token}`).expect(400);
  await screen(token, JPEG, JPEG, "application/pdf").expect(415);
  await screen(token, Buffer.from("not an image at all"), JPEG).expect(415);
});

test("screening: stores cases as a valid hash chain", async () => {
  await screen(token).expect(201);
  const second = await screen(token).expect(201);
  assert.strictEqual(second.body.case.riskScore, 7);
  const v = await request(app).get("/api/audit/verify").set("Authorization", `Bearer ${token}`).expect(200);
  assert.deepStrictEqual(v.body, { valid: true, checked: 2 });
});

test("cases: list paginates, detail 404s on unknown id", async () => {
  const list = await request(app).get("/api/cases?limit=1").set("Authorization", `Bearer ${token}`).expect(200);
  assert.strictEqual(list.body.cases.length, 1);
  assert.strictEqual(list.body.total, 2);
  assert.strictEqual(list.body.pages, 2);
  const id = list.body.cases[0]._id;
  await request(app).get(`/api/cases/${id}`).set("Authorization", `Bearer ${token}`).expect(200);
  await request(app).get("/api/cases/64b000000000000000000000").set("Authorization", `Bearer ${token}`).expect(404);
});

test("verifyChain detects a tampered record and a deleted record", async () => {
  const cases = await Case.find().sort({ createdAt: 1, _id: 1 });
  await Case.collection.updateOne({ _id: cases[0]._id }, { $set: { riskScore: 99 } });
  let v = await request(app).get("/api/audit/verify").set("Authorization", `Bearer ${token}`).expect(200);
  assert.strictEqual(v.body.valid, false);
  assert.strictEqual(v.body.position, 0);
  assert.strictEqual(String(v.body.brokenAt), String(cases[0]._id));

  await Case.collection.updateOne({ _id: cases[0]._id }, { $set: { riskScore: 7 } });
  await Case.collection.deleteOne({ _id: cases[0]._id });
  v = await request(app).get("/api/audit/verify").set("Authorization", `Bearer ${token}`).expect(200);
  assert.strictEqual(v.body.valid, false);
  assert.match(v.body.reason, /prevHash/);
});

test("ML service error surfaces as 502", async () => {
  await ml.stop();
  ml = await startMlStub(() => ({ status: 422, body: { detail: "bad" } }));
  process.env.ML_SERVICE_URL = ml.url;
  // routes read ML_SERVICE_URL at require time; assert via a fresh load
  delete require.cache[require.resolve("../routes/screening")];
  delete require.cache[require.resolve("../app")];
  const app2 = require("../app");
  const res = await request(app2)
    .post("/api/screening/screen")
    .set("Authorization", `Bearer ${token}`)
    .attach("document", JPEG, { filename: "d.jpg", contentType: "image/jpeg" })
    .attach("selfie", JPEG, { filename: "s.jpg", contentType: "image/jpeg" });
  assert.strictEqual(res.status, 502);
});
