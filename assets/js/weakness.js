export function categorizeModules(summary) {
  const out = {};
  for (const [k, v] of Object.entries(summary)) {
    let bucket;
    if (v.total === 0) bucket = "untested";
    else if (v.accuracy >= 0.8) bucket = "mastered";
    else if (v.accuracy >= 0.6) bucket = "partial";
    else bucket = "urgent";
    out[k] = { ...v, bucket };
  }
  return out;
}

export function recommendReview(summary, moduleIndex, subtopicWrongCounts = {}) {
  const cat = categorizeModules(summary);
  const recs = [];
  for (const [module, info] of Object.entries(cat)) {
    if (info.bucket === "urgent") {
      const m = moduleIndex[module];
      if (!m) continue;
      recs.push({
        module,
        title: m.title ?? module,
        days: m.days ?? [],
        reason: "正确率低于 60%",
      });
    } else if (info.bucket === "partial") {
      const m = moduleIndex[module];
      if (!m) continue;
      const subtopics = Object.entries(m.subtopics ?? {})
        .map(([name, days]) => ({ name, days, wrong: subtopicWrongCounts[name] ?? 0 }))
        .filter(s => s.wrong > 0)
        .sort((a, b) => b.wrong - a.wrong)
        .slice(0, 3);
      if (subtopics.length > 0) {
        recs.push({
          module,
          title: m.title ?? module,
          subtopics,
          reason: "正确率 60-80%，建议复习错题最多的子主题",
        });
      } else {
        recs.push({
          module,
          title: m.title ?? module,
          days: m.days ?? [],
          reason: "正确率 60-80%，建议整模块复习",
        });
      }
    }
  }
  return recs;
}
