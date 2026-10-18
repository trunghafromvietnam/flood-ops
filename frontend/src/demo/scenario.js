// Deterministic SYNTHETIC scenario for SIMULATION and REPLAY modes.
// Nothing here is a real call, victim, drone frame or rescue. IDs start with SIM-
// so they can never be confused with backend records, and this module is never
// imported by the live data path.

export const SCENARIO_START = new Date('2026-10-15T23:00:00Z') // 06:00 local (UTC+7)

const at = (minutes) => new Date(SCENARIO_START.getTime() + minutes * 60000)

export const SCENARIO = {
  id: 'qb-kien-giang-v1',
  name: 'Synthetic scenario: river flooding around Kien Giang (Le Thuy) and Dong Hoi',
  description:
    'Fourteen scripted events: form, phone and drone intake, operator status changes and team safety confirmations. All records are fictional.',

  teams: [
    { id: 'SIM-TEAM-A', name: 'Simulated boat team A', status: 'AVAILABLE', coords: { lat: 17.212, lon: 106.79 }, locationAt: 0, assignment: null },
    { id: 'SIM-TEAM-B', name: 'Simulated team B', status: 'AVAILABLE', coords: { lat: 17.48, lon: 106.6 }, locationAt: 0, assignment: null },
    { id: 'SIM-TEAM-C', name: 'Simulated team C', status: 'AVAILABLE', coords: { lat: 17.75, lon: 106.43 }, locationAt: -50, assignment: null },
    { id: 'SIM-TEAM-D', name: 'Simulated team D', status: 'OFF_DUTY', coords: null, locationAt: null, assignment: null },
  ],

  floodAreas: [
    {
      id: 'SIM-FLOOD-1',
      name: 'Illustrative flood area near Kien Giang',
      kind: 'SIMULATED',
      observedAt: 0,
      // Illustrative only. Not a measured or forecast flood extent.
      ring: [
        [106.76, 17.235],
        [106.81, 17.24],
        [106.825, 17.2],
        [106.77, 17.19],
        [106.76, 17.235],
      ],
    },
  ],

  events: [
    { id: 'SIM-EVT-01', minute: 0, category: 'FORM_REPORT', incident: { id: 'SIM-INC-001', reporterType: 'SELF', coords: { lat: 17.229, lon: 106.7715 }, locationMethod: 'GPS', addressText: null, peopleCount: 4, description: 'Reported water level: Waist level\nReported severity: High\n\nWater inside the house. Two children and one elderly person.' } },
    { id: 'SIM-EVT-02', minute: 3, category: 'PHONE_REPORT', incident: { id: 'SIM-INC-002', reporterType: 'PHONE_CALL', coords: null, locationMethod: 'VOICE', addressText: 'Hamlet near Quan Hau market, Quang Ninh (spoken, not geocoded)', peopleCount: 2, description: 'Caller says two adults are on the upper floor and the road is cut off.' } },
    { id: 'SIM-EVT-03', minute: 6, category: 'DRONE_OBSERVATION', incident: { id: 'SIM-OBS-001', reporterType: 'DRONE', status: 'NEEDS_REVIEW', coords: { lat: 17.205, lon: 106.801 }, locationMethod: 'DRONE_ESTIMATE', addressText: null, peopleCount: null, description: 'Synthetic drone frame: possible people on a roof.' }, evidence: { filename: 'sim-frame-001.jpg', platform: 'SIM-DRONE-1' } },
    { id: 'SIM-EVT-04', minute: 9, category: 'STATUS_CHANGE', incidentId: 'SIM-INC-001', to: 'VERIFIED', note: 'Callback confirmed the details.' },
    { id: 'SIM-EVT-05', minute: 11, category: 'STATUS_CHANGE', incidentId: 'SIM-INC-001', to: 'ASSIGNED', note: 'Assigned to SIM-TEAM-A.', teamUpdate: { id: 'SIM-TEAM-A', status: 'EN_ROUTE', assignment: 'SIM-INC-001' } },
    { id: 'SIM-EVT-06', minute: 14, category: 'FORM_REPORT', incident: { id: 'SIM-INC-003', reporterType: 'THIRD_PARTY', coords: { lat: 17.4735, lon: 106.617 }, locationMethod: 'MAP_PIN', addressText: 'Street near the river, Dong Hoi', peopleCount: null, description: 'Neighbour reports an elderly man alone. Water rising in the street.' } },
    { id: 'SIM-EVT-07', minute: 18, category: 'STATUS_CHANGE', incidentId: 'SIM-OBS-001', to: 'VERIFIED', note: 'Operator reviewed the synthetic frame.' },
    { id: 'SIM-EVT-08', minute: 22, category: 'SAFETY_CONFIRMATION', incidentId: 'SIM-INC-001', teamId: 'SIM-TEAM-A', peopleSafe: 4, note: 'Team reports 4 people moved to safety.', teamUpdate: { id: 'SIM-TEAM-A', status: 'AVAILABLE', assignment: null, coords: { lat: 17.22, lon: 106.78 } } },
    { id: 'SIM-EVT-09', minute: 26, category: 'PHONE_REPORT', incident: { id: 'SIM-INC-004', reporterType: 'PHONE_CALL', coords: { lat: 17.884, lon: 106.017 }, locationMethod: 'VOICE', addressText: 'School building, Dong Le, Tuyen Hoa', peopleCount: 6, description: 'Caller says a group is sheltering in a school building.' } },
    { id: 'SIM-EVT-10', minute: 30, category: 'DRONE_OBSERVATION', incident: { id: 'SIM-OBS-002', reporterType: 'DRONE', status: 'NEEDS_REVIEW', coords: null, locationMethod: 'UNKNOWN', addressText: null, peopleCount: null, description: 'Synthetic drone frame without GPS metadata.' }, evidence: { filename: 'sim-frame-002.jpg', platform: 'SIM-DRONE-1' } },
    { id: 'SIM-EVT-11', minute: 33, category: 'FORM_REPORT', incident: { id: 'SIM-INC-005', reporterType: 'SELF', coords: { lat: 17.759, lon: 106.418 }, locationMethod: 'GPS', addressText: null, peopleCount: 1, description: 'Reported water level: Knee level\n\nCannot leave the house with a motorbike.' } },
    { id: 'SIM-EVT-12', minute: 37, category: 'STATUS_CHANGE', incidentId: 'SIM-INC-003', to: 'ASSIGNED', note: 'Assigned to SIM-TEAM-B.', teamUpdate: { id: 'SIM-TEAM-B', status: 'EN_ROUTE', assignment: 'SIM-INC-003', coords: { lat: 17.476, lon: 106.61 } } },
    { id: 'SIM-EVT-13', minute: 41, category: 'SAFETY_CONFIRMATION', incidentId: 'SIM-INC-003', teamId: 'SIM-TEAM-B', peopleSafe: 1, note: 'Team reports 1 person moved to safety.', teamUpdate: { id: 'SIM-TEAM-B', status: 'ON_SCENE' } },
    { id: 'SIM-EVT-14', minute: 44, category: 'STATUS_CHANGE', incidentId: 'SIM-INC-002', to: 'NEEDS_REVIEW', note: 'Location unresolved. Awaiting callback.' },
  ],
}

