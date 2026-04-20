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

function extractCarePlan(cpBundle) {
  const cp = cpBundle?.entry?.[0]?.resource;
  if (!cp) return null;
  const activities = (cp.activity || []).map(a => ({
    description: a.detail?.description || '',
    status: a.detail?.status || 'unknown',
  }));
  return {
    title: cp.title,
    description: cp.description,
    period: cp.period,
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!MEDPLUM_CLIENT_ID || !MEDPLUM_CLIENT_SECRET) {
    return res.status(500).json({ error: 'MEDPLUM_CLIENT_ID and MEDPLUM_CLIENT_SECRET not configured' });
  }

  const { action, patientId } = req.query;

  try {
    const token = await getAccessToken();

    if (action === 'roster') {
      // Fetch all Vardana patients by identifier system
      const patientsBundle = await fhirGet('Patient?identifier=http://vardana.ai/patients|&_count=20', token);
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

      const [patient, conditions, meds, vitals, labs, carePlans, allergies] = await Promise.all([
        fhirGet(`Patient/${patientId}`, token),
        fhirGet(`Condition?patient=Patient/${patientId}&_count=20`, token),
        fhirGet(`MedicationRequest?patient=Patient/${patientId}&_count=20`, token),
        fhirGet(`Observation?patient=Patient/${patientId}&category=vital-signs&_sort=-date&_count=50`, token),
        fhirGet(`Observation?patient=Patient/${patientId}&category=laboratory&_count=20`, token),
        fhirGet(`CarePlan?patient=Patient/${patientId}&status=active`, token),
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
        carePlan: extractCarePlan(carePlans),
        allergies: formatAllergies(allergies),
      });
    }

    return res.status(400).json({ error: 'action must be "roster" or "patient"' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
