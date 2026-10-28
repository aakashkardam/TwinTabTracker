import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { setBrowserAdapterForTests } from '../shared/browser/runtime';
import { MemoryBrowser } from '../test/memory-browser';
import { DashboardApp } from './DashboardApp';

describe('dashboard', () => {
  it('navigates between implemented views', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Home', url: 'https://example.com', active: true },
      { id: 2, windowId: 1, index: 1, title: 'Home copy', url: 'https://example.com' },
    ];
    setBrowserAdapterForTests(browser);
    render(<DashboardApp />);
    expect(await screen.findByRole('heading', { name: 'Overview' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Duplicates' }));
    expect(await screen.findByRole('heading', { name: 'Duplicate tabs' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('Protect pinned tabs')).toBeInTheDocument();
  });
});
