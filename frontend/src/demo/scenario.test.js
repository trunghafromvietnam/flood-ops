import { describe, expect, it } from 'vitest'
import { SCENARIO, buildSnapshot, initialReplay, replayReducer } from './scenario.js'

const total = SCENARIO.events.length

describe('scenario', () => {
  it('uses SIM- identifiers for every synthetic record', () => {
    const snap = buildSnapshot(SCENARIO, total, 'SIMULATION')
    for (const record of [...snap.incidents, ...snap.teams, ...snap.activity]) {
      expect(record.id.startsWith('SIM-')).toBe(true)
    }
  })

  it('is deterministic: same cursor, same snapshot', () => {
    expect(buildSnapshot(SCENARIO, 7, 'REPLAY')).toEqual(buildSnapshot(SCENARIO, 7, 'REPLAY'))
  })

  it('starts empty and applies events in order', () => {
    expect(buildSnapshot(SCENARIO, 0, 'REPLAY').incidents).toHaveLength(0)
    const snap = buildSnapshot(SCENARIO, 5, 'REPLAY')
    expect(snap.incidents.find((i) => i.id === 'SIM-INC-001').status).toBe('ASSIGNED')
    expect(snap.activity[0].id).toBe('SIM-EVT-05')
  })

  it('never invents coordinates for records without them', () => {
    const snap = buildSnapshot(SCENARIO, total, 'SIMULATION')
    expect(snap.incidents.find((i) => i.id === 'SIM-INC-002').coords).toBeNull()
    expect(snap.incidents.find((i) => i.id === 'SIM-OBS-002').coords).toBeNull()
    expect(snap.teams.find((t) => t.id === 'SIM-TEAM-D').coords).toBeNull()
  })

  it('records safety confirmations only from the scenario', () => {
    const snap = buildSnapshot(SCENARIO, total, 'SIMULATION')
    expect(snap.safetyConfirmations.map((s) => s.peopleSafe)).toEqual([4, 1])
  })
})

describe('replayReducer', () => {
  const run = (state, ...types) => types.reduce((s, type) => replayReducer(s, { type, total }), state)

  it('start, pause, resume, next and reset', () => {
    let state = run(initialReplay, 'start')
    expect(state).toEqual({ cursor: 1, playing: true })
    state = run(state, 'pause', 'next', 'next')
    expect(state).toEqual({ cursor: 3, playing: false })
    state = run(state, 'resume', 'tick')
    expect(state).toEqual({ cursor: 4, playing: true })
    expect(run(state, 'reset')).toEqual(initialReplay)
  })

  it('stops at the last event', () => {
    let state = { cursor: total - 1, playing: true }
    state = run(state, 'tick', 'tick')
    expect(state).toEqual({ cursor: total, playing: false })
  })

  it('replaying after reset yields the identical sequence', () => {
    const first = buildSnapshot(SCENARIO, run(initialReplay, 'start', 'next', 'next').cursor, 'REPLAY')
    const again = buildSnapshot(SCENARIO, run(initialReplay, 'start', 'next', 'next', 'reset', 'start', 'next', 'next').cursor, 'REPLAY')
    expect(again.activity.map((e) => e.id)).toEqual(first.activity.map((e) => e.id))
  })
})
