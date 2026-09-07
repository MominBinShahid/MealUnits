// §20.4's app icon, as geometry rather than a drawing:
//   the IDF blue circle, ring r32.5 at stroke 17, solid inner disc r20.5,
//   H reversed out. The mark reviewed as "3b".
//
// A filled aperture was rejected — it destroys the open ring that is the
// symbol. A disc past r22 was rejected because the gap then falls under one
// device pixel at launcher size and renders as a filled centre whatever the
// artwork says.
//
// Pantone 279 C is the blue circle's colour in the IDF's own style guide.
// PLAN.md names the geometry and not the hex, so this is the one value here
// that is a choice rather than a specification.
export const IDF_BLUE = '#418FDE';

export function icon({ maskable = false, background = null } = {}) {
  // A maskable icon is cropped to whatever shape the launcher wants, so the mark
  // has to sit inside the safe zone: a centred circle of 80% of the canvas's
  // diameter. That is the constraint. **0.62 was not the constraint, it was
  // timidity** — Momin reported the installed icon on Android looked small, and
  // he was right: Android's home screen uses the MASKABLE icon, so the 1.17 on
  // the `any` icon never reached it.
  //
  // The arithmetic. The ring's outer edge sits 41 from the centre at scale 1, so
  // the mark spans 82. The safe circle has radius 40, which permits up to
  // 40/41 = 0.9756. At 0.62 the mark spanned 50.8 of 100 — it could be HALF
  // AGAIN as large and still never clip. 0.94 spans 77.1 with an outer radius of
  // 38.5, inside 40 with room for rasterisation rounding.
  //
  // Why the earlier comment was wrong: it worried about "the squircle", but every
  // launcher mask is LARGER than the safe circle. Fitting the circle is
  // sufficient for all of them, so the squircle was never the binding limit.
  //
  // The `any` icon is not cropped, and it was still reading smaller than the
  // icons beside it at 1.0 — the mark spans 82 of 100 there, because the ring's
  // outer edge sits 41 from the centre.
  //
  // 1.17 takes the span to 96, leaving a 2% margin. It is safe BECAUSE THE MARK
  // IS A CENTRED CIRCLE: a rounded-corner mask (iOS's ~22% radius, Android's
  // squircle) removes area at the CORNERS, and a circle's extremes sit at the
  // middle of each edge, which no corner rounding reaches. A square mark could
  // not be pushed this far.
  const scale = maskable ? 0.94 : 1.17;
  const bg = background
    ? `<rect width="100" height="100" fill="${background}"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  ${bg}
  <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">
    <circle cx="50" cy="50" r="32.5" fill="none" stroke="${IDF_BLUE}" stroke-width="17"/>
    <circle cx="50" cy="50" r="20.5" fill="${IDF_BLUE}"/>
    <path d="M41.5 38.5 h6 v8.5 h5 v-8.5 h6 v23 h-6 v-8.5 h-5 v8.5 h-6 z" fill="#ffffff"/>
  </g>
</svg>`;
}
