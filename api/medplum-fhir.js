const MEDPLUM_BASE_URL = (process.env.MEDPLUM_BASE_URL || 'https://api.medplum.com').trim();
const MEDPLUM_CLIENT_ID = (process.env.MEDPLUM_CLIENT_ID || '').trim();
const MEDPLUM_CLIENT_SECRET = (process.env.MEDPLUM_CLIENT_SECRET || '').trim();

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetch(`${MEDPLUM_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: MEDPLUM_CLIENT_ID,
      client_secret: MEDPLUM_CLIENT_SECRET,
    }).toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Medplum token error ${res.status}: ${err}`);
  }
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

async function fhirGet(path, token) {
  const res = await fetch(`${MEDPLUM_BASE_URL}/fhir/R4/${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/fhir+json' },
  });
  if (!res.ok) return null;
  return res.json();
}

// POST a new FHIR resource. Returns the created resource (with server-assigned id).
async function fhirPost(resourceType, body, token) {
  const res = await fetch(`${MEDPLUM_BASE_URL}/fhir/R4/${resourceType}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/fhir+json',
      Accept: 'application/fhir+json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`FHIR POST ${resourceType} ${res.status}: ${detail.slice(0, 300)}`);
  }
  return res.json();
}

// Vardana tags for filtering AI check-in sessions out of other Communication /
// Encounter resources in the tenant. Keep in sync with ui consumers.
const VARDANA_SYSTEM = 'http://vardana.ai/sessions';
const VARDANA_CODE_CHECKIN = 'ai-voice-checkin';

// ── Extract helpers ──

function extractLatestWeight(vitalsBundle) {
  const entries = vitalsBundle?.entry || [];
  for (const e of entries) {
    const obs = e.resource;
    if (obs?.code?.coding?.[0]?.code === '29463-7' && obs.valueQuantity) {
      return { value: obs.valueQuantity.value, unit: obs.valueQuantity.unit || 'lb', date: obs.effectiveDateTime };
    }
  }
  return null;
}

function extractLatestBP(vitalsBundle) {
  const entries = vitalsBundle?.entry || [];
  for (const e of entries) {
    const obs = e.resource;
    if (obs?.code?.coding?.[0]?.code === '85354-9' && obs.component) {
      const sys = obs.component.find(c => c.code?.coding?.[0]?.code === '8480-6');
      const dia = obs.component.find(c => c.code?.coding?.[0]?.code === '8462-4');
      if (sys && dia) {
        return { systolic: sys.valueQuantity.value, diastolic: dia.valueQuantity.value, date: obs.effectiveDateTime };
      }
    }
  }
  return null;
}

const ADHERENCE_EXT_URL = 'https://vardana.ai/fhir/StructureDefinition/activity-adherence';
function parseAdherence(activity) {
  const ext = (activity?.extension || []).find(e => e.url === ADHERENCE_EXT_URL);
  if (!ext) return null;
  const sub = ext.extension || [];
  const pick = (u) => sub.find(s => s.url === u);
  const num = (u) => {
    const v = pick(u);
    if (!v) return null;
    if (typeof v.valueDecimal === 'number') return v.valueDecimal;
    if (typeof v.valueInteger === 'number') return v.valueInteger;
    return null;
  };
  const str = (u) => {
    const v = pick(u);
    if (!v) return null;
    return v.valueString || v.valueDate || null;
  };
  return {
    percent: num('adherencePercent'),
    actual: num('actualCount'),
    expected: num('expectedCount'),
    lastEventDate: str('lastEventDate'),
    note: str('adherenceNote'),
    weeklyMinutesActual: num('weeklyMinutesActual'),
    weeklyMinutesTarget: num('weeklyMinutesTarget'),
  };
}
function extractCarePlan(cpBundle, goalBundle) {
  const cp = cpBundle?.entry?.[0]?.resource;
  if (!cp) return null;
  const goalResources = (goalBundle?.entry || []).map(e => e.resource).filter(Boolean);
  const goals = (cp.goal || [])
    .map(ref => {
      const id = (ref.reference || '').split('/').pop();
      return goalResources.find(g => g.id === id);
    })
    .filter(Boolean)
    .map(g => ({
      id: g.id,
      description: g.description?.text || '',
      priority: g.priority?.coding?.[0]?.code || null,
      category: g.category?.[0]?.coding?.[0]?.display || null,
      startDate: g.startDate || null,
      status: g.achievementStatus?.coding?.[0]?.display
        || g.achievementStatus?.coding?.[0]?.code
        || g.lifecycleStatus || '',
      targets: (g.target || []).map(t => ({
        measure: t.measure?.coding?.[0]?.display || '',
        code: t.measure?.coding?.[0]?.code || '',
        value: t.detailQuantity?.value ?? null,
        unit: t.detailQuantity?.unit || '',
        dueDate: t.dueDate || null,
      })),
      note: g.note?.[0]?.text || '',
    }));
  const activities = (cp.activity || []).map(a => {
    const d = a.detail || {};
    return {
      kind: d.kind || '',
      code: d.code?.text || d.productReference?.display || '',
      status: d.status || 'unknown',
      description: d.description || '',
      timing: d.scheduledTiming?.repeat || null,
      adherence: parseAdherence(a),
    };
  });
  return {
    id: cp.id,
    title: cp.title,
    description: cp.description,
    period: cp.period,
    created: cp.created || null,
    author: cp.author?.display || cp.author?.reference || '',
    goals,
    activities,
    note: cp.note?.[0]?.text || '',
  };
}

