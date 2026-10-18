// FloodOps official emblem ([Image #3] rescue hand clutching lifebuoy) + wordmark.

export default function Logo({ size = 30, withText = true, className = '' }) {
  return (
    <span className={`logo ${className}`.trim()}>
      <img
        src="/assets/logo.png"
        alt="FloodOps Rescue Emblem"
        width={size}
        height={size}
        className="logo-mark"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 2px 4px rgba(10, 37, 64, 0.12))',
        }}
      />
      {withText && <span className="logo-text">FloodOps</span>}
    </span>
  )
}

