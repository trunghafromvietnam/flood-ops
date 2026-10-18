// Shared operations state: operating mode, live backend data, simulation/replay
// snapshots, and actions. Views read `dataset` and never fetch lists themselves.
//
// Integrity rules enforced here:
//  - LIVE data comes only from the backend. A failed request shows an error and
//    keeps the last good data marked stale; it never falls back to the scenario.
//  - SIMULATION / REPLAY data comes only from demo/scenario.js and is read-only:
//    nothing done in those modes is sent to the backend.

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import * as api from '../api/floodops.js'
import { intakeEvents, sortEventsNewestFirst } from '../lib/derive.js'
import { SCENARIO, buildSnapshot, initialReplay, replayReducer } from '../demo/scenario.js'
import { getValidFloodObservations } from '../demo/droneObservations.js'
import { loadPreferences, savePreferences } from './preferences.js'

export const MODES = ['LIVE', 'SIMULATION', 'REPLAY']
const HEALTH_INTERVAL_MS = 30000
const REPLAY_STEP_MS = 2500

const OpsContext = createContext(null)

export function useOps() {
  const value = useContext(OpsContext)
  if (!value) throw new Error('useOps must be used inside <OpsDataProvider>')
  return value
}

function useNow(intervalMs) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

function useLiveBackend(enabled, pollMs) {
  const [state, setState] = useState({
    incidents: [],
    loaded: false,
    loading: false,
    error: null,
    lastSuccess: null,
  })
  const [health, setHealth] = useState({ state: 'unknown', checkedAt: null, lastOkAt: null })
  const inFlight = useRef(null)

  const loadIncidents = useCallback(async () => {
    inFlight.current?.abort()
    const controller = new AbortController()
    inFlight.current = controller
    setState((s) => ({ ...s, loading: true }))
    try {
      const incidents = await api.listIncidents({ signal: controller.signal })
      incidents.sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
      setState({ incidents, loaded: true, loading: false, error: null, lastSuccess: new Date() })
    } catch (error) {
      if (error.kind === 'aborted') return
      // Keep the last good records; the UI marks them stale.
      setState((s) => ({ ...s, loading: false, error }))
    }
  }, [])

  const checkHealth = useCallback(async () => {
    const checkedAt = new Date()
    try {
      await api.getHealth({ timeoutMs: 8000 })
      setHealth({ state: 'ok', checkedAt, lastOkAt: checkedAt })
    } catch {
      setHealth((h) => ({ ...h, state: 'down', checkedAt }))
    }
  }, [])

  useEffect(() => {
    if (!enabled) return undefined
    loadIncidents()
    checkHealth()
    const dataTimer = setInterval(loadIncidents, pollMs)
    const healthTimer = setInterval(checkHealth, HEALTH_INTERVAL_MS)
    return () => {
      clearInterval(dataTimer)
      clearInterval(healthTimer)
      inFlight.current?.abort()
    }
  }, [enabled, pollMs, loadIncidents, checkHealth])

  return { ...state, health, refresh: loadIncidents }
}

