/**
 * The app icon, as drawn on Cute Matcha's Header card: a record in
 * `on-accent` with `grid` grooves and an `accent` label. Its `text` rim
 * disappears in Light Matcha and turns cream in Dark Matcha, so the record's
 * edge shows on either ground. public/favicon.svg is the light version.
 */
export const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle
      cx="20"
      cy="20"
      r="18"
      fill="var(--on-accent)"
      stroke="var(--text)"
      strokeWidth="1.5"
    />
    <circle
      cx="20"
      cy="20"
      r="13"
      fill="none"
      stroke="var(--grid)"
      strokeWidth="1"
    />
    <circle
      cx="20"
      cy="20"
      r="9"
      fill="none"
      stroke="var(--grid)"
      strokeWidth="1"
    />
    <circle
      cx="20"
      cy="20"
      r="6"
      fill="var(--accent)"
      stroke="var(--on-accent)"
      strokeWidth="1.5"
    />
    <circle cx="20" cy="20" r="1.5" fill="var(--on-accent)" />
  </svg>
);