function formatPatient(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: `${p.name?.[0]?.given?.[0] || ''} ${p.name?.[0]?.family || ''}`.trim(),
    gender: p.gender,
    birthDate: p.birthDate,
    identifier: p.identifier?.find(i => i.system === 'http://vardana.ai/patients')?.value,
    phone: p.telecom?.find(t => t.system === 'phone')?.value,
    email: p.telecom?.find(t => t.system === 'email')?.value,
    address: p.address?.[0],
    generalPractitioner: p.generalPractitioner?.[0]?.display,
    languages: (p.communication || []).map(c => ({
      code: c.language?.coding?.[0]?.code,
      display: c.language?.coding?.[0]?.display,
      preferred: c.preferred,
    })),
  };
}

function formatConditions(bundle) {
  return (bundle?.entry || []).map(e => {
    const c = e.resource;
    return {
      text: c.code?.text || c.code?.coding?.[0]?.display,
      code: c.code?.coding?.[0]?.code,
      system: c.code?.coding?.[0]?.system,
      status: c.clinicalStatus?.coding?.[0]?.code,
      onset: c.onsetDateTime,
      note: c.note?.[0]?.text,
    };
  });
}

function formatMedications(bundle) {
  return (bundle?.entry || []).map(e => {
    const m = e.resource;
    return {
      name: m.medicationCodeableConcept?.text || m.medicationCodeableConcept?.coding?.[0]?.display,
      code: m.medicationCodeableConcept?.coding?.[0]?.code,
      dosage: m.dosageInstruction?.[0]?.text,
      status: m.status,
      note: m.note?.[0]?.text,
    };
  });
}

function formatVitals(bundle) {
  const weights = [];
  const bloodPressures = [];

  for (const e of (bundle?.entry || [])) {
    const obs = e.resource;
    const code = obs?.code?.coding?.[0]?.code;

    if (code === '29463-7' && obs.valueQuantity) {
      weights.push({ value: obs.valueQuantity.value, unit: obs.valueQuantity.unit, date: obs.effectiveDateTime });
    } else if (code === '85354-9' && obs.component) {
      const sys = obs.component.find(c => c.code?.coding?.[0]?.code === '8480-6');
      const dia = obs.component.find(c => c.code?.coding?.[0]?.code === '8462-4');
      if (sys && dia) {
        bloodPressures.push({ systolic: sys.valueQuantity.value, diastolic: dia.valueQuantity.value, date: obs.effectiveDateTime });
      }
    }
  }

  return { weights, bloodPressures };
}

function formatLabs(bundle) {
  return (bundle?.entry || []).map(e => {
    const obs = e.resource;
    return {
      name: obs.code?.coding?.[0]?.display || obs.code?.text,
      code: obs.code?.coding?.[0]?.code,
      value: obs.valueQuantity?.value,
      unit: obs.valueQuantity?.unit,
      date: obs.effectiveDateTime,
      referenceRange: obs.referenceRange?.[0],
      note: obs.note?.[0]?.text,
    };
  });
}

function formatAllergies(bundle) {
  return (bundle?.entry || []).map(e => {
    const a = e.resource;
    return {
      substance: a.code?.text || a.code?.coding?.[0]?.display,
      type: a.type,
      category: a.category,
      status: a.clinicalStatus?.coding?.[0]?.code,
      reaction: a.reaction?.[0]?.manifestation?.[0]?.text,
    };
  });
}

