import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

function loadTs(path, mocks = {}) {
  const filename = resolve(path);
  const localRequire = createRequire(filename);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  new Function("require", "module", "exports", outputText)(
    (name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const passwordHelpers = loadTs("lib/auth/password.ts");
const schemas = loadTs("schemas/auth.ts");
const originHelpers = loadTs("lib/auth/request.ts");
const password = "Example password 123";
const passwordHash = await passwordHelpers.hashPassword(password);

function makeLogin({ user = { _id: "user-123", passwordHash }, allowed = true, failSession = false, failDb = false } = {}) {
  const calls = { sessions: [], passwords: 0, connected: 0, queries: [], selections: [] };
  const route = loadTs("app/api/auth/login/route.ts", {
    "@/lib/db": { __esModule: true, default: async () => {
      calls.connected++;
      if (failDb) throw new Error("Private connection details");
    } },
    "@/lib/auth/password": { verifyPassword: async (...args) => {
      calls.passwords++;
      return passwordHelpers.verifyPassword(...args);
    } },
    "@/lib/auth/session": { createSession: async (id) => {
      if (failSession) throw new Error("Session unavailable");
      calls.sessions.push(id);
    } },
    "@/lib/auth/request": originHelpers,
    "@/lib/ratelimit": { loginRateLimit: { limit: async () => ({ success: allowed, reset: Date.now() + 60000 }) } },
    "@/models/UserSchema": { User: { findOne: (query) => {
      calls.queries.push(query);
      return { select: async (selection) => { calls.selections.push(selection); return user; } };
    } } },
    "@/schemas/auth": schemas,
  });
  const send = (body = { username: "  Jaimz  ", password }, origin = "http://localhost") => route.POST(new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  }));
  return { ...route, send, calls };
}

test("valid credentials create a session without returning user secrets", async () => {
  const helper = makeLogin();
  const response = await helper.send();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { message: "Logged in." });
  assert.deepEqual(helper.calls.queries, [{ username: "jaimz" }]);
  assert.deepEqual(helper.calls.selections, ["+passwordHash"]);
  assert.deepEqual(helper.calls.sessions, ["user-123"]);
});

test("unknown users and wrong passwords return the same error and never create sessions", async () => {
  const missing = makeLogin({ user: null });
  const incorrect = makeLogin();
  const response1 = await missing.send();
  const response2 = await incorrect.send({ username: "jaimz", password: "wrong password" });
  assert.equal(response1.status, 401);
  assert.equal(response2.status, 401);
  assert.deepEqual(await response1.json(), await response2.json());
  assert.equal(missing.calls.passwords, 1);
  assert.equal(incorrect.calls.passwords, 1);
  assert.equal(missing.calls.sessions.length, 0);
  assert.equal(incorrect.calls.sessions.length, 0);
});

test("rate limits block database and bcrypt work", async () => {
  const helper = makeLogin({ allowed: false });
  const response = await helper.send();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
  assert.equal(helper.calls.connected, 0);
  assert.equal(helper.calls.passwords, 0);
});

test("cross-origin, invalid input, and malformed JSON do not reach the database", async () => {
  const helper = makeLogin();
  assert.equal((await helper.send(undefined, "https://another-site.example")).status, 403);
  for (const body of [null, {}, { username: { $ne: null }, password }, { username: "jaimz", password: "a".repeat(73) }]) {
    assert.equal((await helper.send(body)).status, 400);
  }
  const response = await helper.POST(new Request("http://localhost/api/auth/login", { method: "POST", body: "{" }));
  assert.equal(response.status, 400);
  assert.equal(helper.calls.connected, 0);
});

test("database and session failures return a safe service error", async () => {
  for (const options of [{ failDb: true }, { failSession: true }]) {
    const helper = makeLogin(options);
    const response = await helper.send();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Login is temporarily unavailable. Please try again later." });
    assert.equal(helper.calls.sessions.length, 0);
  }
});

test("logout calls session revocation and rejects cross-origin requests", async () => {
  let revoked = 0;
  const { POST } = loadTs("app/api/auth/logout/route.ts", {
    "@/lib/auth/session": { deleteSession: async () => { revoked++; } },
    "@/lib/auth/request": originHelpers,
  });
  const request = (origin) => new Request("http://localhost/api/auth/logout", {
    method: "POST", headers: { Origin: origin },
  });
  assert.equal((await POST(request("https://another-site.example"))).status, 403);
  assert.equal(revoked, 0);
  const response = await POST(request("http://localhost"));
  assert.equal(response.status, 200);
  assert.equal(revoked, 1);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("logout failures do not claim the user was logged out", async () => {
  const { POST } = loadTs("app/api/auth/logout/route.ts", {
    "@/lib/auth/session": { deleteSession: async () => { throw new Error("Private details"); } },
    "@/lib/auth/request": originHelpers,
  });
  const response = await POST(new Request("http://localhost/api/auth/logout", { method: "POST" }));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Couldn't log out. Please try again." });
});
