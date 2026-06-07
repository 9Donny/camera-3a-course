// sync.js 主要逻辑测试 —— 离线测试合并算法（不真连坚果云）
import { test } from "node:test";
import assert from "node:assert/strict";

// 在 Node 里给 sync.js 提供它需要的环境
// 这里我们不直接 import sync.js（它会启动 hook 影响其他测试）
// 而是把核心合并逻辑单独验证

// 模拟合并：本地 vs 远端，按 mtime 决定胜者
function merge(local, remote) {
  const localData = local.data;
  const localMtimes = local.keyMtimes;
  const remoteData = remote.data;
  const remoteMtimes = remote.keyMtimes;
  const merged = { ...localData };
  const newMtimes = { ...localMtimes };
  let updated = 0;
  for (const [k, v] of Object.entries(remoteData)) {
    const lm = localMtimes[k] || 0;
    const rm = remoteMtimes[k] || 0;
    if (rm > lm || !(k in localData)) {
      merged[k] = v;
      newMtimes[k] = rm || Date.now();
      updated += 1;
    }
  }
  return { merged, mtimes: newMtimes, updated };
}

test("merge: remote-newer keys overwrite local", () => {
  const local = {
    data: { progress: { day: 5 }, notes: { "day-01": "old" } },
    keyMtimes: { progress: 100, notes: 100 },
  };
  const remote = {
    data: { progress: { day: 8 }, notes: { "day-01": "old" } },
    keyMtimes: { progress: 200, notes: 100 },
  };
  const r = merge(local, remote);
  assert.deepEqual(r.merged.progress, { day: 8 });
  assert.deepEqual(r.merged.notes, { "day-01": "old" });
  assert.equal(r.updated, 1);
});

test("merge: local-newer keys preserved", () => {
  const local = {
    data: { progress: { day: 12 } },
    keyMtimes: { progress: 500 },
  };
  const remote = {
    data: { progress: { day: 8 } },
    keyMtimes: { progress: 200 },
  };
  const r = merge(local, remote);
  assert.deepEqual(r.merged.progress, { day: 12 });
  assert.equal(r.updated, 0);
});

test("merge: keys only on remote are added", () => {
  const local = {
    data: { progress: { day: 5 } },
    keyMtimes: { progress: 100 },
  };
  const remote = {
    data: { progress: { day: 5 }, flashcards: [{ id: "x" }] },
    keyMtimes: { progress: 100, flashcards: 200 },
  };
  const r = merge(local, remote);
  assert.deepEqual(r.merged.flashcards, [{ id: "x" }]);
  assert.equal(r.updated, 1);
});

test("merge: keys only on local are preserved", () => {
  const local = {
    data: { progress: { day: 5 }, ttsPrefs: { rate: 1.5 } },
    keyMtimes: { progress: 100, ttsPrefs: 50 },
  };
  const remote = {
    data: { progress: { day: 5 } },
    keyMtimes: { progress: 100 },
  };
  const r = merge(local, remote);
  assert.deepEqual(r.merged.ttsPrefs, { rate: 1.5 });
  assert.equal(r.updated, 0);
});

test("merge: equal mtime → local wins (no update)", () => {
  const local = {
    data: { x: "local" },
    keyMtimes: { x: 100 },
  };
  const remote = {
    data: { x: "remote" },
    keyMtimes: { x: 100 },
  };
  const r = merge(local, remote);
  assert.equal(r.merged.x, "local");
});
