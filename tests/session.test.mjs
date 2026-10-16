import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

function makeSessionHelpers({ user = { _id: "user-123", username: "jaimz" }, cookieFails = false, databaseFails = false } = {}) {
  const jar = new Map();
  const records = [];
  const calls = { cookies: [], connections: 0, userSelections: [] };
  const mocks = {
    "next/headers": { cookies: async () => ({
      get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined,
      set: (name, value, options) => {
        if (cookieFails) throw new Error("Cookie write failed");
        calls.cookies.push({ name, value, options });
        if (options.maxAge === 0) jar.delete(name);
        else jar.set(name, value);
      },
    }) },
    "@/lib/db": { __esModule: true, default: async () => {
      calls.connections++;
      if (databaseFails) throw new Error("Database unavailable");
    } },
    "@/models/SessionSchema": { Session: {
      create: async (data) => {
        const record = { ...data, _id: String(records.length + 1) };
        records.push(record);
        return record;
      },
      findOne: (query) => ({ select: () => ({ lean: async () => records.find(
        (record) => record.tokenHash === query.tokenHash && record.expiresAt > query.expiresAt.$gt,
      ) ?? null }) }),
      deleteOne: async (query) => {
        const index = records.findIndex((record) => query._id
          ? record._id === query._id : record.tokenHash === query.tokenHash);
        if (index !== -1) records.splice(index, 1);
      },
    } },
    "@/models/UserSchema": { User: {
      findById: () => ({ select: (selection) => {
        calls.userSelections.push(selection);
        return { lean: async () => user };
      } }),
    } },
  };
  const filename = resolve("lib/auth/session.ts");
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
  return { ...loaded.exports, jar, records, calls };
}

test("creates a seven-day session with only the token hash stored in the database", async () => {
  const helper = makeSessionHelpers();
  const started = Date.now();
  await helper.createSession("user-123");
  const cookie = helper.calls.cookies[0];
  const record = helper.records[0];
  assert.match(cookie.value, /^[a-f0-9]{64}$/);
  assert.equal(record.tokenHash, createHash("sha256").update(cookie.value).digest("hex"));
  assert.notEqual(record.tokenHash, cookie.value);
  assert.equal(record.userId, "user-123");
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.path, "/");
  assert.equal(cookie.options.secure, process.env.NODE_ENV === "production");
  assert.equal(cookie.options.expires.getTime(), record.expiresAt.getTime());
  const duration = record.expiresAt.getTime() - started;
  assert.ok(duration >= 7 * 86400000 && duration < 7 * 86400000 + 2000);
  await helper.createSession("user-123");
  assert.notEqual(helper.calls.cookies[1].value, cookie.value);
});

test("production sessions use secure cookies", async () => {
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    const helper = makeSessionHelpers();
    await helper.createSession("user-123");
    assert.equal(helper.calls.cookies[0].options.secure, true);
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
});

test("returns only public user details for a valid session", async () => {
  const helper = makeSessionHelpers({ user: { _id: "user-123", username: "jaimz", passwordHash: "private" } });
  await helper.createSession("user-123");
  assert.deepEqual(await helper.getCurrentUser(), { id: "user-123", username: "jaimz" });
  assert.deepEqual(helper.calls.userSelections, ["_id username"]);
});

test("missing or malformed cookies require no database lookup", async () => {
  const helper = makeSessionHelpers();
  assert.equal(await helper.getCurrentUser(), null);
  helper.jar.set("lnnk_session", "invalid-token");
  assert.equal(await helper.getCurrentUser(), null);
  assert.equal(helper.calls.connections, 0);
});

test("unknown, expired, and deleted-user sessions never authenticate", async () => {
  const helper = makeSessionHelpers();
  helper.jar.set("lnnk_session", "a".repeat(64));
  assert.equal(await helper.getCurrentUser(), null);
  await helper.createSession("user-123");
  helper.records[0].expiresAt = new Date(Date.now() - 1);
  assert.equal(await helper.getCurrentUser(), null);
  const missingUser = makeSessionHelpers({ user: null });
  await missingUser.createSession("user-123");
  assert.equal(await missingUser.getCurrentUser(), null);
});

test("logout revokes the session even if the old cookie is replayed", async () => {
  const helper = makeSessionHelpers();
  await helper.createSession("user-123");
  const token = helper.jar.get("lnnk_session");
  await helper.deleteSession();
  assert.equal(helper.records.length, 0);
  assert.equal(helper.jar.has("lnnk_session"), false);
  assert.equal(helper.calls.cookies.at(-1).options.maxAge, 0);
  helper.jar.set("lnnk_session", token);
  assert.equal(await helper.getCurrentUser(), null);
});

test("logout leaves another device's session intact", async () => {
  const helper = makeSessionHelpers();
  await helper.createSession("user-123");
  const otherDevice = helper.jar.get("lnnk_session");
  await helper.createSession("user-123");
  await helper.deleteSession();
  assert.equal(helper.records.length, 1);
  helper.jar.set("lnnk_session", otherDevice);
  assert.deepEqual(await helper.getCurrentUser(), { id: "user-123", username: "jaimz" });
});

test("logout safely clears missing and malformed cookies", async () => {
  const helper = makeSessionHelpers();
  await helper.deleteSession();
  helper.jar.set("lnnk_session", "invalid-token");
  await helper.deleteSession();
  assert.equal(helper.jar.size, 0);
  assert.equal(helper.calls.connections, 0);
});

test("cookie-write failures remove newly created session records", async () => {
  const helper = makeSessionHelpers({ cookieFails: true });
  await assert.rejects(helper.createSession("user-123"), /Cookie write failed/);
  assert.equal(helper.records.length, 0);
});

test("database failures cannot create cookies or authenticate a user", async () => {
  const helper = makeSessionHelpers({ databaseFails: true });
  await assert.rejects(helper.createSession("user-123"), /Database unavailable/);
  assert.equal(helper.calls.cookies.length, 0);
  helper.jar.set("lnnk_session", "a".repeat(64));
  await assert.rejects(helper.getCurrentUser(), /Database unavailable/);
});
