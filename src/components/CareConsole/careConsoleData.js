// Data helpers for the Care Console refactor.
// TODO(vardana): migrate trend + source tagging to the server-side
// Medplum resolver so components don't re-derive on every render.

// ─── Trend computation ───────────────────────────────────────────────
// Given an ordered list (newest-first or oldest-first) of numeric
// readings, return a TrendSpec: { arrow, series, window }. Caller
// supplies `target` separately because that's a clinical reference,
// not a property of the readings.
export function computeTrend(readings, { limit = 5, format } = {}) {
  if (!readings || !readings.length) return null;
  // Sort oldest → newest. Readings may arrive either direction.
  const sorted = [...readings].sort((a, b) => new Date(a.date) - new Date(b.date));
  const tail = sorted.slice(-limit);
  if (tail.length < 2) {
    return {
      arrow: "→",
      series: format ? format(tail[0]) : String(tail[0].value),
      window: `${tail.length} reading, ${daySpan(tail)}d`,
    };
  }
  const first = tail[0];
  const last = tail[tail.length - 1];
  const delta = numericValue(last) - numericValue(first);
  const pctDelta = first && numericValue(first) ? Math.abs(delta / numericValue(first)) : 0;
  let arrow;
  if (pctDelta < 0.02) arrow = "→";
  else if (delta > 0) arrow = "↑";
  else arrow = "↓";

  const formatted = tail.map(r => (format ? format(r) : String(numericValue(r))));
  // If trend is flat, show a compact stability summary rather than a
  // long arrow chain that reads as noise.
  const series = arrow === "→"
    ? `stable ±${stableSpread(tail).toFixed(1)}`
    : formatted.join(" → ");

  return {
    arrow,
    series,
    window: `${tail.length} readings, ${daySpan(tail)}d`,
  };
}

function numericValue(r) {
  if (typeof r === "number") return r;
  if (r && typeof r === "object") {
    if (typeof r.value === "number") return r.value;
    if (typeof r.systolic === "number") return r.systolic;
  }
  return 0;
}

function stableSpread(readings) {
  const vals = readings.map(numericValue);
  return Math.max(...vals) - Math.min(...vals);
}

function daySpan(readings) {
  if (!readings.length) return 0;
  const first = new Date(readings[0].date);
  const last = new Date(readings[readings.length - 1].date);
  if (isNaN(first.getTime()) || isNaN(last.getTime())) return readings.length;
  return Math.max(1, Math.round((last - first) / (1000 * 60 * 60 * 24)));
}

// ─── Adherence source tagging ────────────────────────────────────────
// BP monitoring / weight / activity are device-backed (high confidence).
// Medication rows are voice self-report only (low confidence, stated).
// TODO(vardana): once Medplum carries a source/confidence field per
// adherence record, read from the record instead of deriving by label.
export function sourceForAdherence(label) {
  const l = (label || "").toLowerCase();
  if (/bp monitoring/.test(l)) {
    return { source: "device sync", confidence: "high" };
  }
  if (/activity/.test(l)) {
    return { source: "device sync", confidence: "high" };
  }
  if (/weight/.test(l)) {
    return { source: "device sync", confidence: "high" };
  }
  // Medication rows (Lisinopril, Other meds, etc.) are voice-only today.
  return { source: "self-reported", confidence: "low", detail: "voice check-ins, 7d" };
}

