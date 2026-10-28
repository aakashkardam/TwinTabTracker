export function hostnameFromUrl(url: string | null | undefined): string {
  if (!url) {
    return '';
  }
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function displayHost(url: string | null | undefined): string {
  const host = hostnameFromUrl(url);
  if (host) {
    return host;
  }
  if (!url) {
    return 'Unavailable';
  }
  const trimmed = url.trim();
  const schemeBreak = trimmed.indexOf(':');
  if (schemeBreak > 0) {
    return trimmed.slice(0, schemeBreak);
  }
  return 'Unknown page';
}
