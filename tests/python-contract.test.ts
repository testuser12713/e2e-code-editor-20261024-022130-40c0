import { describe, expect, it } from 'vitest';

import { DEMO_ROOT, platform } from '../src/platform';
import { runActivePython, stopPythonRun } from '../src/python/runPython';

const DESKTOP_MESSAGE = 'Running Python requires the desktop application.';

describe('python bridge fallback', () => {
  it('answers run with the desktop-only refusal instead of throwing', async () => {
    await expect(platform.python.run('reports/inventory_report.py')).resolves.toEqual({
      ok: false,
      message: DESKTOP_MESSAGE,
    });
  });

  it('answers stop with the desktop-only refusal instead of throwing', async () => {
    await expect(platform.python.stop('run-1')).resolves.toEqual({
      ok: false,
      message: DESKTOP_MESSAGE,
    });
  });

  it('answers check with the structured desktop-only refusal', async () => {
    await expect(platform.python.check('reports/inventory_report.py')).resolves.toEqual({
      ok: false,
      kind: 'rejected',
      message: DESKTOP_MESSAGE,
    });
  });

  it('reports no interpreter in the browser', async () => {
    await expect(platform.python.interpreter()).resolves.toEqual({ found: false });
  });

  it('subscribes without delivering events and returns a no-op unsubscribe', () => {
    let called = false;
    const unsubscribe = platform.python.onEvent(() => {
      called = true;
    });

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(called).toBe(false);
  });
});

describe('python renderer actions', () => {
  it('exports the run and stop actions as inert promises', async () => {
    await expect(runActivePython()).resolves.toBeUndefined();
    await expect(stopPythonRun()).resolves.toBeUndefined();
  });
});

describe('python demo workspace', () => {
  it('lists the Python sample entry', async () => {
    await platform.workspace.openFolder(DEMO_ROOT);
    const files = await platform.quickOpen.listFiles();

    expect(files).toContain('reports/inventory_report.py');
  });

  it('reads the Python sample script from the demo workspace', async () => {
    const result = await platform.files.read('reports/inventory_report.py');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.language).toBe('Python');
    expect(result.content).toContain('import math');
    expect(result.content).toContain('def load_shipments');
    expect(result.content).toContain('def main');
    expect(result.content).toContain('print(');
    expect(result.content).toContain('if __name__ == "__main__":');
  });
});
