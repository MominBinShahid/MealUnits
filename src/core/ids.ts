/**
 * Row identifiers, generated without requiring a secure context.
 *
 * WHY THIS FILE EXISTS. The three call sites here used `crypto.randomUUID()`,
 * which is **secure-context only**. On `localhost` it exists, so every test —
 * unit, integration, headless-browser smoke — passed. On the phone, reaching
 * the app over `http://192.168.1.40`, it is `undefined`:
 *
 *   TypeError: crypto.randomUUID is not a function
 *
 * The commit promise rejected, nothing appeared on screen, and "Log this
 * injection" did nothing at all. Everything else in the app worked, because
 * nothing else needed it. Momin reported it three times and it looked like the
 * §18.14 back-navigation defect returning; it was never the same bug.
 *
 * `crypto.getRandomValues` has NO secure-context requirement — only
 * `randomUUID` and `crypto.subtle` do — so this builds the same v4 shape from
 * it. That removes the dependency rather than branching on it: a branch would
 * mean the insecure path stays the one nobody exercises.
 */

import {
  HEX_RADIX,
  UUID_BYTES,
  UUID_GROUPS,
  UUID_HEX_PAIR,
  UUID_LOW_NIBBLE,
  UUID_VARIANT_BYTE,
  UUID_VARIANT_MASK,
  UUID_VARIANT_RFC,
  UUID_VERSION_4,
  UUID_VERSION_BYTE,
} from '../config.js';

/** A v4 UUID as text. Shape and randomness match `crypto.randomUUID`. */
export function newId(): string {
  const bytes = new Uint8Array(UUID_BYTES);
  crypto.getRandomValues(bytes);
  // The version and variant bits RFC 4122 fixes. Without them this is a random
  // string that merely looks like a UUID, which would be a quiet lie in an
  // exported file that other software may read.
  // Stryker disable next-line LogicalOperator: `?? 0` is UNREACHABLE. `bytes` is
  // a `Uint8Array(16)` created three lines above and index 6 is always in
  // bounds, so the nullish branch cannot be taken — the guard exists only
  // because `noUncheckedIndexedAccess` types the read as possibly undefined.
  // Mutating `??` to `&&` yields 0, and `0 & 0x0f | 0x40` still sets version 4,
  // so the id remains a well-formed v4 UUID: no assertion about SHAPE can see
  // the difference, and the only observable loss is entropy in one byte out of
  // sixteen. §13.4's disabled-mutant rule applies — named, with the reason at
  // the line, never a lowered threshold.
  bytes[UUID_VERSION_BYTE] = ((bytes[UUID_VERSION_BYTE] ?? 0) & UUID_LOW_NIBBLE) | UUID_VERSION_4;
  // Stryker disable next-line LogicalOperator: the same, for index 8.
  bytes[UUID_VARIANT_BYTE] = ((bytes[UUID_VARIANT_BYTE] ?? 0) & UUID_VARIANT_MASK) | UUID_VARIANT_RFC;

  const hex = [...bytes].map((byte) => byte.toString(HEX_RADIX).padStart(UUID_HEX_PAIR, '0'));
  let at = 0;
  return UUID_GROUPS.map((size) => hex.slice(at, (at += size)).join('')).join('-');
}
