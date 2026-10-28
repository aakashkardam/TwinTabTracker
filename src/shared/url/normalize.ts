import type { NormalizeOptions } from '../types';
import { isRestrictedUrl } from './restricted';

export const DEFAULT_TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'utm_name',
  'gclid',
  'gbraid',
  'wbraid',
  'dclid',
  'fbclid',
  'igshid',
  'mc_cid',
  'mc_eid',
  'msclkid',
  'yclid',
  'twclid',
  'ttclid',
  '_hsenc',
  '_hsmi',
  'oly_anon_id',
  'oly_enc_id',
  'vero_id',
  'nr_email_referer',
]);

const UNRESERVED = /%[0-9a-fA-F]{2}/g;

export function isTrackingParam(name: string, extra: string[] = []): boolean {
  const lower = name.toLowerCase();
  if (lower.startsWith('utm_')) {
    return true;
  }
  if (DEFAULT_TRACKING_PARAMS.has(lower)) {
    return true;
  }
  return extra.some((item) => item.toLowerCase() === lower);
}

function decodeUnreserved(value: string): string {
  return value.replace(UNRESERVED, (match) => {
    const code = Number.parseInt(match.slice(1), 16);
    if (
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2d ||
      code === 0x2e ||
      code === 0x5f ||
      code === 0x7e
    ) {
      return String.fromCharCode(code);
    }
    return match.toLowerCase();
  });
}

function sortSearch(params: URLSearchParams): string {
  const items: Array<[string, string]> = [];
  params.forEach((value, key) => {
    items.push([key, value]);
  });
  items.sort((a, b) => {
    const keyCompare = a[0].localeCompare(b[0]);
    return keyCompare !== 0 ? keyCompare : a[1].localeCompare(b[1]);
  });
  return items
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function comparisonKey(url: string | null | undefined, options: NormalizeOptions): string {
  if (!url) {
    return 'missing:';
  }
  const trimmed = url.trim();
  if (!trimmed) {
    return 'missing:';
  }
  if (isRestrictedUrl(trimmed)) {
    return `restricted:${trimmed}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return `raw:${trimmed}`;
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  let port = parsed.port;
  if ((protocol === 'http:' && port === '80') || (protocol === 'https:' && port === '443')) {
    port = '';
  }

  const pathname = decodeUnreserved(parsed.pathname || '/');
  const params = new URLSearchParams(parsed.search);
  if (options.mode === 'smart' && options.stripTrackingParams) {
    const keys = new Set<string>();
    params.forEach((_value, key) => keys.add(key));
    for (const key of keys) {
      if (isTrackingParam(key, options.extraTrackingParams)) {
        params.delete(key);
      }
    }
  }

  const search = sortSearch(params);
  const hash =
    options.mode === 'smart' && options.ignoreFragment
      ? ''
      : parsed.hash === '#'
        ? ''
        : parsed.hash;
  const host = port ? `${hostname}:${port}` : hostname;
  return `${protocol}//${host}${pathname}${search ? `?${search}` : ''}${hash}`;
}

export function normalizeOptionsFromSettings(settings: {
  matchMode: NormalizeOptions['mode'];
  stripTrackingParams: boolean;
  extraTrackingParams: string[];
  ignoreFragmentInSmartMode: boolean;
}): NormalizeOptions {
  return {
    mode: settings.matchMode,
    stripTrackingParams: settings.stripTrackingParams,
    extraTrackingParams: settings.extraTrackingParams,
    ignoreFragment: settings.matchMode === 'smart' && settings.ignoreFragmentInSmartMode,
  };
}
