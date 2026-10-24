import { describe, expect, it } from 'vitest';

import { bottomAlignedScrollTop, wholeRowListHeight } from '../src/ui/Palette';

const ROW_HEIGHT = 36;
const GROUP_HEIGHT = 26.5;
const PADDING = 6;
const MAX_HEIGHT = 390;

type Span = { top: number; bottom: number };

function buildRows(groups: number[]): Span[] {
  const rows: Span[] = [];
  let cursor = PADDING;
  for (const size of groups) {
    cursor += GROUP_HEIGHT;
    for (let index = 0; index < size; index += 1) {
      rows.push({ top: cursor, bottom: cursor + ROW_HEIGHT });
      cursor += ROW_HEIGHT;
    }
  }
  return rows;
}

const COMMAND_GROUPS = [4, 2, 4, 3, 4, 2];
const ROWS = buildRows(COMMAND_GROUPS);

describe('palette list row sizing', () => {
  it('reproduces the defect: the design height cuts through the next row', () => {
    const viewport = MAX_HEIGHT - PADDING;
    const crossing = ROWS.find((row) => row.top < viewport && row.bottom > viewport);

    expect(crossing).toBeTruthy();
    expect(viewport - crossing!.top).toBeGreaterThan(0);
    expect(crossing!.bottom - viewport).toBeGreaterThan(0);
  });

  it('caps the list on a whole row instead of the raw maximum', () => {
    const height = wholeRowListHeight(ROWS, MAX_HEIGHT, PADDING);

    expect(height).not.toBeNull();
    expect(height!).toBeLessThanOrEqual(MAX_HEIGHT);
    const contentBottom = height! - PADDING;
    expect(ROWS.some((row) => Math.abs(row.bottom - contentBottom) < 0.01)).toBe(true);
    expect(ROWS.some((row) => row.top < contentBottom && row.bottom > contentBottom)).toBe(false);
  });

  it('returns null when no complete entry fits the allowed height', () => {
    expect(wholeRowListHeight(ROWS, GROUP_HEIGHT + PADDING + 4, PADDING)).toBeNull();
  });
});

describe('palette bottom-aligned scrolling', () => {
  const height = wholeRowListHeight(ROWS, MAX_HEIGHT, PADDING)!;
  const viewport = height - PADDING;
  const maxScroll = ROWS[ROWS.length - 1].bottom + PADDING - height;

  it('leaves the list alone when the marked row is already visible', () => {
    const next = bottomAlignedScrollTop(ROWS, viewport, 0, ROWS[0], maxScroll);

    expect(next).toBe(0);
  });

  it('scrolls down so the marked row is visible and the bottom is a row boundary', () => {
    const target = ROWS[10];
    const next = bottomAlignedScrollTop(ROWS, viewport, 0, target, maxScroll);

    expect(target.top).toBeGreaterThanOrEqual(next - 0.01);
    expect(target.bottom).toBeLessThanOrEqual(next + viewport + 0.01);
    expect(ROWS.some((row) => Math.abs(row.bottom - (next + viewport)) < 0.01)).toBe(true);
  });

  it('scrolls up minimally while keeping the bottom on a row boundary', () => {
    const target = ROWS[2];
    const next = bottomAlignedScrollTop(ROWS, viewport, maxScroll, target, maxScroll);

    expect(next).toBeLessThan(maxScroll);
    expect(target.top).toBeGreaterThanOrEqual(next - 0.01);
    expect(target.bottom).toBeLessThanOrEqual(next + viewport + 0.01);
    expect(ROWS.some((row) => Math.abs(row.bottom - (next + viewport)) < 0.01)).toBe(true);
  });

  it('ends on the last row when scrolled to the end of the list', () => {
    const target = ROWS[ROWS.length - 1];
    const next = bottomAlignedScrollTop(ROWS, viewport, maxScroll, target, maxScroll);

    expect(next).toBeLessThanOrEqual(maxScroll + 0.01);
    expect(target.bottom).toBeLessThanOrEqual(next + viewport + 0.01);
    expect(
      ROWS.some((row) => Math.abs(row.bottom - (next + viewport)) < 0.01) ||
        Math.abs(ROWS[ROWS.length - 1].bottom + PADDING - (next + viewport)) < 0.01,
    ).toBe(true);
  });
});
