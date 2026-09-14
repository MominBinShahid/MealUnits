/**
 * Deliberate violations, one per rule this project pins. NOT application code:
 * nothing imports this, so nothing bundles it.
 *
 * `eslint.config.js` ignores this directory, so `npm run lint` never sees it.
 * `test/lint-config.test.ts` lints it anyway, with ignoring switched off, and
 * asserts every rule below actually reports. See that file for why.
 *
 * It lives under `src/` and not `test/` because that is the only place the
 * rules under test apply: §11.8's selectors are scoped to `src/**`, and the
 * `test/**` block turns `no-magic-numbers` off. A fixture in `test/` would be
 * exercising a different configuration from the one that protects the app.
 */

import { useState } from 'preact/hooks';

/** §11.8 — a numeric literal outside src/config.ts. */
export const MAGIC = 7;

/** §11.5 — the inline style attribute, which a `style-src 'self'` policy drops. */
export function InlineStyle(): preact.JSX.Element {
  return <div style="color: red" />;
}

/** §7.7.1 — free text rendered as markup. */
export function Danger(): preact.JSX.Element {
  return <div dangerouslySetInnerHTML={{ __html: 'x' }} />;
}

/** §11.1 — scheduled hook state, against the synchronous render contract. */
export function Scheduled(): preact.JSX.Element {
  const [n] = useState(0);
  return <b>{n}</b>;
}

/** §5.3 — toFixed rounds the binary value. */
export function Rounded(value: number): string {
  return value.toFixed(2);
}

/** §4.2 — prefix parsing accepts "20g" and "0x10". */
export function Prefix(text: string): number {
  return parseFloat(text) + parseInt(text, 10);
}

/** Loose equality, which §4.1's four states cannot survive. */
export function Loose(a: unknown, b: unknown): boolean {
  return a == b;
}

/** The rules of hooks: a hook behind a condition reads the wrong slot. */
export function Conditional(flag: boolean): preact.JSX.Element {
  if (flag) {
    const [x] = useState(0);
    return <b>{x}</b>;
  }
  return <b />;
}

/** jsx-a11y: an image with no alt text. */
export function NoAlt(): preact.JSX.Element {
  return <img src="x.png" />;
}

/** react/jsx-key: a list element with no key. */
export function NoKey(items: readonly string[]): preact.JSX.Element {
  return <ul>{items.map((item) => <li>{item}</li>)}</ul>;
}
