export function fuzzyMatch(query: string, text: string): number | null {
  if (query.length === 0) return 0;
  const needle = query.toLowerCase();
  const haystack = text.toLowerCase();

  let textIndex = 0;
  let score = 0;
  let previousMatch = -2;

  for (let queryIndex = 0; queryIndex < needle.length; queryIndex += 1) {
    const character = needle[queryIndex];
    const foundAt = haystack.indexOf(character, textIndex);
    if (foundAt === -1) return null;

    if (foundAt === previousMatch + 1) {
      score += 4;
    } else if (foundAt === 0) {
      score += 2;
    } else {
      score += 1;
    }

    const previousCharacter = foundAt > 0 ? text[foundAt - 1] : '';
    if (previousCharacter === '/' || previousCharacter === '-' || previousCharacter === '_' || previousCharacter === '.') {
      score += 2;
    }
    if (text[foundAt] === text[foundAt].toUpperCase() && text[foundAt] !== text[foundAt].toLowerCase()) {
      score += 1;
    }

    score -= Math.min(foundAt - textIndex, 4);
    textIndex = foundAt + 1;
    previousMatch = foundAt;
  }

  score -= Math.max(0, text.length - needle.length) / 100;
  return score;
}

export function fuzzyFilter<T>(items: T[], query: string, toText: (item: T) => string): T[] {
  if (query.trim().length === 0) return items.slice();

  const scored: { item: T; score: number; index: number }[] = [];
  items.forEach((item, index) => {
    const score = fuzzyMatch(query, toText(item));
    if (score !== null) scored.push({ item, score, index });
  });

  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  return scored.map((entry) => entry.item);
}
