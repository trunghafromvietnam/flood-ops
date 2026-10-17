// Small inline SVG icons drawn for FloodOps (no external icon assets).

export function DropLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M20 3 C20 3 7 17 7 25 C7 32.2 12.8 37 20 37 C27.2 37 33 32.2 33 25 C33 17 20 3 20 3 Z"
        fill="#1d6fe0"
      />
      <path
        d="M14 26 C14 29.5 16.5 32 20 32"
        stroke="#fff"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

export function PhoneIcon({ size = 100, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M22 10 C14 10 8 18 10 30 C14 58 42 86 70 90 C82 92 90 86 90 78 L90 70 C90 66 87 63 83 62 L70 59 C66 58 62 60 60 63 L56 69 C44 63 37 56 31 44 L37 40 C40 38 42 34 41 30 L38 17 C37 13 34 10 30 10 Z"
        fill={color}
      />
    </svg>
  )
}

export function StarIcon({ size = 34, color = 'var(--blue)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <path
        d="M50 5 L61 38 L95 38 L67 58 L78 92 L50 72 L22 92 L33 58 L5 38 L39 38 Z"
        fill={color}
      />
    </svg>
  )
}
