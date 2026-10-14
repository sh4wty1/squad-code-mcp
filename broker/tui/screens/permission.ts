// The modal of a permission request. For now, the preview of the command it would run, which
// the keys scroll.

// How many lines of the preview the modal shows, and the width of each one
export const PREVIEW_ROWS = 8;
const PREVIEW_COLS = 70;

// The lines of the preview of `text`: each line of the text in pieces of 70 characters, the
// first with the number of its line and each continuation with none. An empty line is one
// line with no text, and so is an empty text. Ported from `preLines` of the prototype.
export function preview(text: string): { n: number | null; t: string }[] {
  return text.split("\n").flatMap((line, i) => {
    const chars = [...line];
    if (!chars.length) return [{ n: i + 1, t: "" }];
    const pieces = [];
    for (let k = 0; k < chars.length; k += PREVIEW_COLS) pieces.push({ n: k ? null : i + 1, t: chars.slice(k, k + PREVIEW_COLS).join("") });
    return pieces;
  });
}
