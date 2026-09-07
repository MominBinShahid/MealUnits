import { describe, expect, it } from 'vitest';
import { newId } from '../src/core/ids.js';

describe('row identifiers, without a secure context', () => {
  /**
   * The defect: `crypto.randomUUID()` is secure-context only. Every test passed
   * on localhost and "Log this injection" did nothing on a phone reaching the
   * app over a LAN address, because the commit threw before writing.
   */
  it('does not touch crypto.randomUUID, which does not exist on a plain http origin', () => {
    const original = Reflect.get(crypto, 'randomUUID') as unknown;
    // Remove it, exactly as an insecure context does, and require a real id.
    Reflect.deleteProperty(crypto, 'randomUUID');
    try {
      expect(newId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    } finally {
      if (original !== undefined) Reflect.set(crypto, 'randomUUID', original);
    }
  });

  it('sets the version and variant bits, so it is a v4 UUID and not a lookalike', () => {
    // The exported record may be read by other software, and a string that
    // merely resembles a UUID would be a quiet lie about its own format.
    for (let i = 0; i < 200; i++) {
      const id = newId();
      expect(id[14]).toBe('4');
      expect('89ab').toContain(id[19]);
    }
  });

  it('and does not repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(newId());
    expect(seen.size).toBe(2000);
  });
});
