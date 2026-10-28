import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setBrowserAdapterForTests } from '../shared/browser/runtime';

afterEach(() => {
  cleanup();
  setBrowserAdapterForTests(null);
});