const SOURCE_BY_CATEGORY = {
  FORM_REPORT: 'Synthetic web form',
  PHONE_REPORT: 'Synthetic phone call',
  DRONE_OBSERVATION: 'Synthetic drone observation',
  SAFETY_CONFIRMATION: 'Synthetic team confirmation',
  STATUS_CHANGE: 'Synthetic operator update',
}

// State after the first `cursor` events. Same input -> same output, always.
export function buildSnapshot(scenario, cursor, mode) {
  const count = Math.max(0, Math.min(cursor, scenario.events.length))
  const applied = scenario.events.slice(0, count)
  const clock = count ? at(applied[count - 1].minute) : SCENARIO_START

  const incidents = new Map()
  const history = {}
  const evidence = {}
  const teams = new Map(
    scenario.teams.map((t) => [
      t.id,
      {
        id: t.id,
        name: t.name,
        status: t.status,
        coords: t.coords,
        locationUpdatedAt: t.locationAt == null ? null : at(t.locationAt),
        assignment: t.assignment,
        lastUpdateAt: t.locationAt == null ? null : at(t.locationAt),
        simulated: true,
      },
    ]),
  )
  const activity = []
  const safetyConfirmations = []

  for (const event of applied) {
    const time = at(event.minute)
    let incidentId = event.incidentId
    let description = event.note

    if (event.incident) {
      const inc = event.incident
      incidentId = inc.id
      description = inc.description
      incidents.set(inc.id, {
        id: inc.id,
        description: inc.description,
        peopleCount: inc.peopleCount,
        phone: null,
        reporterType: inc.reporterType,
        status: inc.status ?? 'NEW',
        coords: inc.coords,
        locationMethod: inc.locationMethod,
        addressText: inc.addressText,
        createdAt: time,
        updatedAt: time,
        simulated: true,
      })
      history[inc.id] = [
        { id: event.id, previousStatus: null, newStatus: inc.status ?? 'NEW', note: 'Synthetic record created.', createdAt: time },
      ]
      if (event.evidence) {
        evidence[inc.id] = [
          {
            id: `${event.id}-E`,
            incidentId: inc.id,
            filename: event.evidence.filename,
            contentType: 'image/jpeg',
            createdAt: time,
            platform: event.evidence.platform,
            simulated: true,
          },
        ]
      }
    }

    const target = incidents.get(incidentId)
    if (event.category === 'STATUS_CHANGE' && target) {
      history[incidentId].push({ id: event.id, previousStatus: target.status, newStatus: event.to, note: event.note, createdAt: time })
      incidents.set(incidentId, { ...target, status: event.to, updatedAt: time })
    }
    if (event.category === 'SAFETY_CONFIRMATION' && target) {
      safetyConfirmations.push({ id: event.id, incidentId, teamId: event.teamId, peopleSafe: event.peopleSafe, time })
      history[incidentId].push({ id: event.id, previousStatus: target.status, newStatus: 'RESOLVED', note: event.note, createdAt: time })
      incidents.set(incidentId, { ...target, status: 'RESOLVED', updatedAt: time })
    }
    if (event.teamUpdate) {
      const team = teams.get(event.teamUpdate.id)
      const { coords, ...rest } = event.teamUpdate
      teams.set(team.id, {
        ...team,
        ...rest,
        ...(coords ? { coords, locationUpdatedAt: time } : {}),
        lastUpdateAt: time,
      })
    }

    const current = incidents.get(incidentId)
    activity.push({
      id: event.id,
      category: event.category,
      time,
      timeKind: 'scenario',
      description,
      source: SOURCE_BY_CATEGORY[event.category],
      incidentId: incidentId ?? null,
      teamId: event.teamId ?? event.teamUpdate?.id ?? null,
      coords: current?.coords ?? null,
      location: current?.addressText ?? null,
      status: current?.status ?? null,
      mode,
    })
  }

  return {
    clock,
    cursor: count,
    total: scenario.events.length,
    incidents: [...incidents.values()].sort((a, b) => b.createdAt - a.createdAt),
    teams: [...teams.values()],
    floodAreas: scenario.floodAreas.map((f) => ({ ...f, observedAt: at(f.observedAt) })),
    activity: activity.reverse(),
    history,
    evidence,
    safetyConfirmations,
  }
}

// Replay transport as a pure reducer so it can be tested without timers.
// action.total is the number of scenario events.
export const initialReplay = { cursor: 0, playing: false }

export function replayReducer(state, action) {
  const { total } = action
  switch (action.type) {
    case 'start': {
      const cursor = state.cursor === 0 ? 1 : state.cursor
      return { cursor, playing: cursor < total }
    }
    case 'pause':
      return { ...state, playing: false }
    case 'resume':
      return { ...state, playing: state.cursor < total }
    case 'next':
    case 'tick': {
      const cursor = Math.min(state.cursor + 1, total)
      return { cursor, playing: state.playing && cursor < total }
    }
    case 'reset':
      return initialReplay
    default:
      return state
  }
}
