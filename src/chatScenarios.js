/**
 * chatScenarios.js
 *
 * Manifest of recorded chat scenarios for "Play recorded chat". Maps each
 * scenario to (a) a JSON file under public/data/ and (b) a patient-name
 * pattern so the Care Console can offer the right scenarios for the
 * currently-selected patient.
 *
 * Match by name pattern (not patient.id) because Medplum can hand back
 * different IDs across environments; names are stable across our seeds.
 */

export const CHAT_SCENARIOS = [
  {
    id: "marcus-chat-watch",
    label: "Adherence + rising BP (WATCH → SAME-DAY)",
    file: "/data/marcus-chat-watch.json",
    patientNamePattern: /marcus.*williams/i,
  },
  {
    id: "marcus-chat-stable",
    label: "Routine check-in (STABLE)",
    file: "/data/marcus-chat-stable.json",
    patientNamePattern: /marcus.*williams/i,
  },
  {
    id: "linda-chat-stable",
    label: "Routine check-in (STABLE)",
    file: "/data/linda-chat-stable.json",
    patientNamePattern: /linda.*patel/i,
  },
  {
    id: "david-chat-watch",
    label: "Drifting BP + adherence-naive (WATCH)",
    file: "/data/david-chat-watch.json",
    patientNamePattern: /david.*brooks/i,
  },
];

export function scenariosForPatient(patientName) {
  if (!patientName) return [];
  return CHAT_SCENARIOS.filter(s => s.patientNamePattern.test(patientName));
}

export async function loadScenario(file) {
  const res = await fetch(file, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load scenario: ${file} (${res.status})`);
  return res.json();
}