export function OpsDataProvider({ children, initialMode = 'LIVE' }) {
  const [mode, setModeState] = useState(initialMode)
  const [preferences, setPreferences] = useState(loadPreferences)
  const pollMs = preferences.refreshSeconds * 1000
  const live = useLiveBackend(mode === 'LIVE', pollMs)
  const [replay, dispatchReplay] = useReducer(replayReducer, initialReplay)
  const now = useNow(30000)
  const total = SCENARIO.events.length

  // 15-second Periodic Random Case Demo state
  const [autoDemoActive, setAutoDemoActive] = useState(false)
  const [dynamicIncidents, setDynamicIncidents] = useState([])
  const [latestDemoCase, setLatestDemoCase] = useState(null)

  const triggerDemoCase = useCallback(() => {
    const validObs = getValidFloodObservations()
    if (!validObs.length) return null
    const obs = validObs[Math.floor(Math.random() * validObs.length)]
    const newId = `INC-DEMO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const time = new Date()

    const newIncident = {
      id: newId,
      description: obs.note,
      peopleCount: Math.floor(Math.random() * 4) + 1,
      phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
      reporterType: 'DRONE',
      status: 'NEEDS_REVIEW',
      coords: {
        lat: Number((obs.coords.lat + (Math.random() - 0.5) * 0.008).toFixed(4)),
        lon: Number((obs.coords.lon + (Math.random() - 0.5) * 0.008).toFixed(4)),
      },
      locationMethod: 'DRONE_ESTIMATE',
      addressText: obs.locationText,
      createdAt: time,
      updatedAt: time,
      filename: obs.filename,
      imageUrl: obs.imageUrl,
      platform: obs.platform,
      isValidFlood: true,
      validationStatus: 'VERIFIED_FLOOD',
      confidence: obs.confidence,
      detectedHazards: obs.detectedHazards,
      simulated: true,
      isAutoDemo: true,
      commune: obs.commune,
    }

    setDynamicIncidents((prev) => [newIncident, ...prev].slice(0, 30))
    setLatestDemoCase({
      id: newId,
      commune: obs.commune,
      time,
      note: obs.note,
      imageUrl: obs.imageUrl,
    })
    return newIncident
  }, [])

  useEffect(() => {
    if (!autoDemoActive) return undefined
    triggerDemoCase()
    const timer = setInterval(triggerDemoCase, 15000)
    return () => clearInterval(timer)
  }, [autoDemoActive, triggerDemoCase])

  const replayAction = useCallback((type) => dispatchReplay({ type, total }), [total])

  useEffect(() => {
    if (mode !== 'REPLAY' || !replay.playing) return undefined
    const timer = setInterval(() => replayAction('tick'), REPLAY_STEP_MS)
    return () => clearInterval(timer)
  }, [mode, replay.playing, replayAction])

  const setMode = useCallback(
    (next) => {
      if (!MODES.includes(next)) return
      if (next === 'REPLAY') replayAction('reset')
      setModeState(next)
    },
    [replayAction],
  )

  const updatePreferences = useCallback((next) => {
    setPreferences(next)
    return savePreferences(next)
  }, [])

  const dataset = useMemo(() => {
    const demoActivities = dynamicIncidents.map((inc) => ({
      id: `EVT-${inc.id}`,
      category: 'DRONE_OBSERVATION',
      time: inc.createdAt,
      timeKind: 'wall',
      description: inc.description,
      source: '15s Auto-Demo Drone Recon',
      incidentId: inc.id,
      teamId: null,
      coords: inc.coords,
      location: inc.addressText,
      status: inc.status,
      mode,
    }))

    if (mode === 'LIVE') {
      const stale =
        live.loaded &&
        (Boolean(live.error) || (live.lastSuccess && now - live.lastSuccess > pollMs * 2 + 5000))
      const baseIncidents = live.incidents
      const combinedIncidents = dynamicIncidents.length > 0 ? [...dynamicIncidents, ...baseIncidents] : baseIncidents
      const baseActivity = intakeEvents(live.incidents, 'LIVE')

      return {
        mode,
        source: 'FloodOps backend',
        readOnly: false,
        incidents: combinedIncidents,
        teams: null, // the backend has no rescue-team endpoint
        floodAreas: null, // no flood-extent dataset is connected
        activity: [...demoActivities, ...baseActivity],
        safetyConfirmations: null, // the backend has no safety-confirmation data
        clock: now,
        loaded: live.loaded,
        loading: live.loading,
        error: live.error,
        lastSuccess: live.lastSuccess,
        stale,
      }
    }
    const cursor = mode === 'SIMULATION' ? total : replay.cursor
    const snap = buildSnapshot(SCENARIO, cursor, mode)
    const combinedIncidents = dynamicIncidents.length > 0 ? [...dynamicIncidents, ...snap.incidents] : snap.incidents

    return {
      mode,
      source: SCENARIO.name,
      readOnly: true,
      incidents: combinedIncidents,
      teams: snap.teams,
      floodAreas: snap.floodAreas,
      activity: sortEventsNewestFirst([...demoActivities, ...snap.activity]),
      safetyConfirmations: snap.safetyConfirmations,
      clock: snap.clock,
      loaded: true,
      loading: false,
      error: null,
      lastSuccess: null,
      stale: false,
      snapshot: snap,
    }
  }, [mode, live, now, pollMs, replay.cursor, total, dynamicIncidents])


  // Per-incident detail loaders. Simulation never touches the network.
  const loadHistory = useCallback(
    async (id, options) => {
      const dynamic = dynamicIncidents.find((i) => i.id === id)
      if (dynamic) {
        return [
          {
            id: `${dynamic.id}-EVT`,
            incidentId: dynamic.id,
            previousStatus: null,
            newStatus: 'NEEDS_REVIEW',
            note: `Drone observation ingested via 15s reconnaissance demo. Platform: ${dynamic.platform}.`,
            createdAt: dynamic.createdAt,
          },
        ]
      }
      return mode === 'LIVE' ? api.listIncidentEvents(id, options) : (dataset.snapshot?.history[id] ?? [])
    },
    [mode, dataset.snapshot, dynamicIncidents],
  )

  const loadEvidence = useCallback(
    async (id, options) => {
      const dynamic = dynamicIncidents.find((i) => i.id === id)
      if (dynamic) {
        return [
          {
            id: `${dynamic.id}-E`,
            incidentId: dynamic.id,
            filename: dynamic.filename,
            imageUrl: dynamic.imageUrl,
            contentType: 'image/jpeg',
            createdAt: dynamic.createdAt,
            platform: dynamic.platform,
            simulated: true,
          },
        ]
      }
      return mode === 'LIVE' ? api.listIncidentEvidence(id, options) : (dataset.snapshot?.evidence[id] ?? [])
    },
    [mode, dataset.snapshot, dynamicIncidents],
  )

  const updateStatus = useCallback(
    async (id, status, note) => {
      if (mode !== 'LIVE') throw new Error('Status changes are disabled outside LIVE mode.')
      const updated = await api.updateIncidentStatus(id, status, note)
      await live.refresh() // reconcile with the server's list
      return updated
    },
    [mode, live],
  )

  const value = useMemo(
    () => ({
      mode,
      setMode,
      dataset,
      health: live.health,
      refresh: live.refresh,
      preferences,
      updatePreferences,
      replay: { ...replay, total, clock: dataset.clock, action: replayAction },
      scenario: SCENARIO,
      loadHistory,
      loadEvidence,
      updateStatus,
      now,
      autoDemoActive,
      setAutoDemoActive,
      triggerDemoCase,
      latestDemoCase,
      clearLatestDemoCase: () => setLatestDemoCase(null),
    }),
    [
      mode,
      setMode,
      dataset,
      live.health,
      live.refresh,
      preferences,
      updatePreferences,
      replay,
      total,
      replayAction,
      loadHistory,
      loadEvidence,
      updateStatus,
      now,
      autoDemoActive,
      triggerDemoCase,
      latestDemoCase,
    ],
  )


  return <OpsContext.Provider value={value}>{children}</OpsContext.Provider>
}
