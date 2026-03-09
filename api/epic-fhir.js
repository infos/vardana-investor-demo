import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const CLIENT_ID = process.env.EPIC_CLIENT_ID;
const PRIVATE_KEY = process.env.EPIC_PRIVATE_KEY;
const TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';
const FHIR_BASE = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';
const JWKS_URL = 'https://vardana-investor-demo.vercel.app/.well-known/jwks.json';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const now = Math.floor(Date.now() / 1000);
  const assertion = jwt.sign(
    { iss: CLIENT_ID, sub: CLIENT_ID, aud: TOKEN_URL, jti: crypto.randomUUID(), exp: now + 300, iat: now, nbf: now },
    PRIVATE_KEY,
    { algorithm: 'RS384', header: { kid: 'vardana-epic-1', jku: JWKS_URL } }
  );

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: assertion,
    }).toString(),
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { patientId, resource } = req.query;

  if (!patientId) return res.status(400).json({ error: 'patientId required' });

  try {
    const token = await getAccessToken();
    const headers = { Authorization: `Bearer ${token}`, Accept: 'application/fhir+json' };

    if (resource === 'all') {
      // Fetch all available data for a patient in parallel
      const [patient, conditions, medications, labs, reports] = await Promise.all([
        fetch(`${FHIR_BASE}/Patient/${patientId}`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${FHIR_BASE}/Condition?patient=${patientId}&_count=20`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${FHIR_BASE}/MedicationRequest?patient=${patientId}&_count=20`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${FHIR_BASE}/Observation?patient=${patientId}&category=laboratory&_count=20`, { headers }).then(r => r.ok ? r.json() : null),
        fetch(`${FHIR_BASE}/DiagnosticReport?patient=${patientId}&_count=20`, { headers }).then(r => r.ok ? r.json() : null),
      ]);

      const name = patient?.name?.[0];
      const summary = {
        source: 'epic-fhir',
        patient: patient ? {
          id: patient.id,
          name: `${name?.given?.join(' ')} ${name?.family}`,
          dob: patient.birthDate,
          gender: patient.gender,
          address: patient.address?.[0] ? `${patient.address[0].city}, ${patient.address[0].state}` : null,
          phone: patient.telecom?.find(t => t.system === 'phone')?.value,
          race: patient.extension?.find(e => e.url?.includes('race'))?.extension?.[0]?.valueCoding?.display,
        } : null,
        conditions: conditions?.entry?.map(e => ({
          text: e.resource.code?.text,
          status: e.resource.clinicalStatus?.coding?.[0]?.code,
          code: e.resource.code?.coding?.[0]?.code,
        })).filter(c => c.text) || [],
        medications: medications?.entry?.map(e => ({
          name: e.resource.medicationReference?.display,
          status: e.resource.status,
          dosage: e.resource.dosageInstruction?.[0]?.text,
        })).filter(m => m.name) || [],
        labs: labs?.entry?.map(e => ({
          name: e.resource.code?.text,
          value: e.resource.valueQuantity?.value,
          unit: e.resource.valueQuantity?.unit,
          date: e.resource.effectiveDateTime?.substring(0, 10),
          referenceRange: e.resource.referenceRange?.[0]?.text,
        })).filter(l => l.name) || [],
        diagnosticReports: reports?.entry?.map(e => ({
          name: e.resource.code?.text,
          status: e.resource.status,
          date: e.resource.effectiveDateTime?.substring(0, 10),
        })).filter(d => d.name) || [],
      };

      return res.status(200).json(summary);
    }

    // Single resource fetch
    const url = resource
      ? `${FHIR_BASE}/${resource}?patient=${patientId}&_count=20`
      : `${FHIR_BASE}/Patient/${patientId}`;

    const fhirRes = await fetch(url, { headers });
    const data = await fhirRes.json();
    return res.status(fhirRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
