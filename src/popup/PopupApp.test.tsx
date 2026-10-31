import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { setBrowserAdapterForTests } from '../shared/browser/runtime';
import { MemoryBrowser } from '../test/memory-browser';
import { PopupApp } from './PopupApp';

describe('popup', () => {
  it('renders summary states and search results', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Docs', url: 'https://example.com/docs', active: true },
      { id: 2, windowId: 1, index: 1, title: 'Docs copy', url: 'https://example.com/docs' },
      { id: 3, windowId: 1, index: 2, title: 'Other', url: 'https://example.com/other' },
    ];
    setBrowserAdapterForTests(browser);
    render(<PopupApp />);
    expect(await screen.findByText('TwinTabTracker')).toBeInTheDocument();
    expect(await screen.findByText('Duplicates')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Park this tab' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search open tabs'), 'other');
    expect(await screen.findByText('Other')).toBeInTheDocument();
  });

  it('can skip the first-run tour', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [{ id: 1, windowId: 1, index: 0, title: 'One', url: 'https://example.com/1', active: true }];
    setBrowserAdapterForTests(browser);
    render(<PopupApp />);
    expect(await screen.findByLabelText('First-run tour')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('First-run tour')).not.toBeInTheDocument();
    });
  });

  it('shows an empty duplicate state when all URLs are unique', async () => {
    const browser = new MemoryBrowser();
    browser.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'One', url: 'https://example.com/1', active: true },
    ];
    setBrowserAdapterForTests(browser);
    render(<PopupApp />);
    expect(await screen.findByText(/No duplicates right now/i)).toBeInTheDocument();
  });
});
