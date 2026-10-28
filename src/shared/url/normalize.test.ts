import { describe, expect, it } from 'vitest';
import { comparisonKey, isTrackingParam } from './normalize';
import { isRestrictedUrl } from './restricted';

const exact = {
  mode: 'exact' as const,
  stripTrackingParams: false,
  extraTrackingParams: [],
  ignoreFragment: false,
};

const smart = {
  mode: 'smart' as const,
  stripTrackingParams: true,
  extraTrackingParams: ['custom_track'],
  ignoreFragment: true,
};

describe('URL normalization', () => {
  it('lowercases hostnames and strips default ports', () => {
    expect(comparisonKey('HTTPS://Example.COM:443/Path', exact)).toBe('https://example.com/Path');
    expect(comparisonKey('http://example.com:80/', exact)).toBe('http://example.com/');
  });

  it('sorts query parameters without dropping meaningful values', () => {
    expect(comparisonKey('https://example.com/search?b=2&a=1', exact)).toBe(
      comparisonKey('https://example.com/search?a=1&b=2', exact),
    );
    expect(comparisonKey('https://example.com/search?q=shoes', exact)).not.toBe(
      comparisonKey('https://example.com/search?q=hats', exact),
    );
  });

  it('keeps fragments in exact mode and drops them in smart mode', () => {
    expect(comparisonKey('https://example.com/a#section', exact)).toContain('#section');
    expect(comparisonKey('https://example.com/a#section', smart)).toBe('https://example.com/a');
  });

  it('does not treat different article paths as duplicates', () => {
    expect(comparisonKey('https://news.example.com/a/1', exact)).not.toBe(
      comparisonKey('https://news.example.com/a/2', exact),
    );
  });

  it('strips known tracking parameters only in smart mode', () => {
    const tracked = 'https://example.com/item?id=9&utm_source=news&fbclid=abc';
    const clean = 'https://example.com/item?id=9';
    expect(comparisonKey(tracked, exact)).not.toBe(comparisonKey(clean, exact));
    expect(comparisonKey(tracked, smart)).toBe(comparisonKey(clean, smart));
  });

  it('strips extra configured tracking parameters in smart mode', () => {
    expect(comparisonKey('https://example.com/?id=1&custom_track=x', smart)).toBe('https://example.com/?id=1');
  });

  it('treats malformed and missing URLs safely', () => {
    expect(comparisonKey('', exact)).toBe('missing:');
    expect(comparisonKey('not a url', exact)).toBe('raw:not a url');
  });

  it('identifies restricted browser URLs', () => {
    expect(isRestrictedUrl('chrome://extensions')).toBe(true);
    expect(isRestrictedUrl('about:blank')).toBe(true);
    expect(isRestrictedUrl('https://example.com')).toBe(false);
    expect(isTrackingParam('utm_campaign')).toBe(true);
    expect(isTrackingParam('id')).toBe(false);
  });

  it('decodes unreserved percent-encoding', () => {
    expect(comparisonKey('https://example.com/%7Euser', exact)).toBe('https://example.com/~user');
  });
});
