/* Marca do TalentCare: medidor (gauge) branco sobre âmbar — espelha o score do produto. */
export default function Logo({ size = 34, radius = 9 }: { size?: number; radius?: number }) {
  const rx = (radius / size) * 64
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="TalentCare" style={{ display: 'block', flex: 'none' }}>
      <defs>
        <linearGradient id="tc-logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7b733" />
          <stop offset="1" stopColor="#d98a15" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={rx} fill="url(#tc-logo-bg)" />
      <path d="M14 41 A18 18 0 0 1 50 41" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <line x1="32" y1="41" x2="41" y2="30" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="32" cy="41" r="4.5" fill="#fff" />
    </svg>
  )
}
