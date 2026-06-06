const VALID_SECTION_TYPES = new Set(["concept", "procedure", "example", "recap"]);
const VALID_QUIZ_TYPES = new Set(["choice", "fill", "short"]);
const VALID_QUIZ_SCOPES = new Set(["daily", "weekly", "monthly"]);

export function validateDay(day) {
  const errors = [];
  for (const f of ["id", "week", "module", "title", "estimatedMinutes", "sections", "references", "dailyQuizId"]) {
    if (day[f] === undefined) errors.push(`day missing field: ${f}`);
  }
  if (Array.isArray(day.sections)) {
    day.sections.forEach((s, i) => {
      if (!s.id) errors.push(`section[${i}] missing id`);
      if (!VALID_SECTION_TYPES.has(s.type)) errors.push(`section[${i}] invalid type: ${s.type}`);
      if (!s.title) errors.push(`section[${i}] missing title`);
      if (typeof s.content !== "string") errors.push(`section[${i}] content must be string`);
    });
  }
  return { ok: errors.length === 0, errors };
}

export function validateQuiz(quiz) {
  const errors = [];
  for (const f of ["id", "module", "scope", "questions"]) {
    if (quiz[f] === undefined) errors.push(`quiz missing field: ${f}`);
  }
  if (!VALID_QUIZ_SCOPES.has(quiz.scope)) errors.push(`invalid scope: ${quiz.scope}`);
  if (Array.isArray(quiz.questions)) {
    quiz.questions.forEach((q, i) => {
      if (!q.id) errors.push(`q[${i}] missing id`);
      if (!VALID_QUIZ_TYPES.has(q.type)) errors.push(`q[${i}] invalid type`);
      if (!q.prompt) errors.push(`q[${i}] missing prompt`);
      if (q.type === "choice") {
        if (!Array.isArray(q.options)) errors.push(`q[${i}] choice missing options`);
        else if (!q.options.includes(q.answer)) errors.push(`q[${i}] answer not in options`);
      }
      if (q.type === "fill" && q.answer === undefined) errors.push(`q[${i}] fill missing answer`);
      if (q.type === "short" && !q.referenceAnswer) errors.push(`q[${i}] short missing referenceAnswer`);
    });
  }
  return { ok: errors.length === 0, errors };
}

export function validateCurriculum(c) {
  const errors = [];
  if (!Array.isArray(c.weeks) || c.weeks.length !== 8) errors.push(`expect 8 weeks, got ${c.weeks?.length}`);
  if (!Array.isArray(c.days)) errors.push(`days must be an array`);
  if (Array.isArray(c.days) && c.days.length > 60) errors.push(`days length cannot exceed 60`);
  return { ok: errors.length === 0, errors };
}
