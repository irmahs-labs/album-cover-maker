/**
 * The app icon, as drawn on Cute Matcha's Header card: a record with a
 * dark disc, grid grooves and a lime label, in fixed Light Matcha colours
 * that don't change with the theme, as a favicon's can't. Its `text` rim
 * disappears in Light Matcha and turns cream in Dark Matcha, so the record's
 * edge shows on either header. public/favicon.svg is the same drawing.
 */
export const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle
      cx="20"
      cy="20"
      r="18"
      fill="#2f3b34"
      stroke="var(--text)"
      strokeWidth="1.5"
    />
    <circle
      cx="20"
      cy="20"
      r="13"
      fill="none"
      stroke="#4e6152"
      strokeWidth="1"
    />
    <circle
      cx="20"
      cy="20"
      r="9"
      fill="none"
      stroke="#4e6152"
      strokeWidth="1"
    />
    <circle
      cx="20"
      cy="20"
      r="6"
      fill="#dde87e"
      stroke="#2f3b34"
      strokeWidth="1.5"
    />
    <circle cx="20" cy="20" r="1.5" fill="#2f3b34" />
  </svg>
);
