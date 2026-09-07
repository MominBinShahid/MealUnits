/**
 * The whole DOM layer: seven functions, no framework (§11.1).
 *
 * **Nothing here sets `innerHTML`.** Not as defence-in-depth about the app's own
 * values, but because §7.7.1 had to add an escaping rule to the readable export
 * the moment that file started rendering free text into markup, and the same
 * three values — §6.7's dosing note, §1.3's `basalName` and §1.3's
 * `basalTiming` — reach these screens too. `textContent` makes the rule
 * unnecessary rather than enforced.
 */

export type Child = Node | string | null | undefined | false;

export interface Attrs {
  readonly class?: string;
  readonly id?: string;
  readonly type?: string;
  readonly role?: string;
  readonly inputmode?: string;
  readonly autocomplete?: string;
  readonly value?: string;
  readonly disabled?: boolean;
  readonly hidden?: boolean;
  readonly lang?: string;
  readonly 'aria-label'?: string;
  readonly 'aria-live'?: string;
  readonly 'aria-hidden'?: string;
  readonly 'aria-pressed'?: string;
  readonly 'aria-describedby'?: string;
  readonly 'data-step'?: string;
  // The stable identity a text field keeps across a rebuild of the tree.
  // Without it a re-rendered input is a DIFFERENT element and focus has nowhere
  // to return to. Values are internal constants, never user input. See
  // `captureFocus`.
  readonly 'data-field'?: string;
  readonly onclick?: (event: Event) => void;
  readonly oninput?: (event: Event) => void;
  // No `style`. §11.5's policy is `style-src 'self'`, which blocks the inline
  // attribute, and a helper that offers it invites a rule violation that only
  // shows up as a silently unstyled element in production.
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (key === 'onclick') {
      node.addEventListener('click', value as EventListener);
      continue;
    }
    if (key === 'oninput') {
      node.addEventListener('input', value as EventListener);
      continue;
    }
    if (key === 'class') {
      node.className = String(value);
      continue;
    }
    if (key === 'disabled' || key === 'hidden') {
      if (value === true) node.setAttribute(key, '');
      continue;
    }
    node.setAttribute(key, String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

/** A button, because §10.7's touch targets and keyboard focus are not optional. */
export function button(
  label: Child,
  onClick: () => void,
  attrs: Attrs = {},
): HTMLButtonElement {
  return h('button', { ...attrs, type: 'button', onclick: () => { onClick(); } }, label);
}

export function replaceChildren(target: Element, ...children: Child[]): void {
  target.replaceChildren();
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    target.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/**
 * §10.4 — never wrap between a number and its unit. The rule is enforced here
 * rather than hoped for in a stylesheet: `10Units` has been misread as 100, and
 * a line break between them produces exactly that reading.
 */
export function quantity(text: string): HTMLElement {
  return h('span', { class: 'qty' }, text);
}

/**
 * Focus, caret and scroll do not survive `replaceChildren`, and that is a real
 * defect rather than a cosmetic one: typing `150` into a settings field
 * produced `1`, because the element being typed into was destroyed after the
 * first character and focus fell to `<body>`, where keystrokes 2 and 3 went
 * nowhere. A field below the fold additionally threw the page back to the top —
 * `scrollY` measured 600 before one keystroke and 27 after.
 *
 * THIS IS A PATCH, AND IT IS THE WEAK KIND OF FIX. It holds only while every
 * render path remembers to capture and restore — which is exactly the shape
 * §11.3 rejected when it chose IndexedDB over Web Locks: "it only works if
 * every writer takes the lock, and a single path that forgets restores the race
 * with no error." The construction-grade answer is keyed reconciliation, which
 * preserves node identity by algorithm rather than by discipline. That is
 * `docs/BACKLOG.md` T3, and this function is meant to be deleted when it lands.
 *
 * Confined to ONE call site inside `render()` for that reason: one place to
 * remember, and one place to remove.
 */
export interface FocusMemory {
  /** The `data-field` of the focused text input, or null if none was focused. */
  readonly field: string | null;
  /** Caret start and end, so a restore cannot silently move the cursor. */
  readonly start: number | null;
  readonly end: number | null;
  /** Vertical scroll, restored only when the view is the same one. */
  readonly scrollY: number;
}

export function captureFocus(root: ParentNode, scrollY: number): FocusMemory {
  const active = (root as Element).ownerDocument?.activeElement ?? null;
  // Only text inputs carry a caret worth preserving, and only a field with a
  // stable identity can be found again after the rebuild.
  if (!(active instanceof HTMLInputElement)) {
    return { field: null, start: null, end: null, scrollY };
  }
  const field = active.getAttribute('data-field');
  if (field === null) return { field: null, start: null, end: null, scrollY };
  return {
    field,
    start: active.selectionStart,
    end: active.selectionEnd,
    scrollY,
  };
}

/**
 * `sameView` decides the scroll half: restoring scroll after a NAVIGATION would
 * strand the user part-way down a screen they have not seen, so it is restored
 * only when the render redrew the same view.
 */
export function restoreFocus(
  root: ParentNode,
  memory: FocusMemory,
  sameView: boolean,
  scrollTo: (y: number) => void,
): void {
  const target =
    memory.field === null ? null : root.querySelector(`[data-field="${memory.field}"]`);

  if (target instanceof HTMLInputElement) {
    // `preventScroll`, so restoring focus cannot itself move the page.
    target.focus({ preventScroll: true });
    // The caret matters as much as the focus. Restoring focus but dropping the
    // cursor to position 0 turns `150` into `051` — a WRONG NUMBER rather than
    // an irritation, which is the worse failure of the two.
    if (memory.start !== null && memory.end !== null) {
      target.setSelectionRange(memory.start, memory.end);
    }
  }

  // LAST, so nothing above can move it again.
  if (sameView) {
    if (memory.scrollY > 0) scrollTo(memory.scrollY);
    return;
  }
  // A NEW view starts at the top. The browser keeps the old offset across a
  // rebuild, so opening "How this works" from part-way down the settings screen
  // dropped the reader into the middle of a page they had not seen — they had
  // to scroll UP to find the beginning. Every screen reached from settings had
  // it. Nothing restores scroll on navigation; the omission was having no
  // branch here at all.
  if (memory.scrollY > 0) scrollTo(0);
}
