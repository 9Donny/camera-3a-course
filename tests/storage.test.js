import { test } from "node:test";
import assert from "node:assert/strict";
import { Storage } from "../assets/js/storage.js";

function makeFakeLocalStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    _store: store,
  };
}

test("Storage.set serializes and prefixes the key", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  s.set("progress", { currentDay: 3 });
  assert.equal(ls._store.get("camera3a:progress"), '{"currentDay":3}');
});

test("Storage.get parses JSON and returns default when missing", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  assert.deepEqual(s.get("progress", { currentDay: 1 }), { currentDay: 1 });
  s.set("progress", { currentDay: 5 });
  assert.deepEqual(s.get("progress", null), { currentDay: 5 });
});

test("Storage.get returns default when JSON is corrupt", () => {
  const ls = makeFakeLocalStorage();
  ls.setItem("camera3a:bad", "{not json");
  const s = new Storage(ls);
  assert.equal(s.get("bad", "fallback"), "fallback");
});

test("Storage.remove deletes the prefixed key", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  s.set("x", 1);
  s.remove("x");
  assert.equal(ls._store.has("camera3a:x"), false);
});

test("Storage.set returns false and warns on backend error", (t) => {
  const throwingBackend = {
    getItem: () => null,
    setItem: () => { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; },
    removeItem: () => {},
  };
  const warns = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warns.push(args);
  t.after(() => { console.warn = originalWarn; });

  const s = new Storage(throwingBackend);
  const result = s.set("x", { big: "data" });
  assert.equal(result, false);
  assert.equal(warns.length, 1);
  assert.match(warns[0][0], /Storage\.set/);
});

test("Storage.set returns true on success", () => {
  const ls = makeFakeLocalStorage();
  const s = new Storage(ls);
  assert.equal(s.set("x", 1), true);
});
