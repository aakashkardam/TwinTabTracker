const RESTRICTED_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'chrome-search://',
  'chrome-devtools://',
  'devtools://',
  'edge://',
  'edge-extension://',
  'brave://',
  'opera://',
  'vivaldi://',
  'about:',
  'moz-extension://',
  'view-source:',
  'data:',
  'blob:',
  'javascript:',
];

export function isRestrictedUrl(url: string | null | undefined): boolean {
  if (!url) {
    return true;
  }
  const lower = url.trim().toLowerCase();
  if (!lower) {
    return true;
  }
  return RESTRICTED_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

export function isHttpFamilyUrl(url: string): boolean {
  const lower = url.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('file://');
}
