export function listLabels(labels: Array<string | null | undefined>, limit = 3): string {
  const clean = labels.map((item) => item?.trim()).filter((item): item is string => Boolean(item));
  if (clean.length === 0) {
    return '';
  }
  if (clean.length === 1) {
    return clean[0] ?? '';
  }
  if (clean.length === 2) {
    return `${clean[0]} and ${clean[1]}`;
  }
  if (clean.length <= limit) {
    return `${clean.slice(0, -1).join(', ')}, and ${clean[clean.length - 1]}`;
  }
  return `${clean.slice(0, limit).join(', ')}, and ${clean.length - limit} more`;
}

export function undoWillReopen(closed: Array<{ title: string | null; url: string | null }>): string {
  const names = listLabels(closed.map((item) => item.title || item.url));
  return names ? `Undo will reopen ${names}.` : 'Undo will reopen the tabs from the last cleanup.';
}

export function reopenedMessage(
  count: number,
  closed: Array<{ title: string | null; url: string | null }>,
): string {
  if (count <= 0) {
    return 'Nothing was reopened.';
  }
  const names = listLabels(closed.map((item) => item.title || item.url));
  if (count === 1) {
    return names ? `Reopened 1 tab: ${names}.` : 'Reopened 1 tab.';
  }
  return names ? `Reopened ${count} tabs: ${names}.` : `Reopened ${count} tabs.`;
}
