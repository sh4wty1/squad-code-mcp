// Every glyph outside ASCII the screens draw. The buffer gives each one a single cell;
// `bun tui/probe.ts` checks that against the terminal.
export const GLYPHS = [
  // status, feed and marks
  "⚠", "⟳", "●", "○", "◌", "✓", "✗", "▶", "▲", "▼", "◀", "‖", "·", "…", "›", "≈", "→", "×", "−", "–", "—", "≤", "≠", "↔", "⇧", "↑", "↓", "█",
  // boxes and edges
  "─", "│", "┌", "┐", "└", "┘", "├", "┤", "┼", "━", "┃", "┏", "┓", "┗", "┛",
];
