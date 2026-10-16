import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// Load these TypeScript modules without starting Next.js or connecting to services.
function loadTs(path, mocks = {}) {
  const filename = resolve(path);
  const localRequire = createRequire(filename);
  const { outputText } = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  });
  const loaded = { exports: {} };
  const require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : localRequire(name);
  new Function("require", "module", "exports", outputText)(require, loaded, loaded.exports);
  return loaded.exports;
}

const { signupSchema } = loadTs("schemas/auth.ts");
const passwordHelpers = loadTs("lib/auth/password.ts");
const validInput = {
  username: "  Test_User  ",
  password: "Example password 123",
  confirmPassword: "Example password 123",
};

test("signup rejects invalid fields and preserves password whitespace", () => {
  for (const input of [
    null,
    { ...validInput, username: "ab" },
    { ...validInput, username: "a".repeat(33) },
    { ...validInput, username: "bad name" },
    { ...validInput, username: { $ne: null } },
    { ...validInput, password: "short", confirmPassword: "short" },
    { ...validInput, password: "a".repeat(73), confirmPassword: "a".repeat(73) },
    { ...validInput, password: "\u{1F600}".repeat(19), confirmPassword: "\u{1F600}".repeat(19) },
    { ...validInput, confirmPassword: "different password" },
  ]) {
    assert.equal(signupSchema.safeParse(input).success, false);
  }
  const password = "  keep these spaces  ";
  assert.equal(signupSchema.parse({ ...validInput, password, confirmPassword: password }).password, password);
});

function makeRoute({ exists = false, createError = null, allowed = true, databaseError = null } = {}) {
  const calls = { connected: 0, hashed: 0, created: [], checked: [] };
  const { POST } = loadTs("app/api/auth/signup/route.ts", {
    "@/lib/db": { __esModule: true, default: async () => {
      calls.connected++;
      if (databaseError) throw databaseError;
    } },
    "@/lib/auth/password": { hashPassword: async (password) => {
      calls.hashed++;
      return passwordHelpers.hashPassword(password);
    } },
    "@/lib/ratelimit": { signupRateLimit: { limit: async () => ({ success: allowed, reset: Date.now() + 60000 }) } },
    "@/models/UserSchema": { User: {
      exists: async (query) => { calls.checked.push(query); return exists; },
      create: async (record) => {
        if (createError) throw createError;
        calls.created.push(record);
        return { ...record, _id: "test-user-id" };
      },
    } },
    "@/schemas/auth": { signupSchema },
  });
  const send = (body = validInput) => POST(new Request("http://localhost/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }));
  return { POST, send, calls };
}

test("signup saves a normalized username and bcrypt hash, returning no secrets", async () => {
  const { send, calls } = makeRoute();
  const response = await send();
  assert.equal(response.status, 201);
  assert.deepEqual(calls.checked, [{ username: "test_user" }]);
  assert.equal(calls.created.length, 1);
  assert.deepEqual(Object.keys(calls.created[0]).sort(), ["passwordHash", "username"]);
  assert.equal(await passwordHelpers.verifyPassword(validInput.password, calls.created[0].passwordHash), true);
  assert.equal(await passwordHelpers.verifyPassword("wrong password", calls.created[0].passwordHash), false);
  assert.deepEqual(await response.json(), { message: "Account created. You can now log in." });
});

test("invalid input and malformed JSON never reach the database", async () => {
  const { send, POST, calls } = makeRoute();
  assert.equal((await send({ ...validInput, confirmPassword: "no match" })).status, 400);
  assert.equal((await POST(new Request("http://localhost/api/auth/signup", { method: "POST", body: "{" }))).status, 400);
  assert.equal(calls.connected, 0);
  assert.equal(calls.hashed, 0);
});

test("existing usernames skip hashing and concurrent duplicates return 409", async () => {
  const existing = makeRoute({ exists: true });
  assert.equal((await existing.send()).status, 409);
  assert.equal(existing.calls.hashed, 0);
  assert.equal(existing.calls.created.length, 0);
  const concurrent = makeRoute({ createError: { code: 11000 } });
  assert.equal((await concurrent.send()).status, 409);
});

test("rate limits prevent database and bcrypt work", async () => {
  const { send, calls } = makeRoute({ allowed: false });
  const response = await send();
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get("Retry-After")) > 0);
  assert.equal(calls.connected, 0);
  assert.equal(calls.hashed, 0);
});

test("database failures return a safe error", async () => {
  const { send } = makeRoute({ databaseError: new Error("private database details") });
  const response = await send();
  assert.equal(response.status, 503);
  assert.equal((await response.text()).includes("private database details"), false);
});
