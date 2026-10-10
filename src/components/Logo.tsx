export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="18" fill="#2f3b34" />
      <circle cx="20" cy="20" r="13" fill="none" stroke="#4e6152" strokeWidth="1" />
      <circle cx="20" cy="20" r="9" fill="none" stroke="#4e6152" strokeWidth="1" />
      <circle cx="20" cy="20" r="6" fill="#dde87e" stroke="#2f3b34" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="1.5" fill="#2f3b34" />
    </svg>
  );
}
