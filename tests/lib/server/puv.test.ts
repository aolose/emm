import { describe, expect, test } from 'bun:test';

const cyrb53 = (str: string, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
};

const hashIP = (ip: string, seed?: number) => cyrb53(ip, seed || 0);

describe('hashIP', () => {
  test('same IP same hash', () => {
    expect(hashIP('1.1.1.1')).toBe(hashIP('1.1.1.1'));
  });
  test('diff IP diff hash', () => {
    expect(hashIP('1.1.1.1')).not.toBe(hashIP('1.1.1.2'));
  });
  test('empty works', () => {
    const h = hashIP('');
    expect(typeof h).toBe('string');
    expect(h.length).toBeGreaterThan(0);
  });
  test('base36', () => {
    expect(/^[a-z0-9]+$/.test(hashIP('10.0.0.1'))).toBe(true);
  });
});
