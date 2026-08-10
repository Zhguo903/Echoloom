const textOf = (value) => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') return String(value.zh || value.en || '');
  return '';
};

function tokens(value) {
  const normalized = textOf(value).toLowerCase().normalize('NFKC');
  const latin = normalized.match(/[a-z0-9]{2,}/g) || [];
  const hanRuns = normalized.match(/[\p{Script=Han}]+/gu) || [];
  const han = hanRuns.flatMap((run) => {
    const chars = [...run];
    const parts = [...chars];
    for (let index = 0; index < chars.length - 1; index += 1) parts.push(chars[index] + chars[index + 1]);
    return parts;
  });
  return new Set([...latin, ...han]);
}

function memoryDate(memory) {
  const time = Date.parse(memory.updated_at || memory.created_at || memory.createdAt || '');
  return Number.isFinite(time) ? time : 0;
}

export function retrieveMemories(query, memories = [], limit = 6) {
  const queryTokens = tokens(query);
  return memories
    .filter((memory) => memory && memory.obsolete !== true && textOf(memory.content || memory.text).trim())
    .map((memory, index) => {
      const memoryTokens = tokens(memory.content || memory.text);
      let overlap = 0;
      for (const token of queryTokens) if (memoryTokens.has(token)) overlap += token.length > 1 ? 2 : 1;
      const importance = Number(memory.importance ?? memory.emotionalIntensity ?? (memory.pinned ? 8 : 5));
      const recency = memoryDate(memory);
      return { memory, score: overlap * 10 + Math.max(0, Math.min(10, importance)) + (memory.pinned ? 5 : 0), recency, index };
    })
    .sort((left, right) => right.score - left.score || right.recency - left.recency || left.index - right.index)
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 6)))
    .map(({ memory }) => ({
      id: String(memory.id || ''),
      content: textOf(memory.content || memory.text).slice(0, 500),
      memoryType: String(memory.memory_type || memory.memoryType || memory.type || 'relationship').slice(0, 40),
      importance: Math.max(1, Math.min(10, Number(memory.importance ?? memory.emotionalIntensity ?? 5))),
      source: textOf(memory.source).slice(0, 160),
      branchId: String(memory.branch_id || memory.branchId || 'root').slice(0, 80)
    }));
}

