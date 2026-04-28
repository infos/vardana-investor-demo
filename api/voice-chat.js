/**
 * api/voice-chat.js
 *
 * Vercel function backing the in-browser voice/chat call surface for
 * cardiometabolic (HTN + T2DM) patients. CHF / Sarah Chen support has been
 * removed — all decompensation logic was excised in favor of the deterministic
 * escalation rule set at `api/_lib/escalation.js`.
 *
 * Pipeline per request:
 *   1. Parse vitals + symptoms + adherence signals from the message stream.
 *   2. Build a `ScenarioInput` via `api/_lib/build_scenario_from_fhir.js`.
 *   3. Run `assessEscalationState` — deterministic, guideline-cited.
 *   4. Inject the resulting `{state, subtype, triggers, citation}` into the
 *      system prompt as a hard constraint and into the response payload.
 *   5. Stream Claude's reply back to the browser.
 *
 * The LLM does the patient-facing language; the escalation decision is the
 * rule set's, not the model's.
 */

const { assessEscalationState } = require('./_lib/escalation.js');
const { buildScenarioFromInputs } = require('./_lib/build_scenario_from_fhir.js');

const API_KEY = process.env.ANTHROPIC_API_KEY;

// ── AWS Bedrock config ─────────────────────────────────────────────────────
const USE_BEDROCK = process.env.USE_BEDROCK !== 'false';
const BEDROCK_REGION = process.env.AWS_REGION || 'us-east-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-sonnet-4-6';

