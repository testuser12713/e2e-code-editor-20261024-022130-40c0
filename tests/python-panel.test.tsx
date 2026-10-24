// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { PythonPanel } from '../src/shell/PythonPanel';

afterEach(() => {
  cleanup();
});

describe('python output panel frame', () => {
  it('renders as the python-output-panel region of the editor', () => {
    render(<PythonPanel />);

    const panel = screen.getByTestId('python-panel');
    expect(panel.tagName).toBe('SECTION');
    expect(panel.getAttribute('data-od-id')).toBe('python-output-panel');
    expect(panel.getAttribute('aria-label')).toBe('Python output');
    expect(screen.getByRole('region', { name: 'Python output' })).toBe(panel);
  });

  it('contains an inert output log', () => {
    render(<PythonPanel />);

    const output = screen.getByRole('log', { name: 'Python output' });
    expect(output.getAttribute('aria-live')).toBe('polite');
    expect(output.textContent).toBe('');
  });

  it('renders every control disabled', () => {
    render(<PythonPanel />);

    for (const testId of ['python-run', 'python-check', 'python-clear']) {
      expect((screen.getByTestId(testId) as HTMLButtonElement).disabled).toBe(true);
    }
  });
});
