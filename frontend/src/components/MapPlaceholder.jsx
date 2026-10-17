import './MapPlaceholder.css'

// Static stand-in for the real map (Leaflet / Google Maps goes here later).
// `children` are absolutely-positioned overlays (markers, search bar, legend).
export default function MapPlaceholder({ children, className = '' }) {
  return (
    <div className={`map ${className}`} role="img" aria-label="Map">
      <div className="map-grid" />
      {children}
    </div>
  )
}

// Marker positioned by percentage of the map box.
// type: "critical" | "moderate" | "team" | "pin"
export function MapMarker({ type, x, y, selected = false, dimmed = false, label, onClick }) {
  return (
    <button
      type="button"
      className={`map-marker map-marker-${type}${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
      style={{ left: `${x}%`, top: `${y}%` }}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
    />
  )
}