let bedrockClient = null;
function getBedrockClient() {
  if (!bedrockClient) {
    const { BedrockRuntimeClient } = require('@aws-sdk/client-bedrock-runtime');
    bedrockClient = new BedrockRuntimeClient({
      region: BEDROCK_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return bedrockClient;
}

// =============================================================================
// Parse vitals, symptoms, and adherence signals from the message stream.
// =============================================================================

function parsePatientMessage(messages) {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const bpMatch = text.match(/\b(\d{2,3})\s*\/\s*(\d{2,3})\b/);
  const glucoseMatch = text.match(/\b(\d{2,3})\s*(?:mg\/?dL|mg per dL|glucose|sugar|fasting)/i);
  const dayMatch = text.match(/\bDay\s+(\d+)/i);
  const missedMatch = (!/missed|forgot|skipped|ran out/i.test(text)) ? null
    : text.match(/(\d+)\s*(?:days?|doses?|times?)/i);
  return {
    systolic: bpMatch ? parseInt(bpMatch[1]) : null,
    diastolic: bpMatch ? parseInt(bpMatch[2]) : null,
    glucose: glucoseMatch ? parseInt(glucoseMatch[1]) : null,
    journeyDay: dayMatch ? parseInt(dayMatch[1]) : null,
    missedDoses: missedMatch ? parseInt(missedMatch[1]) : 0,
    adherenceGap: /missed|forgot|skipped|ran out/i.test(text),
    postActivity: /just (walked|ran|exercised)|after (walking|running|exercise)|finished\s+(walking|exercise)/i.test(text),
  };
}

function parseSymptoms(messages) {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  return {
    severe_headache: /(severe|terrible|worst|pounding|splitting).{0,20}headache|headache.{0,20}(severe|terrible)/i.test(text),
    headache_worst_of_life: /worst.{0,15}headache.{0,15}(life|ever)/i.test(text),
    vision_changes: /(blurr|double vision|spots|vision.{0,15}(chang|off|weird)|seeing.{0,15}spot)/i.test(text),
    // Broadened from the original (pain|press|tight) set so common patient
    // wording lands. "Some chest discomfort" was missing the trigger and the
    // SAME-DAY chest-pain-in-cardiometabolic rule never fired.
    chest_pain: /chest.{0,15}(pain|press|tight|discomfort|ache|heav|squeez|hurt|flutter)|(pain|pressure|squeez|tight|discomfort)\w*.{0,10}chest/i.test(text),
    focal_neuro_deficit: /numb|weakness on one side|slurred|can('?t| not) speak|drooping/i.test(text),
    kussmaul_breathing: /breathing (deep|fast|hard).{0,20}(can('?t)? stop|won'?t stop)|kussmaul|fruity breath|ketone/i.test(text),
    altered_mental_status: /confused|disoriented|can('?t| not) think|foggy|out of it|not making sense/i.test(text),
    neuroglycopenic: /shaky|sweaty|trembl|light.?headed|dizzy.{0,20}(eat|sugar)|cold sweat/i.test(text),
    confusion: /confused|disoriented/i.test(text),
    slurred_speech: /slur(red|ring)? speech|words.{0,15}wrong/i.test(text),
    osmotic_symptoms: /(peeing|urinat).{0,20}(more|a lot|all the time)|always thirsty|drinking.{0,15}(more|a lot)/i.test(text),
    polyuria: /(peeing|urinat).{0,20}(more|a lot|all the time)/i.test(text),
    polydipsia: /always thirsty|drinking.{0,15}(more|a lot)|can('?t| not) stop drinking/i.test(text),
    nocturia: /up.{0,15}night.{0,15}pee|waking.{0,15}pee/i.test(text),
    severe_fatigue: /(extreme|severe|crushing).{0,15}(fatigue|tired|exhausted)/i.test(text),
    nausea: /nause|sick to my stomach|throwing up|vomit/i.test(text),
  };
}

// =============================================================================
// Pacing
// =============================================================================

function buildPacingInstruction(turn, maxTurns) {
  if (turn == null || maxTurns == null) return '';
  const remaining = maxTurns - turn;
  if (remaining <= 2) return `\n\nPACING: FINAL exchange. Summarize findings, confirm coordinator follow-up if needed, say a warm goodbye. Set phase to "done".\nCRITICAL EXCEPTION: If the patient has JUST raised a new symptom or concern, do NOT wrap up yet. Acknowledge the concern, ask the most important follow-up question, and note it for the care coordinator. Patient safety always overrides pacing.`;
  if (remaining <= 4) return `\n\nPACING: ${remaining} exchanges left. Begin wrapping up — move to guidance/escalation now.\nIMPORTANT: If the patient raises a new symptom, ALWAYS address it before wrapping up.`;
  if (remaining <= 6) return `\n\nPACING: ${remaining} exchanges left. Progress efficiently through remaining topics.`;
  return '';
}

// =============================================================================
// System prompt — includes the deterministic escalation result as a hard
// constraint. The LLM may not raise or lower the state. It owns wording only.
// =============================================================================

function escalationGuidance(state) {
  switch (state) {
    case 'IMMEDIATE':
      return [
        'STATE IS IMMEDIATE — this is a clinical emergency.',
        'FIRST SENTENCE must be: "Please call 911 or go to your nearest emergency room right now."',
        'Briefly state which signals drove the assessment (BP, glucose, symptom).',
        'Tell the patient you are also notifying their care team.',
        'Do NOT ask follow-up questions. Do NOT delay.',
      ].join(' ');
    case 'SAME-DAY':
      return [
        'STATE IS SAME-DAY — needs coordinator attention within hours, not an emergency.',
        'Open with: "I\'ve reviewed your readings and I\'m flagging this for your coordinator today."',
        'Name the specific signals (BP, adherence, glucose pattern).',
        'Say "I\'m sending a priority alert to your coordinator right now" and set generateAlert=true.',
        'Close with safety guidance and a coordinator-callback timeline.',
      ].join(' ');
    case 'WATCH':
      return [
        'STATE IS WATCH — coordinator review within 24 hours.',
        'Open by stating the specific signal driving the watch (e.g. Stage 1 BP drift, A1c crossing).',
        'Confirm adherence and ask one targeted symptom question.',
        'Reassure the patient — WATCH is monitoring, not urgent. Do not say "911" or "emergency".',
        'Note that the coordinator will follow up; do NOT set generateAlert=true unless something new surfaces.',
      ].join(' ');
    case 'ROUTINE':
    default:
      return [
        'STATE IS ROUTINE — readings are within tolerance or contextualized (post-activity, cuff position).',
        'Open positively: brief acknowledgment of how the patient is doing.',
        'Mention the contextual factor if relevant ("a reading right after exercise can run high — let\'s recheck rested").',
        'Confirm adherence quickly. Keep the call short and reassuring.',
        'Do NOT set generateAlert=true.',
      ].join(' ');
  }
}

function buildMarcusPrompt(ctx, turn, maxTurns, escalation) {
  return `You are the Vardana AI Care Concierge conducting a structured check-in with Marcus Williams, 58, male. He is on Day 22 of continuous cardiometabolic care (hypertension + type 2 diabetes).

## Patient context
- Conditions: Essential hypertension (I10), Type 2 diabetes mellitus without complications (E11.9), Hyperlipidemia (E78.5), Obesity (BMI 31.4)
- Care coordinator: Nurse David Park
- Primary care physician: Dr. Angela Torres, Internal Medicine
- Today's BP: 158/98 mmHg — a 4-day worsening trend from 142/88 four days ago
- Today's fasting glucose: 186 mg/dL
- Medications: Lisinopril 20mg daily AM, Amlodipine 5mg daily, Metformin 1000mg BID with meals, Atorvastatin 40mg daily PM, Aspirin 81mg daily
- Clinical concern: Patient likely missed Lisinopril for a few days. Unconfirmed until reported.

━━━ DETERMINISTIC ESCALATION (computed before the call — DO NOT override) ━━━
State:    ${escalation.state}
Subtype:  ${escalation.subtype}
Triggers: ${escalation.triggers.join(', ')}
Citation: ${escalation.citation}
${escalationGuidance(escalation.state)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Conversation protocol (5–7 exchanges)
1. GREETING — reference name and Day 22; state today's BP and the trend.
2. SYMPTOM CHECK — ask how he is feeling. Apply SYMPTOM RULE if anything is reported.
3. MEDICATION ADHERENCE — explicitly ask whether he has been taking BP medications this week. Lisinopril is the critical one.
4. SAFETY SCREEN — in ONE response: "Are you having any chest pain, shortness of breath, or vision changes?" Wait for one combined answer.
5. ESCALATION — match the state above. For SAME-DAY: dispatch the coordinator alert (set generateAlert=true). For WATCH/ROUTINE: do NOT escalate; finish calmly.
6. CLOSE — in the same message as the escalation (or after the safety screen for non-escalation states): give care guidance and confirm coordinator timeline.

## SYMPTOM RULE — CRITICAL
When a symptom is reported you MUST:
1. Acknowledge it directly by name.
2. Connect it to the clinical data (e.g. "a headache combined with a rising BP trend").
3. State the care team will be informed.
NEVER say "great", "good to hear", or any positive affirmation after a symptom report.

## Safety guardrails
- Never diagnose.
- Never suggest starting, stopping, or changing a medication.
- Never override the escalation state above. The state was set deterministically per the 2025 AHA/ACC HTN Guideline / ADA Standards of Care 2026.
- Use simple, warm language. No jargon.
- Do not use em-dashes in spoken text.
- NEVER ask "how are you feeling today?" more than once per call.
- NEVER add pronunciation notes, TTS hints, or meta-commentary about your own response.

RESPONSE FORMAT: phone call — 2–4 short sentences. Metadata LAST in <metadata> tags.
Example: Good morning Marcus, this is the Vardana care concierge calling for your Day 22 check-in. I've pulled up your latest readings and want to talk about what I'm seeing.
<metadata>{"fhirQueries":[{"method":"GET","path":"/Patient/marcus-williams","result":"Patient loaded"}],"escalationState":"${escalation.state}","escalationSubtype":"${escalation.subtype}","generateAlert":false,"assessment":{"headache":"Pending","lisinopril":"Pending"},"phase":"greeting"}</metadata>

METADATA FIELDS:
- fhirQueries: queries run this turn. Include /Patient, /Observation, /CarePlan, etc.
- escalationState: ${escalation.state} — DO NOT change.
- escalationSubtype: ${escalation.subtype} — DO NOT change.
- generateAlert: ${escalation.state === 'SAME-DAY' || escalation.state === 'IMMEDIATE' ? 'TRUE — state is ' + escalation.state + '. Set when you tell the patient about the alert.' : 'Set true ONLY when a new emergency-tier symptom surfaces during the call.'}
- assessment: confirmed findings as key-value pairs.
- phase: greeting | symptoms | medications | safety | escalation | done. Only set "done" on your FINAL closing message.` + buildPacingInstruction(turn, maxTurns);
}

function buildGenericPatientPrompt(ctx, turn, maxTurns, escalation) {
  const conditionsList = (ctx.conditions || []).filter(c => c.status === 'active').map(c => c.text).join(', ') || 'None recorded';
  const medsList = (ctx.medications || []).map(m => `${m.name}${m.dosage ? ' (' + m.dosage + ')' : ''}`).join(', ') || 'None recorded';
  // Render labs grouped by name so trend direction is visible (e.g. HbA1c
  // 6.2 -> 6.3 -> 6.4). Falls back to a flat list when only one reading per
  // analyte exists.
  const labsList = ctx.labs || [];
  const labsByName = labsList.reduce((acc, l) => {
    if (!l?.name) return acc;
    if (!acc[l.name]) acc[l.name] = [];
    acc[l.name].push(l);
    return acc;
  }, {});
  const labsSummary = Object.keys(labsByName).length
    ? Object.entries(labsByName).map(([name, rows]) => {
        const sorted = rows.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        const seq = sorted.map(r => `${r.value}${r.unit ? ' ' + r.unit : ''}${r.date ? ' (' + r.date + ')' : ''}`).join(' -> ');
        return `${name}: ${seq}`;
      }).join('\n  ')
    : 'No recent labs';
  const latestBpLine = ctx.latestBp
    ? `${ctx.latestBp.systolic}/${ctx.latestBp.diastolic}${ctx.latestBp.date ? ' on ' + String(ctx.latestBp.date).slice(0, 10) : ''}`
    : 'No BP on file';
  const firstName = (ctx.name || 'there').split(' ')[0];
  const patientId = (ctx.name || 'patient').toLowerCase().replace(/\s+/g, '-');
  const isHtnPatient = /hypertensi|HTN/i.test(conditionsList);
  const isT2dmPatient = /diabetes|T2DM/i.test(conditionsList);
  const targetsBlock = [
    isHtnPatient ? '- BP target: <130/80. 130-139/80-89 is Stage 1; >=140/90 is Stage 2; >=180/120 is hypertensive crisis.' : '',
    isT2dmPatient ? '- A1c target: <7%. >=6.5% is the T2DM diagnostic threshold.' : '',
    isHtnPatient ? '- LDL target: <100 mg/dL (general) / <70 mg/dL (high-risk cardiometabolic).' : '',
  ].filter(Boolean).join('\n');

  return `You are Vardana, an AI care concierge for cardiometabolic (HTN + T2DM) management. You are conducting a check-in with ${ctx.name}.

PATIENT PROFILE:
- ${ctx.name}, ${ctx.age || 'unknown'}-year-old ${ctx.gender || 'patient'}
- Conditions: ${conditionsList}
- Medications: ${medsList}
- Latest BP: ${latestBpLine}
- Labs (oldest -> newest):
  ${labsSummary}

CLINICAL TARGETS FOR THIS PATIENT:
${targetsBlock || '- (no explicit targets — describe values factually without judgment)'}

━━━ DATA INTERPRETATION RULES (read before greeting) ━━━━━━━━━━━━━━━━━━━━━━━━━
- READ the lab sequences left-to-right (oldest -> newest). If the most recent
  value is HIGHER than the prior, the trend is RISING -- describe it that way.
  If LOWER, FALLING. Only call something "stable" if the values are within
  ~5% of each other across the full sequence.
- NEVER describe a Stage 1 BP (130-139/80-89) or Stage 2 BP (>=140/90) as
  "normal", "looking good", or "stable". State the actual reading and
  whether it is at, above, or below this patient's target.
- NEVER editorialize ("great news", "looking stable") without grounding the
  claim in the specific numeric trend. If asked to characterize, quote the
  actual numbers.
- For HTN patients: 138/88 is NOT normal -- it is Stage 1 above the
  <130/80 cardiometabolic target.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━ DETERMINISTIC ESCALATION (computed before the call — DO NOT override) ━━━
State:    ${escalation.state}
Subtype:  ${escalation.subtype}
Triggers: ${escalation.triggers.join(', ')}
Citation: ${escalation.citation}
${escalationGuidance(escalation.state)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONVERSATION OBJECTIVE:
1. Open by stating the specific signals that drove the state.
2. Ask targeted symptom questions appropriate to ${ctx.name}'s conditions.
3. Confirm medication adherence.
4. ${escalation.state === 'IMMEDIATE'
    ? 'EMERGENCY — first sentence must direct to 911. Briefly cite the trigger. Notify coordinator. Do not ask follow-ups.'
    : escalation.state === 'SAME-DAY'
    ? 'Dispatch the coordinator alert and set generateAlert=true. Provide safety guidance.'
    : escalation.state === 'WATCH'
    ? 'Note the watch-level finding, confirm adherence, reassure. Do not say "911" or "emergency". Do not set generateAlert=true.'
    : 'Reassure, note any contextual factors (post-activity, cuff position) that explain the reading. Do not set generateAlert=true.'}

SAFETY RULES:
- Never suggest changing any medication. If asked: "That's a great question for your next appointment."
- Never diagnose. Use "your medical history" not "you have X."
- Never override the deterministic state. It is computed from guideline rules.
- TRANSPARENCY: always explain which specific signals drove the assessment.
- NEVER DISMISS A PATIENT CONCERN. If a symptom is reported you MUST acknowledge and follow up before wrapping.
- LISTEN FIRST. Do not pre-empt the patient's response.
- NEVER ask "how are you feeling today?" more than once per call.
- NEVER add pronunciation notes, TTS hints, or meta-commentary about your own response.
- Use simple, warm language. No jargon.

RESPONSE FORMAT: phone call — 2–4 sentences. Metadata LAST in <metadata> tags.
Example: Hi ${firstName}, this is the Vardana care concierge. I've reviewed your recent readings and want to walk through what I'm seeing.
<metadata>{"fhirQueries":[{"method":"GET","path":"/Patient/${patientId}","result":"Patient loaded"}],"escalationState":"${escalation.state}","escalationSubtype":"${escalation.subtype}","generateAlert":false,"assessment":{},"phase":"greeting"}</metadata>

METADATA FIELDS:
- fhirQueries: include vitals, conditions, care plan at minimum.
- escalationState: ${escalation.state} — DO NOT change.
- escalationSubtype: ${escalation.subtype} — DO NOT change.
- generateAlert: ${escalation.state === 'SAME-DAY' || escalation.state === 'IMMEDIATE' ? 'TRUE — state is ' + escalation.state + '.' : 'Set true ONLY when a new emergency-tier symptom surfaces during the call.'}
- assessment: confirmed findings as key-value pairs.
- phase: greeting | symptoms | medications | guidance | escalation | done. Only set "done" on your FINAL closing message.` + buildPacingInstruction(turn, maxTurns);
}

// =============================================================================
// State → riskScore back-compat shim. The front-end still surfaces a numeric
// risk; map deterministic state to a stable score so old UI bindings keep
// working while the new escalation* fields drive the substantive UI.
// =============================================================================

function stateToRiskScore(state) {
  switch (state) {
    case 'IMMEDIATE': return 90;
    case 'SAME-DAY': return 73;
    case 'WATCH': return 50;
    case 'ROUTINE':
    default: return 25;
  }
}

// =============================================================================
// Build the FHIR-mock query list shown in the right pane (unchanged surface).
// =============================================================================

function buildPreFetchQueries(ctx, parsed, scenario, escalation) {
  const pid = ctx ? (ctx.name || 'patient').toLowerCase().replace(/\s+/g, '-') : 'patient';
  const bpSys = scenario.vitals.current_bp_systolic;
  const bpDia = scenario.vitals.current_bp_diastolic;
  const glucose = scenario.vitals.current_glucose_mgdl;
  const a1c = scenario.labs.a1c_pct;

  const queries = [
    { method: 'GET', path: `/Patient/${pid}`,
      result: ctx ? `${ctx.name} loaded` : 'Patient loaded' },
    { method: 'GET', path: `/Observation?patient=${pid}&category=vital-signs&_sort=-date`,
      result: bpSys != null ? `Latest BP: ${bpSys}/${bpDia} mmHg`
            : glucose != null ? `Latest glucose: ${glucose} mg/dL`
            : 'No recent vitals' },
    { method: 'GET', path: `/MedicationRequest?patient=${pid}&status=active`,
      result: `${(ctx?.medications || []).length} active medications` },
    { method: 'GET', path: `/CarePlan?patient=${pid}&status=active`,
      result: `Day ${parsed.journeyDay ?? '?'} of program` },
  ];

  if (a1c != null) {
    queries.push({
      method: 'GET',
      path: `/Observation?patient=${pid}&code=4548-4&_sort=-date`,
      result: `Latest A1c: ${a1c}%`,
    });
  }

  if (escalation.state === 'SAME-DAY' || escalation.state === 'IMMEDIATE') {
    queries.push(
      {
        method: 'POST',
        path: '/Flag',
        result: `Alert queued · ${escalation.state} · ${escalation.subtype}`,
      },
      {
        method: 'POST',
        path: '/Communication',
        result: 'Care team notification prepared',
      },
    );
  }

  return queries;
}

// =============================================================================
// Handler
// =============================================================================

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

  const { messages, patientContext, evalMode, turn, maxTurns, chatMode, stream: streamRequested } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages array required' });

  try {
    // ── 1. Parse the message stream into structured signals ──────────────────
    const parsed = parsePatientMessage(messages);
    const symptoms = parseSymptoms(messages);

    // ── 2. Build a ScenarioInput. For Marcus, anchor on his known WATCH-state
    //       baseline (BP 158/98 trending up from 142/88, glucose 186, missed
    //       Lisinopril); the in-call signals override the baseline.
    const isMarcusContext = patientContext && /marcus/i.test(patientContext.name || '');
    const baselineBp = isMarcusContext
      ? [
          { date: today(0), systolic: parsed.systolic ?? 158, diastolic: parsed.diastolic ?? 98 },
          { date: today(-1), systolic: 156, diastolic: 96 },
          { date: today(-2), systolic: 152, diastolic: 94 },
          { date: today(-4), systolic: 142, diastolic: 88 },
          { date: today(-6), systolic: 138, diastolic: 86 },
        ]
      : parsed.systolic
      ? [{ date: today(0), systolic: parsed.systolic, diastolic: parsed.diastolic }]
      : [];
    const baselineGlucose = isMarcusContext
      ? [{ date: today(0), value: parsed.glucose ?? 186, fasting: true }]
      : parsed.glucose
      ? [{ date: today(0), value: parsed.glucose, fasting: true }]
      : [];

    const conditionsTags = isMarcusContext ? ['HTN', 'T2DM', 'HLD'] : extractConditionTags(patientContext);
    const patientForRules = {
      conditions: conditionsTags,
      ckd_stage: patientContext?.ckdStage,
    };

    const scenario = buildScenarioFromInputs({
      patient: patientForRules,
      bpReadings: baselineBp,
      glucoseReadings: baselineGlucose,
      a1cReadings: isMarcusContext ? [{ date: today(-7), value: 8.4 }, { date: today(-90), value: 7.4 }] : [],
      egfrReadings: isMarcusContext ? [{ date: today(-7), value: 72 }] : [],
      symptoms,
      context: {
        call_type: chatMode ? 'chat_check_in' : 'voice_check_in',
        adherence_gap: parsed.adherenceGap || (isMarcusContext && parsed.missedDoses >= 1),
        missed_doses_past_week: parsed.missedDoses,
        post_activity: parsed.postActivity,
      },
    });

    // ── 3. Run the deterministic rule set ───────────────────────────────────
    const escalation = assessEscalationState(scenario, patientForRules);

    // ── 4. Build pre-fetch FHIR queries (right-pane Activity stream) ────────
    const preFetchQueries = buildPreFetchQueries(patientContext, parsed, scenario, escalation);

    // ── 5. Build the system prompt with escalation as a hard constraint ─────
    let systemPrompt = isMarcusContext
      ? buildMarcusPrompt(patientContext, turn, maxTurns, escalation)
      : buildGenericPatientPrompt(patientContext || { name: 'Patient' }, turn, maxTurns, escalation);

    if (chatMode) {
      systemPrompt += [
        '',
        '',
        'CHAT MODE RULES (read carefully — different shape than voice):',
        '- Keep responses to 2 short sentences. Be direct, no filler.',
        '- No metadata tags needed in chat mode. Reply text only.',
        '- READ THE CONVERSATION HISTORY before replying. Each user message is a turn; your previous assistant messages are visible to the patient on screen.',
        '- DO NOT re-greet, re-introduce yourself, or restate the patient\'s name + day + BP/glucose if you have already done so in an earlier assistant message in this conversation.',
        '- A short user reply like "hi", "hello", "ok", "sure", "yes" is NOT a fresh start — it is the patient continuing. Acknowledge briefly (1 short clause) and immediately advance to the NEXT protocol step you have not done yet (symptom check → adherence → safety screen → escalation/close).',
        '- Track which protocol step you are on by inspecting your prior assistant messages, not by defaulting to step 1.',
        '- Still follow all safety rules: 911 for IMMEDIATE, priority alert wording for SAME-DAY, full transparency about what you can and cannot do.',
      ].join('\n');
    }

    // ── 6. Call Claude ──────────────────────────────────────────────────────
    const useStreaming = streamRequested && !evalMode;
    const maxTokens = chatMode ? 150 : 350;

    let apiRes;
    if (USE_BEDROCK) {
      const client = getBedrockClient();
      if (useStreaming) {
        const { InvokeModelWithResponseStreamCommand } = require('@aws-sdk/client-bedrock-runtime');
        const cmd = new InvokeModelWithResponseStreamCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
          }),
        });
        let bedrockStream;
        try { bedrockStream = await client.send(cmd); }
        catch (err) { return res.status(502).json({ error: `Bedrock API error: ${err.message}` }); }
        apiRes = { __bedrock_stream: bedrockStream, ok: true };
      } else {
        const { InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
        const cmd = new InvokeModelCommand({
          modelId: BEDROCK_MODEL_ID,
          contentType: 'application/json',
          accept: 'application/json',
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages,
          }),
        });
        let bedrockRes;
        try { bedrockRes = await client.send(cmd); }
        catch (err) { return res.status(502).json({ error: `Bedrock API error: ${err.message}` }); }
        const body = JSON.parse(new TextDecoder().decode(bedrockRes.body));
        apiRes = { ok: true, __bedrock_json: body };
      }
    } else {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
          stream: useStreaming,
        }),
      });
    }

    if (!apiRes.ok) {
      const err = typeof apiRes.text === 'function' ? await apiRes.text() : 'Unknown error';
      return res.status(apiRes.status || 502).json({ error: `Claude API error: ${err}` });
    }

    // Helper: build response metadata. The deterministic state cannot be
    // overridden by anything the LLM emits.
    const baseRiskScore = stateToRiskScore(escalation.state);
    const baseAlert = escalation.state === 'SAME-DAY' || escalation.state === 'IMMEDIATE';

    const buildMetadata = (fullText) => {
      const metaMatch = fullText.match(/<metadata>\s*([\s\S]*?)(?:<\/metadata>|$)/);
      const reply = fullText.replace(/<metadata>[\s\S]*$/, '').trim();
      let metadata = {
        fhirQueries: [],
        riskScore: baseRiskScore,
        generateAlert: baseAlert,
        assessment: isMarcusContext ? { headache: 'Pending', lisinopril: 'Pending' } : {},
        phase: 'greeting',
      };
      if (metaMatch) {
        try { metadata = { ...metadata, ...JSON.parse(metaMatch[1]) }; } catch { /* keep defaults */ }
      }
      metadata.fhirQueries = [...preFetchQueries, ...(metadata.fhirQueries || [])];
      // Authoritative deterministic fields — overwrite anything the model emitted.
      metadata.escalationState = escalation.state;
      metadata.escalationSubtype = escalation.subtype;
      metadata.escalationTriggers = escalation.triggers;
      metadata.escalationCitation = escalation.citation;
      metadata.riskScore = Math.max(metadata.riskScore || 0, baseRiskScore);
      if (baseAlert) metadata.generateAlert = true;
      return { reply, metadata };
    };

    // ── 7. Streaming path ───────────────────────────────────────────────────
    if (useStreaming) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.status(200);

      let fullText = '';
      let inMetadata = false;

      const processTextDelta = (text) => {
        fullText += text;
        if (!inMetadata) {
          if (fullText.includes('<metadata>')) {
            inMetadata = true;
            const before = text.split('<metadata>')[0];
            if (before) res.write(`data: ${JSON.stringify({ type: 'text', content: before })}\n\n`);
          } else {
            res.write(`data: ${JSON.stringify({ type: 'text', content: text })}\n\n`);
          }
        }
      };

      try {
        if (apiRes.__bedrock_stream) {
          const stream = apiRes.__bedrock_stream.body;
          for await (const event of stream) {
            if (event.chunk) {
              const parsed = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                processTextDelta(parsed.delta.text);
              }
            }
          }
        } else {
          const reader = apiRes.body.getReader();
          const decoder = new TextDecoder();
          let sseBuffer = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split('\n');
            sseBuffer = lines.pop();
            for (const line of lines) {
              if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
              let event;
              try { event = JSON.parse(line.slice(6)); } catch { continue; }
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
                processTextDelta(event.delta.text);
              }
            }
          }
        }
      } catch (streamErr) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: streamErr.message })}\n\n`);
        return res.end();
      }

      const { reply, metadata } = buildMetadata(fullText);
      res.write(`data: ${JSON.stringify({ type: 'done', reply, ...metadata })}\n\n`);
      return res.end();
    }

    // ── 8. Non-streaming path ───────────────────────────────────────────────
    const data = apiRes.__bedrock_json || await apiRes.json();
    const fullText = data.content?.[0]?.text || '';
    const { reply, metadata } = buildMetadata(fullText);
    const response = { reply, ...metadata };

    if (evalMode) {
      const toolsUsed = (metadata.fhirQueries || []).map(q => {
        if (/\/Patient\//.test(q.path))                                          return 'get_patient_summary';
        if (/\/Observation/.test(q.path))                                        return 'get_recent_vitals';
        if (/\/CarePlan/.test(q.path))                                           return 'get_journey_status';
        if (/\/Condition/.test(q.path))                                          return 'get_conditions';
        if (/\/MedicationRequest/.test(q.path))                                  return 'get_medications';
        if (/\/Flag|\/Communication/.test(q.path))                               return 'create_coordinator_alert';
        return null;
      }).filter(Boolean);
      response._evalMeta = { toolsUsed: [...new Set(toolsUsed)], alertFired: metadata.generateAlert || false };
      response.response = reply;
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function today(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function extractConditionTags(patientContext) {
  if (!patientContext) return [];
  const tags = new Set();
  for (const c of patientContext.conditions || []) {
    const text = (c.text || c.code || '').toLowerCase();
    if (/hypertensi|^i10/.test(text)) tags.add('HTN');
    if (/diabetes|^e1[01]/.test(text)) tags.add('T2DM');
    if (/hyperlipidemi|^e78/.test(text)) tags.add('HLD');
    if (/chronic kidney|ckd|^n18/.test(text)) tags.add('CKD');
    if (/obesity|^e66/.test(text)) tags.add('OBESITY');
  }
  return Array.from(tags);
}
