export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 26 26" aria-hidden="true">
      <rect x="1" y="1" width="24" height="24" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-holds" />
      <path d="M6 18 L11 8 L15 14 L20 6" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-holds" />
      <circle cx="15" cy="14" r="2.1" className="fill-breaks" />
    </svg>
  );
}