// ── Main handler ──

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!MEDPLUM_CLIENT_ID || !MEDPLUM_CLIENT_SECRET) {
    return res.status(500).json({ error: 'MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET not configured' });
  }

  const { action, patientId } = req.query;

  try {
    const token = await getAccessToken();

    // ── Write: log an AI voice check-in as an Encounter + Communication pair ──
    if (req.method === 'POST' && action === 'log-session') {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const {
        patientId: pid, transcript = [], summary = '',
        duration = '', riskScore = null, riskLevel = null, alertGenerated = false,
        timestamp,
      } = body;
      if (!pid) return res.status(400).json({ error: 'patientId required in body' });

      const startIso = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
      const endIso = new Date().toISOString();

      // Encounter — the "visit" record for the AI check-in.
      const encounter = await fhirPost('Encounter', {
        resourceType: 'Encounter',
        status: 'finished',
        class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'VR', display: 'virtual' },
        type: [{
          coding: [{ system: VARDANA_SYSTEM, code: VARDANA_CODE_CHECKIN, display: 'AI voice check-in' }],
          text: 'AI voice check-in',
        }],
        subject: { reference: `Patient/${pid}` },
        period: { start: startIso, end: endIso },
        reasonCode: alertGenerated
          ? [{ text: `Escalation generated${riskLevel ? ` · ${String(riskLevel).toUpperCase()}` : ''}` }]
          : [{ text: 'Routine AI check-in' }],
      }, token);

      // Communication — carries the transcript + summary + metadata.
      const transcriptText = Array.isArray(transcript)
        ? transcript.map(t => `${t.speaker || 'AI'}: ${t.text || ''}`).filter(Boolean).join('\n')
        : String(transcript || '');

      const communication = await fhirPost('Communication', {
        resourceType: 'Communication',
        status: 'completed',
        category: [{
          coding: [{ system: VARDANA_SYSTEM, code: VARDANA_CODE_CHECKIN, display: 'AI voice check-in' }],
          text: 'AI voice check-in',
        }],
        subject: { reference: `Patient/${pid}` },
        encounter: { reference: `Encounter/${encounter.id}` },
        sent: endIso,
        payload: [
          ...(summary ? [{ contentString: `SUMMARY: ${summary}` }] : []),
          ...(transcriptText ? [{ contentString: `TRANSCRIPT:\n${transcriptText}` }] : []),
          { contentString: `META: duration=${duration} · riskScore=${riskScore ?? 'n/a'} · riskLevel=${riskLevel ?? 'n/a'} · alert=${alertGenerated ? 'yes' : 'no'}` },
        ],
      }, token);

      return res.status(201).json({
        source: 'medplum',
        encounterId: encounter.id,
        communicationId: communication.id,
      });
    }

    // ── Read: list past AI check-in sessions for a patient ──
    if (action === 'sessions') {
      if (!patientId) return res.status(400).json({ error: 'patientId query param required' });

      const encBundle = await fhirGet(
        `Encounter?subject=Patient/${patientId}&type=${encodeURIComponent(`${VARDANA_SYSTEM}|${VARDANA_CODE_CHECKIN}`)}&_sort=-date&_count=20`,
        token
      );
      const encounters = (encBundle?.entry || []).map(e => e.resource).filter(Boolean);

      const sessions = await Promise.all(encounters.map(async (enc) => {
        const commBundle = await fhirGet(`Communication?encounter=Encounter/${enc.id}&_count=1`, token);
        const comm = commBundle?.entry?.[0]?.resource;
        const payloadParts = Object.fromEntries((comm?.payload || []).map(p => {
          const s = p.contentString || '';
          const idx = s.indexOf(':');
          return idx > -1 ? [s.slice(0, idx).trim().toLowerCase(), s.slice(idx + 1).trim()] : ['raw', s];
        }));
        const meta = (payloadParts.meta || '').split('·').reduce((acc, kv) => {
          const [k, v] = kv.split('=').map(x => (x || '').trim());
          if (k) acc[k] = v;
          return acc;
        }, {});
        return {
          id: enc.id,
          date: enc.period?.start,
          end: enc.period?.end,
          duration: meta.duration || '',
          riskScore: meta.riskScore && meta.riskScore !== 'n/a' ? Number(meta.riskScore) : null,
          riskLevel: meta.riskLevel && meta.riskLevel !== 'n/a' ? meta.riskLevel : null,
          alertGenerated: meta.alert === 'yes',
          summary: payloadParts.summary || '',
          transcript: payloadParts.transcript || '',
          reason: enc.reasonCode?.[0]?.text || '',
        };
      }));

      return res.status(200).json({ source: 'medplum', sessions });
    }

    if (action === 'roster') {
      // Return all patients in the project. Identifier-system filter was
      // dropped on 2026-04-24 — patients seeded under different identifier
      // systems (e.g. https://vardana.ai/fhir/identifier) were being filtered
      // out. Client-side SUPPRESSED_PATIENT_NAMES + LOCAL_PATIENT_NAMES in
      // CoordinatorDashboard.jsx handle exclusions of stale CHF-era patients
      // and local-fixture overrides.
      const patientsBundle = await fhirGet('Patient?_count=20', token);
      const patients = (patientsBundle?.entry || []).map(e => e.resource);

      // For each patient, fetch summary data in parallel
      const summaries = await Promise.all(patients.map(async (patient) => {
        const pid = patient.id;
        const [conditions, meds, vitals, carePlans, allergies] = await Promise.all([
          fhirGet(`Condition?patient=Patient/${pid}&_count=20`, token),
          fhirGet(`MedicationRequest?patient=Patient/${pid}&_count=20`, token),
          fhirGet(`Observation?patient=Patient/${pid}&category=vital-signs&_sort=-date&_count=50`, token),
          fhirGet(`CarePlan?patient=Patient/${pid}&status=active`, token),
          fhirGet(`AllergyIntolerance?patient=Patient/${pid}`, token),
        ]);

        return {
          ...formatPatient(patient),
          conditions: formatConditions(conditions),
          medications: formatMedications(meds),
          latestWeight: extractLatestWeight(vitals),
          latestBP: extractLatestBP(vitals),
          vitals: formatVitals(vitals),
          carePlan: extractCarePlan(carePlans),
          allergies: formatAllergies(allergies),
        };
      }));

      // Dedupe at the query boundary. The Medplum tenant currently holds two
      // Patient resources for Sarah Chen that share identifier VRD-2026-001
      // but have different FHIR IDs, so UI-side id-keyed dedup misses them.
      // Key on identifier first (falling back to name+birthDate), and keep
      // whichever record has the freshest vitals. Suppressed IDs are surfaced
      // in the response so the Medplum tenant can be cleaned up offline.
      const freshness = (p) =>
        new Date(p.latestBP?.date || p.latestWeight?.date || 0).getTime();
      const bestByKey = new Map();
      const suppressed = [];
      for (const p of summaries) {
        const key = p.identifier || `${p.name || ''}|${p.birthDate || ''}`;
        const current = bestByKey.get(key);
        if (!current) {
          bestByKey.set(key, p);
          continue;
        }
        if (freshness(p) > freshness(current)) {
          suppressed.push({ id: current.id, name: current.name, reason: 'stale-duplicate' });
          bestByKey.set(key, p);
        } else {
          suppressed.push({ id: p.id, name: p.name, reason: 'stale-duplicate' });
        }
      }
      const deduped = Array.from(bestByKey.values());

      return res.status(200).json({ source: 'medplum', patients: deduped, suppressed });
    }

    if (action === 'patient') {
      if (!patientId) return res.status(400).json({ error: 'patientId query param required' });

      const [patient, conditions, meds, vitals, labs, carePlans, goals, allergies] = await Promise.all([
        fhirGet(`Patient/${patientId}`, token),
        fhirGet(`Condition?patient=Patient/${patientId}&_count=20`, token),
        fhirGet(`MedicationRequest?patient=Patient/${patientId}&_count=20`, token),
        fhirGet(`Observation?patient=Patient/${patientId}&category=vital-signs&_sort=-date&_count=50`, token),
        fhirGet(`Observation?patient=Patient/${patientId}&category=laboratory&_count=20`, token),
        fhirGet(`CarePlan?patient=Patient/${patientId}&status=active`, token),
        fhirGet(`Goal?patient=Patient/${patientId}&lifecycle-status=active&_count=20`, token),
        fhirGet(`AllergyIntolerance?patient=Patient/${patientId}`, token),
      ]);

      if (!patient) return res.status(404).json({ error: 'Patient not found' });

      return res.status(200).json({
        source: 'medplum',
        patient: formatPatient(patient),
        conditions: formatConditions(conditions),
        medications: formatMedications(meds),
        vitals: formatVitals(vitals),
        labs: formatLabs(labs),
        carePlan: extractCarePlan(carePlans, goals),
        allergies: formatAllergies(allergies),
      });
    }

    return res.status(400).json({ error: 'action must be "roster", "patient", "sessions" (GET), or "log-session" (POST)' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