// ─── Marcus demo sessions ────────────────────────────────────────────
// Hard-coded for Teja calibration. Real transcripts + outcome state so
// the Sessions tab reads as the product's spine. Replace with Medplum
// Communication/Encounter resources + Session.transcript sidecar once
// seeded.
export const MARCUS_SESSIONS = [
  {
    id: "mw-apr-24",
    date: "Apr 24, 8:14 AM",
    sortDate: "2026-04-24T08:14:00",
    durationSec: 234,
    synthesis:
      "BP 158/98, fourth consecutive reading above goal. Patient denies symptoms. Confirmed missed Lisinopril dose yesterday evening. Reinforced evening routine; same-day coordinator callback flagged.",
    outcome: { state: "sameDay", reason: "BP ≥155/95 + missed dose" },
    transcript: [
      "AI: Good morning Marcus, it's Vardana checking in. I have your home BP reading from this morning at 158 over 98. How are you feeling?",
      "Marcus: Honestly not great. I've had a headache since last night and my blood pressure cuff keeps reading high.",
      "AI: I'm sorry to hear that. A headache with a BP that high matters. Any vision changes, chest pain, or trouble breathing?",
      "Marcus: No, none of that. Just the headache.",
      "AI: Okay, noting that. Let's look back — yesterday your reading was 154 over 96, the day before was 148 over 94. That's four days trending up. Did you take your Lisinopril last night?",
      "Marcus: I don't think I did. I got home late and just went to bed.",
      "AI: Thanks for telling me. Missing a dose with this pattern is the kind of thing David Park needs to know about. I'm going to flag this as a same-day callback so he can reach you within a few hours. Stay hydrated, take this morning's dose with food, and recheck your BP in two hours.",
      "Marcus: Okay, will he call the cell?",
      "AI: Yes, on the number we have on file. If the headache gets worse or you develop any of those symptoms I mentioned, call 911 — don't wait for the callback.",
    ].join("\n"),
  },
  {
    id: "mw-apr-22",
    date: "Apr 22, 7:58 AM",
    sortDate: "2026-04-22T07:58:00",
    durationSec: 212,
    synthesis:
      "BP 150/92. Patient reported taking Lisinopril and metformin. Walked through BP cuff technique — patient confirmed sitting position and arm support. No escalation.",
    outcome: { state: "watch", reason: "BP above target, asymptomatic" },
    transcript: [
      "AI: Morning Marcus, Vardana checking in. I see your BP this morning was 150 over 92.",
      "Marcus: Yeah, a little high again.",
      "AI: A little — it's been hovering above your 130 over 80 target for a few days now. Have you been taking your meds?",
      "Marcus: Yep, Lisinopril last night, metformin this morning.",
      "AI: Good. Can we walk through how you're taking the reading? Sitting, back supported, arm at heart level?",
      "Marcus: I think so. I do it at the kitchen table.",
      "AI: That works. Just make sure the cuff is on bare skin, not over a sleeve, and rest two minutes before starting. I'll note technique reviewed today. If it stays above 150 for another two days we'll want David to step in.",
    ].join("\n"),
  },
  {
    id: "mw-apr-19",
    date: "Apr 19, 8:02 AM",
    sortDate: "2026-04-19T08:02:00",
    durationSec: 268,
    synthesis:
      "BP 142/88. Discussed diet — patient reports takeout 4 of last 7 dinners. Reviewed sodium targets. Patient confirmed medication adherence.",
    outcome: { state: "watch", reason: "Diet driver identified" },
    transcript: [
      "AI: Hi Marcus, Vardana here. Your reading today is 142 over 88, up a bit from last week.",
      "Marcus: Yeah I figured, I've been eating out a lot.",
      "AI: How many dinners this past week were takeout?",
      "Marcus: Four, maybe five. Busy work stretch.",
      "AI: That's a big sodium load, and on a week where your BP is creeping up it shows. Your target is under 2,300 mg a day — most takeout dinners put you over that in one meal. Are you still on Lisinopril and metformin as prescribed?",
      "Marcus: Yep, haven't missed those.",
      "AI: Good. Let's plan to bring dinners home a few nights this week and I'll check in Monday.",
    ].join("\n"),
  },
  {
    id: "mw-apr-15",
    date: "Apr 15, 8:20 AM",
    sortDate: "2026-04-15T08:20:00",
    durationSec: 198,
    synthesis:
      "BP 134/84. Stable. Patient reports medication adherence and walking 20 min daily. No new symptoms.",
    outcome: { state: "stable", reason: "At goal, no symptoms" },
    transcript: [
      "AI: Morning Marcus. Home BP this morning is 134 over 84 — right around your goal.",
      "Marcus: Yeah I've been feeling good.",
      "AI: Meds on schedule?",
      "Marcus: Lisinopril at bedtime, metformin with breakfast. Both every day.",
      "AI: Walking?",
      "Marcus: About 20 minutes after dinner most days.",
      "AI: That's great. Keep this pattern. I'll check in again later this week.",
    ].join("\n"),
  },
  {
    id: "mw-apr-12",
    date: "Apr 12, 7:49 AM",
    sortDate: "2026-04-12T07:49:00",
    durationSec: 342,
    synthesis:
      "Weekly structured check-in. BP 131/82, fasting glucose 118. Reviewed evening Lisinopril timing and AM weight. A1c due in 6 weeks.",
    outcome: { state: "stable", reason: "On plan" },
    transcript: [
      "AI: Hi Marcus, our weekly check-in. BP 131 over 82, fasting glucose 118.",
      "Marcus: Good numbers.",
      "AI: They are. Any new symptoms this week — headaches, dizziness, swelling in the feet?",
      "Marcus: Nope.",
      "AI: Lisinopril in the evening?",
      "Marcus: Yes, with my toothbrush routine so I don't forget.",
      "AI: Smart. Your next A1c draw is in six weeks — I'll remind you when we're two weeks out.",
    ].join("\n"),
  },
];

export const MARCUS_CROSS_SESSION_INSIGHT = {
  severity: "watch",
  title: "Adherence-outcome mismatch",
  body: "Patient reported medication adherence in 6 of 7 voice sessions. Home BP trending up: 134 → 142 → 150 → 158 over 12 days. Technique reviewed Apr 22; dose confirmed missed Apr 23. Possible partial-adherence pattern beyond single acute miss — recheck 48h.",
  flaggedAt: "Apr 24",
};

// Derive cadence stats from a list of sessions with { durationSec, sortDate }.
export function cadenceFromSessions(sessions) {
  if (!sessions || !sessions.length) return null;
  const total = sessions.length;
  const durations = sessions.map(s => s.durationSec).filter(n => typeof n === "number");
  const avg = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;
  // All scripted sessions are completed; structure for future partial states.
  const completed = sessions.filter(s => s.outcome?.state !== "incomplete").length;
  const completionRate = total ? completed / total : 0;
  const sorted = [...sessions].sort((a, b) => new Date(b.sortDate) - new Date(a.sortDate));
  const last = sorted[0]?.date || null;
  const firstDate = new Date(sorted[sorted.length - 1]?.sortDate || Date.now());
  const lastDate = new Date(sorted[0]?.sortDate || Date.now());
  const spanMs = Math.max(0, lastDate - firstDate);
  const windowDays = Math.max(1, Math.ceil(spanMs / (1000 * 60 * 60 * 24))) || 7;
  return {
    totalSessions: total,
    windowDays,
    avgDurationSec: avg,
    completionRate,
    lastSession: last,
  };
}
