// Local, per-browser UI preferences. Never security-relevant, never sent to the server.

const KEY = 'floodops.preferences'

export const DEFAULT_PREFERENCES = {
  refreshSeconds: 30,
  layers: { incidents: true, teams: true, flood: true },
}

export const REFRESH_CHOICES = [15, 30, 60]

export function loadPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!saved || typeof saved !== 'object') return DEFAULT_PREFERENCES
    return {
      refreshSeconds: REFRESH_CHOICES.includes(saved.refreshSeconds)
        ? saved.refreshSeconds
        : DEFAULT_PREFERENCES.refreshSeconds,
      layers: { ...DEFAULT_PREFERENCES.layers, ...(saved.layers ?? {}) },
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function savePreferences(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs))
    return true
  } catch {
    return false
  }
}
