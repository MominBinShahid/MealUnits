declare const __APP_VERSION__: string;
declare const __BUILD_ID__: string;

/**
 * The two composition handlers, spelled LOWERCASE, because in Preact that is
 * not a style variant — the camelCase form does not work.
 *
 * `preact/src/diff/props.js` infers an event's real name by probing the DOM:
 * `if (lowerCaseName in dom) name = lowerCaseName.slice(2); else name =
 * name.slice(2)`. **Nothing exposes `oncompositionstart` as a property**, so the
 * probe fails and `onCompositionStart` registers a listener for the event type
 * `"CompositionStart"` — capital C — which nothing ever fires. No error, no
 * warning, a handler that is simply never called.
 *
 * Measured 2026-09-14 rather than assumed, because the first instinct was that
 * this was a jsdom gap and only jsdom's behaviour would need working around:
 *
 *   jsdom 30     'oncompositionstart' in <input>   false
 *   Chrome 152   'oncompositionstart' in <input>   false
 *                ... in document.body              false
 *                ... in window                     false
 *
 * Written all-lowercase the probe still fails, but `name.slice(2)` then yields
 * `compositionstart`, which is right. So the lowercase spelling is correct in
 * BOTH environments and the camelCase spelling is correct in neither.
 *
 * **This is known upstream and is not going to change in v10.** preactjs/preact
 * #3003 (opened 2021-02-11) names exactly these three handlers; it was closed
 * 2025-08-06 as a duplicate of #1978 with "will be fixed in v11". The
 * maintainer's position on the v10 behaviour is explicit: *"Preact has always
 * and will always support attaching event handlers with the exact casing
 * defined in the HTML/DOM specs. That is the lowercase variants all work."* So
 * the lowercase spelling below is the SUPPORTED form, not a workaround — what
 * is wrong is the camelCase JSX typing, and the issue says as much.
 *
 * **It generalises, and that is the part to carry forward.** The rule is not
 * about composition: ANY event whose `on*` property the DOM does not expose
 * takes the same path. #3003 names `focusin`, `focusout` and `beforeinput` in
 * the same breath. Before adding a handler for an event not already used here,
 * check `'on' + name in element` and spell it lowercase if that is false.
 *
 * Preact's own types declare only `onCompositionStart`, so the spelling that
 * works has to be declared here. Deliberately NOT a cast at the call site: a
 * cast would hide the one fact this block exists to record.
 *
 * See `TextInput` in `src/ui/components.tsx` for what depends on it, and
 * `docs/BACKLOG.md` T3's composition rule for why.
 */
declare namespace preact.JSX {
  interface HTMLAttributes<RefType extends EventTarget = EventTarget> {
    // `CompositionEventHandler<RefType>` rather than a bare `CompositionEvent`,
    // so these match the camelCase pair Preact already declares and
    // `event.currentTarget` is typed as the element rather than as EventTarget.
    oncompositionstart?: CompositionEventHandler<RefType> | undefined;
    oncompositionend?: CompositionEventHandler<RefType> | undefined;
  }
}
