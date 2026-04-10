import React, { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip, CartesianGrid } from "recharts";
import { DEMO_BASE } from './demoPath';

// ── Data ──
const WEIGHT_DATA = [
  { day: 1, date: "Feb 15", weight: 187.2 },
  { day: 2, date: "Feb 16", weight: 187.0 },
  { day: 3, date: "Feb 17", weight: 186.8 },
  { day: 4, date: "Feb 18", weight: 186.6 },
  { day: 5, date: "Feb 19", weight: 186.4 },
  { day: 6, date: "Feb 20", weight: 186.2 },
  { day: 7, date: "Feb 21", weight: 186.0 },
  { day: 8, date: "Feb 22", weight: 185.8 },
  { day: 9, date: "Feb 23", weight: 185.7 },
  { day: 10, date: "Feb 24", weight: 185.6 },
  { day: 11, date: "Feb 25", weight: 185.5 },
  { day: 12, date: "Feb 26", weight: 185.4 },
  { day: 13, date: "Feb 27", weight: 186.5 },
  { day: 14, date: "Feb 28", weight: 187.7 },
];

const BP_DATA = [
  { date: "Feb 15", sys: 138, dia: 88 },
  { date: "Feb 19", sys: 134, dia: 84 },
  { date: "Feb 22", sys: 130, dia: 82 },
  { date: "Feb 24", sys: 128, dia: 80 },
  { date: "Feb 26", sys: 126, dia: 78 },
  { date: "Feb 27", sys: 132, dia: 84 },
  { date: "Feb 28", sys: 136, dia: 86 },
];



const ROSTER = [
  { id: 1, name: "Sarah Chen", age: 67, gender: "F", dob: { month: 7, day: 14, year: 1958 }, day: 15, phase: "Stabilize → Optimize", risk: 72, riskLevel: "high", alert: true, alertType: "Decompensation risk", alertTime: "38 min ago", trend: "worsening", scheduledOutreach: null, doctor: "Dr. James Harrington" },
  { id: 2, name: "Robert Williams", age: 74, gender: "M", dob: { month: 3, day: 22, year: 1951 }, day: 52, phase: "Optimize", risk: 34, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: "Today 2:00 PM · Voice", doctor: "Dr. Sarah Patel" },
  { id: 3, name: "Maria Gonzalez", age: 61, gender: "F", dob: { month: 11, day: 5, year: 1964 }, day: 8, phase: "Stabilize", risk: 45, riskLevel: "moderate", alert: false, trend: "improving", scheduledOutreach: "Tomorrow 10:00 AM · SMS", doctor: "Dr. Michael Torres" },
  { id: 4, name: "James Thompson", age: 79, gender: "M", dob: { month: 9, day: 18, year: 1946 }, day: 83, phase: "Maintain", risk: 22, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: null, doctor: "Dr. Lisa Chen" },
  { id: 5, name: "Marcus Williams", age: 58, gender: "M", dob: { month: 6, day: 10, year: 1967 }, day: 22, phase: "Stabilize → Optimize", risk: 53, riskLevel: "moderate", alert: true, alertType: "BP worsening trend", alertTime: "12 min ago", trend: "worsening", scheduledOutreach: null, doctor: "Dr. Angela Torres" },
];

// ── Patient Clinical Data (Robert, Maria, James) ──
const PATIENT_CLINICAL_DATA = {
  1: {
    dob: "July 14, 1958",
    conditions: ["HFpEF (EF 45%)", "Hypertension", "Type 2 Diabetes", "CKD Stage 3a"],
    medications: [
      { name: "Carvedilol", dose: "12.5mg", timing: "Twice daily (morning & evening)" },
      { name: "Lisinopril", dose: "10mg", timing: "Once daily (morning)" },
      { name: "Furosemide", dose: "40mg", timing: "Once daily (morning)" },
      { name: "Metformin", dose: "1000mg", timing: "Twice daily (with meals)" },
      { name: "Spironolactone", dose: "25mg", timing: "Once daily" },
    ],
    vitals: {
      weight: { current: 187.7, previous: 185.4, unit: "lbs", trend: "worsening", status: "warning" },
      bp: { sys: 136, dia: 86, status: "borderline", note: "Reversed from 126/78 best" },
      hr: { value: 82, status: "good", note: "Normal sinus rhythm" },
      spo2: { value: 96, status: "good" },
    },
    labs: [
      { name: "BNP", value: "485 pg/mL", date: "Mar 6", status: "elevated" },
      { name: "Creatinine", value: "1.4 mg/dL", date: "Mar 6", status: "borderline" },
      { name: "eGFR", value: "48 mL/min", date: "Mar 6", status: "warning" },
      { name: "Potassium", value: "4.5 mEq/L", date: "Mar 6", status: "good" },
    ],
    recentCheckins: [
      { date: "Today, 7:45 AM", summary: "AI concierge detected 2.3 lb weight gain over 48hrs. Patient reports increased fatigue and ankle swelling. Escalated to care coordinator." },
      { date: "Yesterday, 8:00 AM", summary: "Routine check-in. Weight 186.2 lbs (+1.1 from baseline). Patient reported feeling 'a little more tired.' Furosemide adherence confirmed." },
    ],
    allergy: "Aspirin",
    coordinator: "Rachel Kim, RN",
  },
  2: {
    dob: "March 22, 1951",
    conditions: ["HFpEF (EF 52%)", "Hypertension", "Atrial Fibrillation", "Hyperlipidemia"],
    medications: [
      { name: "Metoprolol Succinate", dose: "50mg", timing: "Once daily (morning)" },
      { name: "Lisinopril", dose: "20mg", timing: "Once daily (morning)" },
      { name: "Apixaban", dose: "5mg", timing: "Twice daily" },
      { name: "Atorvastatin", dose: "40mg", timing: "Once daily (evening)" },
      { name: "Spironolactone", dose: "25mg", timing: "Once daily" },
    ],
    vitals: {
      weight: { current: 201.4, previous: 201.8, unit: "lbs", trend: "stable", status: "good" },
      bp: { sys: 128, dia: 76, status: "good", note: "Well controlled" },
      hr: { value: 68, status: "good", note: "Normal, rate-controlled" },
      spo2: { value: 97, status: "good" },
    },
    labs: [
      { name: "BNP", value: "145 pg/mL", date: "Feb 24", status: "borderline" },
      { name: "Creatinine", value: "1.1 mg/dL", date: "Feb 24", status: "good" },
      { name: "Potassium", value: "4.3 mEq/L", date: "Feb 24", status: "good" },
      { name: "INR", value: "N/A (on Apixaban)", date: "—", status: "good" },
    ],
    recentCheckins: [
      { date: "Yesterday, 9:00 AM", summary: "Routine check-in. Weight stable, no symptoms reported. Robert continues daily walks and reports improved exercise tolerance." },
      { date: "Mar 5, 2:00 PM", summary: "Discussed medication adherence. All medications taken on time. Blood pressure well controlled. Phase 2 optimization progressing well." },
    ],
    allergy: "Penicillin",
    coordinator: "Rachel Kim, RN",
  },
  3: {
    dob: "November 5, 1964",
    conditions: ["HFrEF (EF 35%)", "Type 2 Diabetes", "COPD (mild)", "Chronic Kidney Disease Stage 2"],
    medications: [
      { name: "Entresto", dose: "49/51mg", timing: "Twice daily" },
      { name: "Carvedilol", dose: "6.25mg", timing: "Twice daily (with meals)" },
      { name: "Jardiance", dose: "10mg", timing: "Once daily (morning)" },
      { name: "Furosemide", dose: "20mg", timing: "Once daily (morning)" },
      { name: "Tiotropium", dose: "18mcg", timing: "Once daily (inhaler)" },
      { name: "Metformin", dose: "500mg", timing: "Twice daily (with meals)" },
    ],
    vitals: {
      weight: { current: 158.6, previous: 159.4, unit: "lbs", trend: "improving", status: "good" },
      bp: { sys: 134, dia: 82, status: "borderline", note: "Slightly elevated" },
      hr: { value: 78, status: "good", note: "Normal range" },
      spo2: { value: 95, status: "borderline" },
    },
    labs: [
      { name: "BNP", value: "380 pg/mL", date: "Mar 3", status: "elevated" },
      { name: "HbA1c", value: "7.2%", date: "Mar 3", status: "borderline" },
      { name: "eGFR", value: "72 mL/min", date: "Mar 3", status: "borderline" },
      { name: "Potassium", value: "4.6 mEq/L", date: "Mar 3", status: "good" },
    ],
    recentCheckins: [
      { date: "Today, 8:30 AM", summary: "Maria reported mild shortness of breath when climbing stairs. Weight improving (down 0.8 lbs). Reminded about low-sodium diet. Care team monitoring closely." },
      { date: "Yesterday, 9:00 AM", summary: "Checked in on medication tolerance. Maria adjusting well to Entresto. Blood sugar slightly high — discussed carb intake." },
    ],
    allergy: "Sulfa drugs, Codeine",
    coordinator: "David Park, RN",
  },
  4: {
    dob: "September 18, 1946",
    conditions: ["HFpEF (EF 48%)", "Hypertension (controlled)", "Type 2 Diabetes (controlled)", "Osteoarthritis"],
    medications: [
      { name: "Losartan", dose: "50mg", timing: "Once daily (morning)" },
      { name: "Metoprolol Tartrate", dose: "25mg", timing: "Twice daily" },
      { name: "Empagliflozin", dose: "10mg", timing: "Once daily (morning)" },
      { name: "Metformin", dose: "1000mg", timing: "Twice daily (with meals)" },
      { name: "Acetaminophen", dose: "500mg", timing: "As needed for joint pain" },
    ],
    vitals: {
      weight: { current: 176.2, previous: 176.0, unit: "lbs", trend: "stable", status: "good" },
      bp: { sys: 124, dia: 74, status: "good", note: "Excellent control" },
      hr: { value: 72, status: "good", note: "Normal sinus rhythm" },
      spo2: { value: 98, status: "good" },
    },
    labs: [
      { name: "BNP", value: "95 pg/mL", date: "Feb 28", status: "good" },
      { name: "HbA1c", value: "6.4%", date: "Feb 28", status: "good" },
      { name: "Creatinine", value: "1.0 mg/dL", date: "Feb 28", status: "good" },
      { name: "Potassium", value: "4.1 mEq/L", date: "Feb 28", status: "good" },
    ],
    recentCheckins: [
      { date: "Mar 8, 10:00 AM", summary: "Routine check-in. James feeling great, walking 30 minutes daily. All vitals within target. On track for Phase 3 graduation." },
      { date: "Mar 5, 10:00 AM", summary: "Discussed transition plan for post-90-day management. James understands ongoing monitoring importance. Very compliant with all medications." },
    ],
    allergy: "None known",
    coordinator: "Rachel Kim, RN",
  },
  5: {
    dob: "June 10, 1967",
    conditions: ["Essential Hypertension (I10)", "Type 2 Diabetes with Hyperglycemia (E11.65)"],
    medications: [
      { name: "Lisinopril", dose: "20mg", timing: "Once daily (morning)" },
      { name: "Amlodipine", dose: "5mg", timing: "Once daily (morning)" },
      { name: "Metformin", dose: "1000mg", timing: "Twice daily (with meals)" },
      { name: "Atorvastatin", dose: "40mg", timing: "Once daily (evening)" },
      { name: "Aspirin", dose: "81mg", timing: "Once daily" },
    ],
    vitals: {
      weight: { current: 212.0, previous: 211.5, unit: "lbs", trend: "stable", status: "good" },
      bp: { sys: 158, dia: 98, status: "warning", note: "4-day worsening trend from 129/80" },
      hr: { value: 78, status: "good", note: "Normal sinus rhythm" },
      spo2: { value: 97, status: "good" },
      glucose: { value: 186, unit: "mg/dL", status: "elevated" },
    },
    labs: [
      { name: "HbA1c", value: "7.8%", date: "Mar 1", status: "elevated" },
      { name: "Creatinine", value: "1.1 mg/dL", date: "Mar 1", status: "good" },
      { name: "eGFR", value: "78 mL/min", date: "Mar 1", status: "good" },
      { name: "Potassium", value: "4.3 mEq/L", date: "Mar 1", status: "good" },
    ],
    recentCheckins: [
      { date: "Today, 8:15 AM", summary: "AI concierge detected 4-day BP worsening trend (158/98 from best of 129/80). Fasting glucose 186 mg/dL. Suspected missed Lisinopril." },
      { date: "Yesterday, 8:00 AM", summary: "Routine check-in. BP 152/94. Patient reported feeling fine. Medications confirmed taken." },
    ],
    allergy: "None known",
    coordinator: "David Park, RN",
  },
};

const VOICE_TRANSCRIPT = [
  { t: 1200, speaker: "AI", text: "Good morning, Sarah. This is the Vardana Care Concierge calling for your daily check-in. You are on Day 15 of your 90-day recovery program. How are you feeling this morning?" },
  { t: 6200, speaker: "Sarah", text: "Hi. I feel okay, about the same as yesterday I think." },
  { t: 11000, speaker: "AI", text: "I'm glad to hear that. I did want to flag something. Your weight has gone up a couple of pounds over the last two days. That can sometimes be a sign of fluid retention. Are you noticing any ankle swelling or feeling more short of breath than usual?" },
  { t: 17500, speaker: "Sarah", text: "Now that you mention it, my ankles have been a little puffy. And I have been more tired than usual the last couple of days." },
  { t: 21000, speaker: "AI", text: "Thank you for telling me that. Let me pull up your recent readings. Your weight is up 2.3 pounds in 48 hours, and your blood pressure has climbed to 136 over 86, which is higher than your best last week. Combined with the ankle swelling and fatigue, I want to make sure your care team knows about this today." },
  { t: 28000, speaker: "Sarah", text: "Is that serious? Should I be worried?" },
  { t: 30000, speaker: "AI", text: "We're being careful, not alarmed. I'm letting Rachel Kim know right now so she can follow up with you and your doctor today. Are you having any trouble breathing, especially when lying flat?" },
  { t: 35000, speaker: "Sarah", text: "A little, yes. I had to use an extra pillow last night." },
  { t: 37500, speaker: "AI", text: "That's helpful to know. I've sent a priority alert to your coordinator with everything we discussed. Rachel will call you today. In the meantime, please stay on your medications and keep your sodium low." },
];

const FHIR_QUERIES = [
  { t: 11500, method: "GET", path: "/Patient/sarah-chen-001", result: "Patient demographics loaded", color: "#2563EB" },
  { t: 12200, method: "GET", path: "/Observation?patient=sarah-chen&code=body-weight&_sort=-date&_count=14", result: "14 weight readings · Latest: 187.7 lbs", color: "#2563EB" },
  { t: 12900, method: "GET", path: "/Observation?patient=sarah-chen&code=blood-pressure", result: "BP trend: 126/78 → 136/86 mmHg", color: "#D97706" },
  { t: 13500, method: "GET", path: "/CarePlan?patient=sarah-chen&status=active", result: "Day 15/90 · Phase: Stabilize → Optimize", color: "#2563EB" },
  { t: 14100, method: "GET", path: "/Condition?patient=sarah-chen", result: "HFrEF, CKD3a, HTN, T2DM", color: "#2563EB" },
  { t: 33000, method: "POST", path: "/Flag", result: "P1 Alert created · ID: flag-sc-001", color: "#DC2626" },
  { t: 33600, method: "POST", path: "/Communication", result: "Coordinator alert dispatched → Rachel Kim", color: "#DC2626" },
];

// ── Marcus Williams HTN/DM Data ──
const MARCUS_BP_DATA = [
  { day: 1, date: "Feb 25", sys: 148, dia: 94 },
  { day: 3, date: "Feb 27", sys: 145, dia: 91 },
  { day: 5, date: "Mar 1", sys: 142, dia: 88 },
  { day: 7, date: "Mar 3", sys: 138, dia: 86 },
  { day: 10, date: "Mar 6", sys: 134, dia: 84 },
  { day: 12, date: "Mar 8", sys: 131, dia: 82 },
  { day: 14, date: "Mar 10", sys: 129, dia: 80 },
  { day: 16, date: "Mar 12", sys: 130, dia: 81 },
  { day: 17, date: "Mar 13", sys: 132, dia: 83 },
  { day: 18, date: "Mar 14", sys: 136, dia: 87 },
  { day: 19, date: "Mar 15", sys: 141, dia: 90 },
  { day: 20, date: "Mar 16", sys: 148, dia: 94 },
  { day: 21, date: "Mar 17", sys: 154, dia: 96 },
  { day: 22, date: "Mar 18", sys: 158, dia: 98 },
];

const MARCUS_GLUCOSE_DATA = [
  { day: 1, date: "Feb 25", glucose: 182 },
  { day: 3, date: "Feb 27", glucose: 175 },
  { day: 5, date: "Mar 1", glucose: 168 },
  { day: 7, date: "Mar 3", glucose: 162 },
  { day: 10, date: "Mar 6", glucose: 155 },
  { day: 12, date: "Mar 8", glucose: 148 },
  { day: 14, date: "Mar 10", glucose: 144 },
  { day: 16, date: "Mar 12", glucose: 146 },
  { day: 17, date: "Mar 13", glucose: 149 },
  { day: 18, date: "Mar 14", glucose: 158 },
  { day: 19, date: "Mar 15", glucose: 166 },
  { day: 20, date: "Mar 16", glucose: 172 },
  { day: 21, date: "Mar 17", glucose: 178 },
  { day: 22, date: "Mar 18", glucose: 186 },
];

const MARCUS_ROSTER = [
  { id: 101, name: "Marcus Williams", age: 58, gender: "M", dob: { month: 6, day: 3, year: 1967 }, day: 22, phase: "Stabilize \u2192 Optimize", risk: 53, riskLevel: "high", alert: true, alertType: "BP crisis risk", alertTime: "12 min ago", trend: "worsening", scheduledOutreach: null, doctor: "Dr. Angela Torres" },
  { id: 2, name: "Robert Williams", age: 74, gender: "M", dob: { month: 3, day: 22, year: 1951 }, day: 52, phase: "Optimize", risk: 34, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: "Today 2:00 PM \u00b7 Voice", doctor: "Dr. Sarah Patel" },
  { id: 3, name: "Maria Gonzalez", age: 61, gender: "F", dob: { month: 11, day: 5, year: 1964 }, day: 8, phase: "Stabilize", risk: 45, riskLevel: "moderate", alert: false, trend: "improving", scheduledOutreach: "Tomorrow 10:00 AM \u00b7 SMS", doctor: "Dr. Michael Torres" },
  { id: 4, name: "James Thompson", age: 79, gender: "M", dob: { month: 9, day: 18, year: 1946 }, day: 83, phase: "Maintain", risk: 22, riskLevel: "low", alert: false, trend: "stable", scheduledOutreach: null, doctor: "Dr. Lisa Chen" },
];

const MARCUS_CLINICAL_DATA = {
  101: {
    dob: "June 3, 1967",
    conditions: ["Essential Hypertension", "Type 2 Diabetes with Hyperglycemia", "Hyperlipidemia", "Obesity (BMI 31.4)"],
    medications: [
      { name: "Lisinopril", dose: "20mg", timing: "Once daily (morning)" },
      { name: "Amlodipine", dose: "5mg", timing: "Once daily" },
      { name: "Metformin", dose: "1000mg", timing: "Twice daily (with meals)" },
      { name: "Atorvastatin", dose: "40mg", timing: "Once daily (evening)" },
      { name: "Aspirin", dose: "81mg", timing: "Once daily" },
    ],
    vitals: {
      bp: { sys: 158, dia: 98, status: "critical", note: "4-day worsening, was 129/80 on Day 14" },
      glucose: { value: 186, unit: "mg/dL", status: "warning", note: "Fasting, elevated" },
      hr: { value: 78, status: "good", note: "Normal sinus rhythm" },
      spo2: { value: 97, status: "good" },
    },
    labs: [
      { name: "HbA1c", value: "8.4%", date: "Feb 25", status: "elevated" },
      { name: "Fasting Glucose", value: "182 mg/dL", date: "Feb 25", status: "elevated" },
      { name: "LDL", value: "118 mg/dL", date: "Feb 25", status: "borderline" },
      { name: "Creatinine", value: "1.1 mg/dL", date: "Feb 25", status: "good" },
      { name: "eGFR", value: "72 mL/min", date: "Feb 25", status: "good" },
      { name: "Microalbumin/Cr", value: "42 mg/g", date: "Feb 25", status: "elevated" },
    ],
    recentCheckins: [
      { date: "Today, 7:30 AM", summary: "AI concierge detected 4-day BP worsening trend. BP 158/98. Patient reports headache. Missed Lisinopril for a few days. Escalated to care coordinator." },
      { date: "Yesterday, 7:30 AM", summary: "Routine check-in. BP 154/96, trending up. Patient confirmed taking Amlodipine but ran out of Lisinopril." },
    ],
    allergy: "Penicillin (rash)",
    coordinator: "David Park, RN",
    program: "90-Day Cardiometabolic Management Program",
    riskAssessments: [
      { label: "ACC/AHA PCE", value: "17.3%", note: "10-year ASCVD risk" },
      { label: "AHA/ACC 2017 HTN", value: "Stage 1", note: "BP 130-139/80-89" },
      { label: "ADA 2024 CV Risk", value: "High", note: "T2DM + HTN + Hyperlipidemia" },
    ],
  },
};

const MARCUS_VOICE_TRANSCRIPT = [
  { t: 1200, speaker: "AI", text: "Good morning, Marcus. This is your Vardana Care Concierge calling for your Day 22 check-in. How are you feeling today?" },
  { t: 5500, speaker: "Marcus", text: "I have had a bit of a headache since I woke up. Nothing terrible, but it is there." },
  { t: 9000, speaker: "AI", text: "I am sorry to hear that. I am looking at your readings, and your blood pressure this morning was 158 over 98. That is noticeably higher than where you were last week at 129 over 80. A headache with that kind of blood pressure trend is something we need to pay attention to. Have you been taking your Lisinopril consistently?" },
  { t: 18000, speaker: "Marcus", text: "Actually, no. I ran out a few days ago and I kept forgetting to call the pharmacy. I have been taking the Amlodipine though." },
  { t: 23000, speaker: "AI", text: "I appreciate you telling me that. Missing Lisinopril for a few days is very likely why your blood pressure has gone up, and that could be causing your headache too. I am sending a priority alert to your care coordinator David Park right now so he can help get your medication sorted today." },
  { t: 31000, speaker: "Marcus", text: "Okay. Is it serious?" },
  { t: 33000, speaker: "AI", text: "Your blood pressure is elevated but you are not in immediate danger. David will call you today to arrange a refill and talk about whether a different dosing schedule might work better for you. In the meantime, please take it easy, stay hydrated, and avoid salty foods. If the headache gets worse or you develop any chest pain or vision changes, call 911 right away." },
  { t: 42000, speaker: "Marcus", text: "Got it. Thanks for checking in." },
];

const MARCUS_FHIR_QUERIES = [
  { t: 5500, method: "GET", path: "/Patient/marcus-williams", result: "Patient demographics loaded", color: "#2563EB" },
  { t: 6200, method: "GET", path: "/Observation?subject=marcus-williams&code=85354-9", result: "14 BP readings \u00b7 Latest: 158/98 mmHg", color: "#D97706" },
  { t: 6900, method: "GET", path: "/Observation?subject=marcus-williams&code=41604-0", result: "14 glucose readings \u00b7 Latest: 186 mg/dL", color: "#D97706" },
  { t: 7500, method: "GET", path: "/MedicationRequest?subject=marcus-williams&status=active", result: "5 active medications", color: "#2563EB" },
  { t: 8100, method: "GET", path: "/CarePlan?patient=marcus-williams&status=active", result: "Day 22/90 \u00b7 HTN + T2DM Program", color: "#2563EB" },
  { t: 34000, method: "POST", path: "/Flag", result: "P2 Alert created \u00b7 bp-crisis-risk \u00b7 severity=high", color: "#DC2626" },
  { t: 34600, method: "POST", path: "/Communication", result: "Coordinator alert dispatched \u2192 David Park", color: "#DC2626" },
];

// ── Design System Tokens ──
const DS = {
  fontDisplay: "'DM Serif Display', 'Georgia', serif",
  fontSans: "'DM Sans', 'system-ui', sans-serif",
  fontMono: "'IBM Plex Mono', 'Courier New', monospace",
  space: (n) => `${n * 4}px`,
  text: {
    xs:   { fontSize: 11, lineHeight: 1.4, letterSpacing: "0.02em" },
    sm:   { fontSize: 13, lineHeight: 1.5, letterSpacing: "0.01em" },
    base: { fontSize: 15, lineHeight: 1.55, letterSpacing: 0 },
    md:   { fontSize: 17, lineHeight: 1.45, letterSpacing: "-0.01em" },
    lg:   { fontSize: 20, lineHeight: 1.35, letterSpacing: "-0.015em" },
    xl:   { fontSize: 24, lineHeight: 1.25, letterSpacing: "-0.02em" },
    "2xl":{ fontSize: 32, lineHeight: 1.2,  letterSpacing: "-0.025em" },
    "3xl":{ fontSize: 42, lineHeight: 1.1,  letterSpacing: "-0.03em" },
  },
  color: {
    slate: {
      950: "#1E3A5F", 900: "#1E3A5F", 800: "#1E3A5F", 700: "#2A4E7A",
      600: "#4A6380", 500: "#7A96B0", 400: "#A8BAC8", 300: "#D1D9E0",
      200: "#E8EDF3", 100: "#EEF1F5", 50: "#F6F7F9",
    },
    amber: {
      700: "#92400E", 600: "#B45309", 500: "#D97706", 400: "#F59E0B",
      300: "#FCD34D", 100: "#FEF3C7", 50: "#FFFBEB",
    },
    jade: {
      700: "#065F46", 600: "#047857", 500: "#059669", 400: "#34D399",
      100: "#D1FAE5", 50: "#ECFDF5",
    },
    crimson: {
      700: "#8B1A1A", 600: "#A93226", 500: "#C0392B", 100: "#FEE2E2", 50: "#FEF2F2",
    },
    canvas: { warm: "#F6F4F0", cool: "#F1F4F8", white: "#FFFFFF" },
    border: { subtle: "#E4E9EF", default: "#D1D9E0", strong: "#A8BAC8" },
  },
  shadow: {
    xs: "0 1px 2px rgba(12,20,32,0.06)",
    sm: "0 2px 6px rgba(12,20,32,0.07), 0 1px 2px rgba(12,20,32,0.04)",
    md: "0 4px 16px rgba(12,20,32,0.08), 0 2px 4px rgba(12,20,32,0.04)",
    lg: "0 8px 32px rgba(12,20,32,0.10), 0 2px 8px rgba(12,20,32,0.05)",
    alert: "0 0 0 1px rgba(220,38,38,0.15), 0 8px 32px rgba(220,38,38,0.12)",
    inset: "inset 0 1px 3px rgba(12,20,32,0.08)",
  },
  radius: { sm: 6, md: 10, lg: 16, xl: 20, full: 9999 },
  transition: { fast: "all 0.12s ease", base: "all 0.2s ease", slow: "all 0.35s ease" },
};

// ── Theme Compat Layer (maps old c.X to DS values) ──
const c = {
  bg: DS.color.canvas.cool, card: DS.color.canvas.white,
  navy: DS.color.slate[900], navyLight: DS.color.slate[800],
  text: DS.color.slate[800], textMed: DS.color.slate[600], textLight: DS.color.slate[400],
  accent: DS.color.amber[500], accentLight: DS.color.amber[100],
  green: DS.color.jade[500], greenLight: DS.color.jade[100], greenBg: DS.color.jade[50],
  orange: DS.color.amber[500], orangeLight: DS.color.amber[100], orangeBg: DS.color.amber[50],
  red: DS.color.crimson[600], redLight: DS.color.crimson[100], redBg: DS.color.crimson[50],
  purple: "#8B5CF6", purpleLight: "#EDE9FE",
  teal: DS.color.jade[500], tealLight: DS.color.jade[100],
  border: DS.color.border.subtle, borderLight: DS.color.slate[100],
  shadow: DS.shadow.xs, shadowMd: DS.shadow.sm, shadowLg: DS.shadow.md,
  radius: DS.radius.lg, font: DS.fontSans,
};

// ── Responsive Hook ──
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth < breakpoint : false);
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [breakpoint]);
  return isMobile;
}

// ── SVG Icon System ──
const Icon = ({ name, size = 16, color = "currentColor", strokeWidth = 1.5 }) => {
  const paths = {
    home:     <><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M9 21V12h6v9"/></>,
    phone:    <><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></>,
    heart:    <><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0l-.9 1-.9-1a5.5 5.5 0 00-7.8 7.8l.9.9L12 21l7.7-7.7.9-.9a5.5 5.5 0 000-7.8z"/></>,
    chat:     <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></>,
    activity: <><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></>,
    alert:    <><path d="M10.3 3.4L1.4 18a2 2 0 001.7 3h17.8a2 2 0 001.7-3L12.8 3.4a1.9 1.9 0 00-2.5 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    check:    <><polyline points="20 6 9 17 4 12"/></>,
    arrow:    <><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></>,
    pill:     <><path d="M10.5 20H4a2 2 0 01-2-2V6a2 2 0 012-2h16a2 2 0 012 2v4"/><path d="M13.5 17.5a4.5 4.5 0 109 0 4.5 4.5 0 00-9 0z"/><path d="M13.5 17.5h9"/></>,
    scale:    <><path d="M12 3v1M6 6l-2-2M18 6l2-2M3 12h18M5 12l1.5-4h11L19 12M7 16h10l1 5H6z"/></>,
    flag:     <><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></>,
    sun:      <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/></>,
    trend_up: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></>,
    users:    <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></>,
    calendar: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    clipboard:<><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    flask:    <><path d="M9 3h6M10 3v7.4a2 2 0 01-.5 1.3L4 19a2 2 0 001.5 3h13a2 2 0 001.5-3l-5.5-7.3a2 2 0 01-.5-1.3V3"/></>,
    shield:   <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>,
    stethoscope:<><path d="M4.8 2.6a4 4 0 01.5 7.9v2a4 4 0 008 0v-2a2.5 2.5 0 115 0v1.5"/><circle cx="19.8" cy="16" r="2.5"/></>,
    droplet:  <><path d="M12 2.7c-4.5 5-7 8.5-7 11.8a7 7 0 0014 0c0-3.3-2.5-6.8-7-11.8z"/></>,
    smartphone:<><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>,
    info:     <><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></>,
    bar_chart:<><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></>,
    sms:      <><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/></>,
  };

  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      {paths[name] || <circle cx="12" cy="12" r="10"/>}
    </svg>
  );
};

// ── Utility ──
function RiskBadge({ level, score }) {
  const colors = {
    high: { bg: c.redLight, text: c.red, border: "#FECACA" },
    moderate: { bg: c.orangeLight, text: c.orange, border: "#FDE68A" },
    low: { bg: c.greenLight, text: c.green, border: "#A7F3D0" },
  };
  const s = colors[level] || colors.low;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 700, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.text }} />
      <span style={{ fontFamily: DS.fontDisplay }}>{score}</span>/100
    </span>
  );
}

function TrendArrow({ trend }) {
  const config = {
    worsening: { symbol: "↗", color: c.red, label: "Worsening" },
    stable: { symbol: "→", color: c.green, label: "Stable" },
    improving: { symbol: "↘", color: c.green, label: "Improving" },
  };
  const t2 = config[trend] || config.stable;
  return <span style={{ fontSize: 11, fontWeight: 600, color: t2.color }}>{t2.symbol} {t2.label}</span>;
}

// ── Header ──
function Header({ onBack, patientSelected, onSwitchRole, coordinatorName = "Rachel Kim", coordinatorInitials = "RK" }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ background: DS.color.slate[950], color: "white", padding: isMobile ? "10px 14px" : "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100, gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, minWidth: 0 }}>
        {patientSelected && onBack && (
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "white", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 13, fontFamily: c.font, fontWeight: 600, flexShrink: 0 }}>&#8592;{!isMobile && " Back"}</button>
        )}
        <span style={{ fontSize: isMobile ? 17 : 20, fontWeight: 400, fontFamily: DS.fontDisplay, letterSpacing: "-0.02em", flexShrink: 0 }}>
          Vardana<span style={{ color: DS.color.amber[400] }}>.</span>
        </span>
        {!isMobile && (
          <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.5, borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 12 }}>
            Care Coordinator
          </span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 16, fontSize: 13, flexShrink: 0 }}>
        {onSwitchRole && <button onClick={onSwitchRole} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: c.font, fontWeight: 600 }}>Switch Role</button>}
        {!isMobile && <span style={{ opacity: 0.6 }}>Nurse {coordinatorName}</span>}
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>{coordinatorInitials}</div>
      </div>
    </div>
  );
}

// ── Roster View ──
function RosterView({ onSelect, onCallPatient, onBack, epicPatients = [], epicLoading, onFetchEpic, riskOverrides = {}, guidanceBanner, isScriptedDemo = false, roster = ROSTER, primaryPatientId = 1 }) {
  const isMobile = useIsMobile();
  const alertCount = roster.filter(p => p.alert).length;
  const [showPointerArrow, setShowPointerArrow] = useState(false);
  const autoClickedRef = useRef(false);

  // In scripted mode, show pointer after 1.5s (amber pulse shows immediately, pointer appears later)
  useEffect(() => {
    if (!isScriptedDemo) return;
    const timer = setTimeout(() => setShowPointerArrow(true), 1500);
    return () => clearTimeout(timer);
  }, [isScriptedDemo]);

  // In scripted mode, auto-click Call Patient after 4s if user hasn't clicked
  useEffect(() => {
    if (!isScriptedDemo || autoClickedRef.current) return;
    const timer = setTimeout(() => {
      if (autoClickedRef.current) return;
      autoClickedRef.current = true;
      const primary = roster.find(p => p.id === primaryPatientId);
      if (primary && onCallPatient) onCallPatient(primary);
    }, 4000);
    return () => clearTimeout(timer);
  }, [isScriptedDemo, roster, primaryPatientId, onCallPatient]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: isMobile ? 14 : 24 }}>
      {/* Back button in scripted mode */}
      {isScriptedDemo && onBack && (
        <button onClick={onBack} style={{ background: "none", border: "none", color: c.textLight, fontSize: 13, cursor: "pointer", padding: "4px 0", fontFamily: c.font, display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
          &larr; Back to demo
        </button>
      )}
      {guidanceBanner}
      <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "baseline", marginBottom: 20, gap: isMobile ? 4 : 0 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 19 : 22, fontWeight: 800, color: c.text, margin: 0, fontFamily: c.font }}>Patient Roster</h1>
          <p style={{ fontSize: isMobile ? 12 : 13, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>
            {roster.length} patients · {alertCount} pending alert{alertCount !== 1 && "s"}
          </p>
        </div>
        {!isMobile && <div style={{ fontSize: 12, color: c.textLight, fontFamily: c.font }}>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>}
      </div>

      {alertCount > 0 && (
        <div style={{ background: c.redBg, border: `1px solid ${c.redLight}`, borderRadius: c.radius, padding: "14px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: c.redLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="alert" size={18} color={c.red} /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.red, fontFamily: c.font }}>{alertCount} patient{alertCount !== 1 && "s"} need{alertCount === 1 && "s"} attention</div>
            <div style={{ fontSize: 13, color: c.textMed, fontFamily: c.font }}>AI has flagged clinical concerns requiring coordinator review</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[...roster].sort((a, b) => (b.id === primaryPatientId ? 1 : 0) - (a.id === primaryPatientId ? 1 : 0) || (b.alert ? 1 : 0) - (a.alert ? 1 : 0) || b.risk - a.risk).map(p => {
          const ro = riskOverrides[p.id];
          const displayRisk = ro ? ro.score : p.risk;
          const displayLevel = ro ? ro.level : p.riskLevel;
          const isPrimaryRow = p.id === primaryPatientId;
          const showPointer = isScriptedDemo && isPrimaryRow;
          return (
          <div key={p.id} style={{ position: "relative", display: "block", opacity: 1, transition: "all 0.3s ease" }}>
          <div role="button" tabIndex={0} onClick={() => onSelect(p)} onKeyDown={(e) => { if (e.key === 'Enter') onSelect(p); }} style={{ width: "100%", background: c.card, border: `1px solid ${p.alert ? "#FECACA" : c.border}`, borderRadius: c.radius, padding: isMobile ? "12px 14px" : "16px 20px", cursor: "pointer", fontFamily: c.font, textAlign: "left", boxShadow: isScriptedDemo && isPrimaryRow ? "0 0 0 2px rgba(245,158,11,0.4)" : c.shadow, transition: "all 0.15s", display: "flex", flexWrap: isMobile ? "wrap" : "nowrap", alignItems: "center", gap: isMobile ? 8 : 16, borderLeft: p.alert ? `4px solid ${c.red}` : `4px solid transparent`, animation: isScriptedDemo && isPrimaryRow ? "amberBorderPulse 1.5s ease-in-out infinite" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: c.text }}>{p.name}</span>
                <span style={{ fontSize: isMobile ? 11 : 12, color: c.textLight }}>{p.age}{p.gender || ""}</span>
              </div>
              {p.alert && <div style={{ fontSize: isMobile ? 12 : 13, color: c.red, fontWeight: 600, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><Icon name="alert" size={13} color={c.red} /> {p.alertType} — {p.alertTime}</div>}
              {p.scheduledOutreach && !p.alert && (
                <div style={{ fontSize: isMobile ? 11 : 12, color: c.teal, fontWeight: 600, marginTop: 4 }}>
                  <Icon name="calendar" size={12} color={c.teal} style={{ marginRight: 4 }} /> {p.scheduledOutreach}
                </div>
              )}
            </div>
            {!isMobile && (
              <div style={{ textAlign: "center", minWidth: 80 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Day {p.day}</div>
                <div style={{ fontSize: 11, color: c.textLight }}>{p.phase}</div>
              </div>
            )}
            <div style={{ textAlign: isMobile ? "left" : "right", minWidth: isMobile ? undefined : 80, ...(isMobile ? { display: "flex", alignItems: "center", gap: 8 } : {}) }}>
              <RiskBadge level={displayLevel} score={displayRisk} />
              {isMobile && <span style={{ fontSize: 11, color: c.textLight }}>Day {p.day}</span>}
              {ro && <div style={{ fontSize: 10, color: c.teal, fontWeight: 600, marginTop: isMobile ? 0 : 2 }}>Assessed during call</div>}
              {!ro && !isMobile && <div style={{ marginTop: 4 }}><TrendArrow trend={p.trend} /></div>}
            </div>
            {isPrimaryRow && p.alert && (
              <button onClick={(e) => { e.stopPropagation(); onCallPatient && onCallPatient(p); }} style={{ padding: isMobile ? "10px 0" : "8px 16px", borderRadius: 8, background: DS.color.slate[950], color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0, width: isMobile ? "100%" : "auto", animation: "amberBorderPulse 1.5s ease-in-out infinite" }}>
                <Icon name="phone" size={13} color="white" /> Call Patient
              </button>
            )}
            {!isMobile && <span style={{ fontSize: 16, color: c.textLight }}>›</span>}
          </div>
          {showPointer && showPointerArrow && (
            <div style={{ position: "absolute", right: 56, top: "50%", transform: "translateY(-50%)", animation: "pointerBounce 0.6s ease infinite alternate", pointerEvents: "none", zIndex: 50 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#F59E0B"><path d="M4 0 L4 20 L8 16 L12 24 L14 22 L10 14 L16 14 Z"/></svg>
            </div>
          )}
          </div>
          );
        })}
      </div>

      {/* Epic EHR Patients — hidden in scripted demo and on mobile */}
      <div style={{ marginTop: 24, display: (isScriptedDemo || isMobile) ? "none" : "block" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>🏥</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text, fontFamily: c.font }}>Epic EHR Patients</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: c.tealLight, color: c.teal }}>FHIR R4</span>
          </div>
          {epicPatients.length === 0 && (
            <button onClick={onFetchEpic} disabled={epicLoading} style={{ padding: "7px 14px", borderRadius: 8, background: epicLoading ? c.border : DS.color.jade[600], color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: epicLoading ? "not-allowed" : "pointer", fontFamily: c.font }}>
              {epicLoading ? "Connecting..." : "Connect to Epic"}
            </button>
          )}
        </div>

        {epicPatients.length === 0 && !epicLoading && (
          <div style={{ background: c.card, border: `1px dashed ${c.tealLight}`, borderRadius: c.radius, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: c.textLight }}>Click "Connect to Epic" to import patients from Epic EHR sandbox</div>
          </div>
        )}
        {epicLoading && (
          <div style={{ background: c.card, border: `1px solid ${c.tealLight}`, borderRadius: c.radius, padding: 20, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: c.teal, fontWeight: 600 }}>Authenticating via SMART on FHIR...</div>
          </div>
        )}

        {epicPatients.map(p => (
          <button key={p.id} onClick={() => onSelect(p)} style={{ width: "100%", background: c.card, border: `1px solid ${c.tealLight}`, borderLeft: `4px solid ${c.teal}`, borderRadius: c.radius, padding: "16px 20px", cursor: "pointer", fontFamily: c.font, textAlign: "left", boxShadow: c.shadow, display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{p.name}</span>
                {p.age && <span style={{ fontSize: 12, color: c.textLight }}>{p.age}y</span>}
                <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.tealLight, color: c.teal }}>EPIC</span>
              </div>
              <div style={{ fontSize: 12, color: c.teal, fontWeight: 600, marginTop: 4 }}>
                Live EHR data · {p.epicData.conditions.length} conditions · {p.epicData.medications.length} medications
              </div>
            </div>
            <span style={{ fontSize: 16, color: c.textLight }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Outreach Modal ──
function OutreachModal({ patient, onClose, onInitiate }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,26,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: c.card, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", fontFamily: c.font }}>

        {/* Header */}
        <div style={{ background: DS.color.slate[950], padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Contact Patient</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>{patient.name}{patient.day != null ? ` · Day ${patient.day}` : ""}{patient.risk != null ? ` · Risk ${patient.risk}/100` : ""}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ padding: "20px 24px" }}>

          {/* AI Context */}
          {patient.alert && (
            <div style={{ background: c.redBg, border: `1px solid ${c.redLight}`, borderRadius: 10, padding: "12px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Icon name="alert" size={16} color={c.red} />
              <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>
                AI recommends contacting this patient within <strong style={{ color: c.red }}>4 hours</strong>. Patient was informed by AI concierge at 7:45 AM that a coordinator would follow up today.
              </div>
            </div>
          )}

          {/* Voice / Chat selection */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {/* Voice Call */}
            <div style={{ flex: 1, background: c.borderLight, border: `2px solid ${c.accent}30`, borderRadius: 14, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #0EA5E9, #0284C7)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon name="phone" size={22} color="white" /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 4 }}>Voice Call</div>
              <div style={{ fontSize: 11, color: c.textLight, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>AI concierge calls the patient directly. Natural conversation captures symptoms and vitals.</div>
              <button onClick={() => onInitiate("voice", "now")} style={{ width: "100%", padding: "10px", borderRadius: 9, background: "linear-gradient(135deg, #0EA5E9, #0284C7)", color: "white", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: c.font }}>Start Voice Call</button>
              <div style={{ fontSize: 10, color: c.textLight, marginTop: 6 }}>Requires microphone</div>
            </div>
            {/* Chat */}
            <div style={{ flex: 1, background: c.borderLight, border: `2px solid ${c.purple}30`, borderRadius: 14, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${c.purple}, #7C3AED)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon name="sms" size={22} color="white" /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 4 }}>Chat</div>
              <div style={{ fontSize: 11, color: c.textLight, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>AI concierge chats with the patient. Same assessment, at the patient's pace.</div>
              <button onClick={() => onInitiate("sms", "now")} style={{ width: "100%", padding: "10px", borderRadius: 9, background: `linear-gradient(135deg, ${c.purple}, #7C3AED)`, color: "white", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: c.font }}>Start Chat</button>
              <div style={{ fontSize: 10, color: c.textLight, marginTop: 6 }}>No mic needed</div>
            </div>
          </div>

          <button onClick={onClose} style={{ width: "100%", padding: "10px", border: "none", background: "none", color: c.textLight, fontSize: 13, cursor: "pointer", fontFamily: c.font }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Voice Call Demo ──
function VoiceCallDemo({ patient, onComplete, autoStartScripted = false, autoStartLive = false, onExitDemo = null, isMarcusDemo = false }) {
  const isMobileView = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState("transcript"); // transcript | chart (mobile only)
  // ── state ──
  const [uiState, setUiState] = useState(autoStartScripted ? "loading" : "setup"); // setup|loading|dialing|connected|active|alert|done|closing
  const [showTranscript, setShowTranscript] = useState(false);
  const [alertZoom, setAlertZoom] = useState(false);
  const [apiError, setApiError] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(!autoStartScripted);
  const [loadProgress, setLoadProgress] = useState(0);
  const [transcript, setTranscript]   = useState([]);
  const [fhirLog, setFhirLog]         = useState([]);
  const isEpic = patient?.isEpic;
  const ACTIVE_TRANSCRIPT = isMarcusDemo ? MARCUS_VOICE_TRANSCRIPT : VOICE_TRANSCRIPT;
  const ACTIVE_FHIR = isMarcusDemo ? MARCUS_FHIR_QUERIES : FHIR_QUERIES;
  const ACTIVE_CLINICAL = isMarcusDemo ? MARCUS_CLINICAL_DATA : PATIENT_CLINICAL_DATA;
  const getPatientContext = () => {
    if (isEpic && patient.epicData) {
      return {
        name: patient.name, age: patient.age,
        gender: patient.epicData.patient?.gender,
        conditions: patient.epicData.conditions || [],
        medications: patient.epicData.medications || [],
        labs: patient.epicData.labs || [],
        diagnosticReports: patient.epicData.diagnosticReports || [],
      };
    }
    // For non-Epic ROSTER patients, build context from clinical data
    const clinicalData = ACTIVE_CLINICAL[patient?.id];
    if (clinicalData) {
      return {
        name: patient.name, age: patient.age,
        gender: patient.gender === "M" ? "male" : patient.gender === "F" ? "female" : patient.gender,
        conditions: (clinicalData.conditions || []).map(c => ({ text: c, status: "active" })),
        medications: (clinicalData.medications || []).map(m => ({ name: m.name, dosage: m.dose })),
        labs: (clinicalData.labs || []).map(l => ({ name: l.name, value: l.value, unit: "" })),
      };
    }
    // For Sarah Chen (id: 1) — return undefined so the API uses the Sarah-specific prompt
    return undefined;
  };
  const [riskScore, setRiskScore]     = useState(isEpic ? 50 : isMarcusDemo ? 53 : 68);
  const [alertGenerated, setAlertGenerated] = useState(false);
  const [elapsed, setElapsed]   = useState(0);
  const [waveFrame, setWaveFrame] = useState(0);
  const [muted, setMuted]       = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);

  // ── live demo state ──
  const [demoMode, setDemoMode]       = useState(autoStartScripted ? "scripted" : null); // "scripted" | "live"
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking]   = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [aiAssessment, setAiAssessment] = useState({});
  const [textInput, setTextInput]     = useState("");
  const [interimText, setInterimText] = useState("");   // live speech-to-text preview

  const transcriptRef   = useRef(null);
  const fhirSectionRef  = useRef(null);   // FHIR Activity section for auto-scroll
  const rightPanelRef   = useRef(null);   // right panel scrollable container
  const audioRef        = useRef(null);   // currently playing Audio element/source
  const mutedRef        = useRef(false);
  const cancelRef       = useRef(false);
  const blobUrls        = useRef([]);
  const timersRef       = useRef([]);
  const recognitionRef  = useRef(null);
  const failsafeAudio   = useRef(null);   // pre-cached failsafe audio URL
  const audioCtxRef     = useRef(null);    // Web Audio API context (iOS-safe)
  const gainRef         = useRef(null);    // gain node for volume control

  const addTimer = (fn, ms) => { const id = setTimeout(fn, ms); timersRef.current.push(id); return id; };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; };

  // ── iOS/Safari Audio Unlock ──
  // iOS Safari requires audio to be initiated during a user gesture.
  // Call this in button click handlers BEFORE any async work.
  const unlockAudio = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    // Reuse pre-unlocked context from user gesture if available
    if (!audioCtxRef.current && window._vardanaAudioCtx && window._vardanaAudioCtx.state !== 'closed') {
      audioCtxRef.current = window._vardanaAudioCtx;
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
      window._vardanaAudioCtx = null;
    } else if (!audioCtxRef.current && AudioCtx) {
      audioCtxRef.current = new AudioCtx();
      gainRef.current = audioCtxRef.current.createGain();
      gainRef.current.connect(audioCtxRef.current.destination);
    }
    if (audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    // Play a tiny silent buffer to fully unlock audio on iOS
    if (audioCtxRef.current) {
      try {
        const buf = audioCtxRef.current.createBuffer(1, 1, 22050);
        const src = audioCtxRef.current.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtxRef.current.destination);
        src.start(0);
      } catch {}
    }
  };

  // ── Play audio from a blob URL using Web Audio API (iOS-safe) ──
  // Falls back to HTML5 Audio if Web Audio API is unavailable.
  const playAudioUrl = (url) => {
    return new Promise(async (resolve) => {
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== 'closed') {
        try {
          // Resume context if suspended (extra safety for iOS)
          if (ctx.state === 'suspended') await ctx.resume();
          const response = await fetch(url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          gainRef.current.gain.value = mutedRef.current ? 0 : 1;
          source.connect(gainRef.current);
          // Store source for pause/cancel
          audioRef.current = { pause: () => { try { source.stop(); } catch {} }, _src: source };
          let done = false;
          const finish = () => { if (!done) { done = true; resolve(); } };
          source.onended = finish;
          setTimeout(finish, 30000); // safety timeout
          source.start(0);
          return;
        } catch {
          // Fall through to HTML5 Audio fallback
        }
      }
      // HTML5 Audio fallback (non-iOS or AudioContext failed)
      const audio = new Audio(url);
      audio.volume = mutedRef.current ? 0 : 1;
      audioRef.current = audio;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      audio.onended = finish;
      audio.onerror = finish;
      audio.ontimeupdate = () => {
        if (audio.duration > 0 && audio.currentTime >= audio.duration - 0.1) finish();
      };
      setTimeout(finish, 30000);
      audio.play().catch(finish);
    });
  };

  // cleanup on unmount / navigation away
  useEffect(() => () => {
    cancelRef.current = true;
    clearTimers();
    audioRef.current?.pause();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    blobUrls.current.forEach(u => URL.revokeObjectURL(u));
    // Close Web Audio API context (iOS)
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try { audioCtxRef.current.close(); } catch {}
    }
  }, []);

  // elapsed + wave animation while call is live
  useEffect(() => {
    if (!["connected", "active", "alert"].includes(uiState)) return;
    const t1 = setInterval(() => setElapsed(e => e + 1), 1000);
    const t2 = setInterval(() => setWaveFrame(f => (f + 1) % 12), 130);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [uiState]);

  // auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [transcript]);

  // auto-scroll to FHIR Activity when new entries appear + pulse highlight
  const prevFhirLen = useRef(0);
  useEffect(() => {
    if (fhirLog.length > prevFhirLen.current) {
      // On mobile: scroll the FHIR section into view
      if (isMobileView && fhirSectionRef.current) {
        fhirSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      // On desktop: scroll the right panel to the FHIR section
      if (!isMobileView && rightPanelRef.current && fhirSectionRef.current) {
        const panel = rightPanelRef.current;
        const section = fhirSectionRef.current;
        const offsetTop = section.offsetTop - panel.offsetTop;
        panel.scrollTo({ top: offsetTop, behavior: "smooth" });
      }
    }
    prevFhirLen.current = fhirLog.length;
  }, [fhirLog.length, isMobileView]);

  // ── Streaming audio playback via MediaSource API (Chrome/Firefox) ──
  // Appends chunks as they arrive and calls audio.play() on the first chunk.
  // Not used on Safari/iOS — those fall back to the decodeAudioData path.
  const playStreamingResponse = (response) => {
    return new Promise((resolve, reject) => {
      const ms = new MediaSource();
      const objUrl = URL.createObjectURL(ms);
      blobUrls.current.push(objUrl);

      const audio = new Audio();
      audio.src = objUrl;
      audioRef.current = audio;

      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      audio.onended = finish;
      audio.onerror = () => reject(new Error('MediaSource audio error'));
      setTimeout(finish, 30000);

      ms.addEventListener('sourceopen', async () => {
        let sb;
        try {
          sb = ms.addSourceBuffer('audio/mpeg');
        } catch (e) { reject(e); return; }

        const reader = response.body.getReader();
        let playStarted = false;

        const waitUpdate = () =>
          new Promise(r => sb.addEventListener('updateend', r, { once: true }));

        const MIN_PLAY_BYTES = 24576; // ~0.8s at 128kbps — prevents first-word clipping
        let bufferedBytes = 0;

        const startPlayback = async () => {
          if (sb.updating) await waitUpdate();
          audio.volume = mutedRef.current ? 0 : 1;
          audio.play().catch(() => {});
        };

        const pump = async () => {
          try {
            while (true) {
              const { value, done: streamDone } = await reader.read();
              if (value && value.byteLength > 0) {
                if (sb.updating) await waitUpdate();
                sb.appendBuffer(value);
                bufferedBytes += value.byteLength;
                if (!playStarted && bufferedBytes >= MIN_PLAY_BYTES) {
                  playStarted = true;
                  await startPlayback();
                }
              }
              if (streamDone) {
                if (sb.updating) await waitUpdate();
                if (!playStarted) {
                  // Stream ended before threshold — start now with whatever we have
                  playStarted = true;
                  await startPlayback();
                }
                try { ms.endOfStream(); } catch {}
                break;
              }
            }
          } catch (e) {
            reject(e);
          }
        };

        pump();
      }, { once: true });
    });
  };

  // ── Custom audio override for Marcus patient responses ──
  // When custom recordings exist at /audio/marcus/marcus-response-N.mp3,
  // use them instead of TTS-generated audio for patient lines.
  const customAudioCache = useRef({});
  const tryCustomMarcusAudio = async (lineIndex) => {
    const url = `/audio/marcus/marcus-response-${lineIndex}.mp3`;
    if (customAudioCache.current[url] !== undefined) return customAudioCache.current[url];
    try {
      const res = await fetch(url, { method: 'HEAD' });
      customAudioCache.current[url] = res.ok ? url : null;
      return customAudioCache.current[url];
    } catch {
      customAudioCache.current[url] = null;
      return null;
    }
  };

  // ── Fetch audio via server-side TTS proxy ──
  const fetchAudioOnce = async (text, speaker) => {
    let res;
    try {
      console.log("[TTS] Fetching:", { speaker, text: text.substring(0, 60), endpoint: "/api/tts" });
      res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, speaker }),
      });
      console.log("[TTS] Response:", { status: res.status, ok: res.ok, provider: res.headers.get("X-TTS-Provider") });
    } catch (e) {
      throw new Error(`Network error — ${e.message}`);
    }
    if (!res.ok) {
      let detail = "";
      try { const j = await res.json(); detail = j?.error || ""; } catch {}
      throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
    }
    const url = URL.createObjectURL(await res.blob());
    blobUrls.current.push(url);
    return url;
  };

  // Retry wrapper — tries TTS up to 2x before giving up
  const fetchAudio = async (text, speaker) => {
    try {
      return await fetchAudioOnce(text, speaker);
    } catch (e1) {
      // Wait briefly then retry once
      await new Promise(r => setTimeout(r, 800));
      try {
        return await fetchAudioOnce(text, speaker);
      } catch {
        throw e1; // throw original error so caller can fallback
      }
    }
  };

  // ── shared effects that fire at specific line indices ──
  const triggerEffects = isMarcusDemo ? (idx) => {
    // Marcus script: 0=AI greeting, 1=AI BP readings, 2=Marcus headache, 3=AI meds question,
    //                4=Marcus missed meds, 5=AI escalate, 6=Marcus no chest pain, 7=AI guidance
    if (idx === 0) {
      // AI greeting — fire FHIR queries for Marcus
      [0, 520, 1060, 1620, 2200].forEach((d, i) =>
        addTimer(() => { if (!cancelRef.current) setFhirLog(p => [...p, ACTIVE_FHIR[i]]); }, d)
      );
    }
    if (idx === 1) setRiskScore(53);   // AI shows BP readings — baseline risk
    if (idx === 2) setRiskScore(68);   // Marcus reports headache → risk jumps
    if (idx === 4) setRiskScore(73);   // Marcus confirms missed meds → P2 alert threshold
    if (idx === 5) {
      setRiskScore(73);               // AI triggers alert at 70+
      addTimer(() => {
        if (cancelRef.current) return;
        setFhirLog(p => [...p, ACTIVE_FHIR[5]]);
        addTimer(() => {
          if (cancelRef.current) return;
          setFhirLog(p => [...p, ACTIVE_FHIR[6]]);
          setAlertGenerated(true);
          setUiState("alert");
          setAlertZoom(true);
          addTimer(() => { if (!cancelRef.current) setAlertZoom(false); }, 4000);
        }, 900);
      }, 1200);
    }
  } : (idx) => {
    // Sarah script: 0=AI greeting, 1=Sarah okay, 2=AI flags weight, 3=Sarah confirms swelling,
    //               4=AI readings+care team, 5=Sarah worried, 6=AI escalate+breathing?, 7=Sarah breathing, 8=AI alert+guidance
    if (idx === 0) {
      // AI greeting — fire FHIR queries
      [0, 520, 1060, 1620, 2200].forEach((d, i) =>
        addTimer(() => { if (!cancelRef.current) setFhirLog(p => [...p, ACTIVE_FHIR[i]]); }, d)
      );
    }
    if (idx === 2) setRiskScore(72);   // AI flags weight → baseline risk visible
    if (idx === 3) setRiskScore(75);   // Sarah confirms swelling → score bumps
    if (idx === 4) setRiskScore(78);   // AI: readings + care team aware → score climbs
    if (idx === 7) setRiskScore(82);   // breathing trouble → high risk
    if (idx === 8) {
      setRiskScore(84);               // AI triggers alert → critical
      addTimer(() => {
        if (cancelRef.current) return;
        setFhirLog(p => [...p, ACTIVE_FHIR[5]]);
        addTimer(() => {
          if (cancelRef.current) return;
          setFhirLog(p => [...p, ACTIVE_FHIR[6]]);
          setAlertGenerated(true);
          setUiState("alert");
          setAlertZoom(true);
          addTimer(() => { if (!cancelRef.current) setAlertZoom(false); }, 4000);
        }, 900);
      }, 1200);
    }
  };

  // ── TTS playback sequence ──
  const playTTSSequence = async (urls) => {
    for (let i = 0; i < urls.length; i++) {
      if (cancelRef.current) return;
      const line = ACTIVE_TRANSCRIPT[i];
      setTranscript(p => [...p, line]);
      setActiveSpeaker(line.speaker);
      triggerEffects(i);

      await playAudioUrl(urls[i]);

      setActiveSpeaker(null);
      if (cancelRef.current) return;
      const gap = ACTIVE_TRANSCRIPT[i + 1]?.speaker !== line.speaker ? 680 : 260;
      await new Promise(r => setTimeout(r, gap));
    }
    if (!cancelRef.current) setUiState("closing");
  };

  // ── Pre-fetched audio buffers for scripted demo ──
  const preloadedUrlsRef = useRef(null);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadReady, setPreloadReady] = useState(false);

  // Pre-fetch all audio segments on mount for scripted demo (parallel with stagger)
  // Skip if already pre-rendered from roster view
  useEffect(() => {
    if (!autoStartScripted) return;
    if (window._vardanaPreloadedUrls && window._vardanaPreloadedPatient === (isMarcusDemo ? 'marcus' : 'sarah')) {
      preloadedUrlsRef.current = window._vardanaPreloadedUrls;
      window._vardanaPreloadedUrls = null;
      window._vardanaPreloadedPatient = null;
      setPreloadProgress(100);
      setPreloadReady(true);
      return;
    }
    if (preloadedUrlsRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        if (cancelled || cancelRef.current) return;
        // Fire all lines in parallel — first line primes the connection naturally
        let completed = 0;
        const urls = await Promise.all(
          ACTIVE_TRANSCRIPT.map((line, i) =>
            new Promise(resolve => setTimeout(resolve, i * 50))
              .then(() => {
                if (cancelled || cancelRef.current) return null;
                return fetchAudio(line.text, line.speaker);
              })
              .then(url => {
                completed++;
                setPreloadProgress(Math.round(completed / ACTIVE_TRANSCRIPT.length * 100));
                return url;
              })
          )
        );
        if (!cancelled) {
          preloadedUrlsRef.current = urls;
          setPreloadReady(true);
        }
      } catch (err) {
        if (!cancelled) setApiError(err.message || "Audio pre-fetch failed.");
      }
    })();
    return () => { cancelled = true; };
  }, [autoStartScripted]);

  // ── Start scripted demo with TTS (server-side proxy — no key needed) ──
  const startScriptedDemo = async () => {
    cancelRef.current = false;
    setApiError("");
    // If pre-loaded (scripted demo), use cached URLs
    if (preloadedUrlsRef.current) {
      setLoadProgress(100);
      launchCall(() => playTTSSequence(preloadedUrlsRef.current));
      return;
    }
    setUiState("loading");
    // If preload is in progress (autoStartScripted), wait for it instead of double-fetching
    if (autoStartScripted) {
      try {
        await new Promise((resolve, reject) => {
          const check = setInterval(() => {
            if (cancelRef.current) { clearInterval(check); reject(new Error("Cancelled")); }
            if (preloadedUrlsRef.current) { clearInterval(check); resolve(); }
          }, 250);
        });
        setLoadProgress(100);
        launchCall(() => playTTSSequence(preloadedUrlsRef.current));
      } catch (err) {
        if (!cancelRef.current) { setApiError(err.message || "Audio fetch failed."); setUiState("setup"); }
      }
      return;
    }
    try {
      // Fetch all lines in parallel with 100ms stagger — much faster than sequential
      let completed = 0;
      const urls = await Promise.all(
        ACTIVE_TRANSCRIPT.map((line, i) =>
          new Promise(resolve => setTimeout(resolve, i * 100))
            .then(() => {
              if (cancelRef.current) return null;
              return fetchAudio(line.text, line.speaker);
            })
            .then(url => {
              completed++;
              setLoadProgress(Math.round(completed / ACTIVE_TRANSCRIPT.length * 100));
              return url;
            })
        )
      );
      launchCall(() => playTTSSequence(urls));
    } catch (err) {
      setApiError(err.message || "Audio fetch failed.");
      setUiState("setup");
    }
  };

  // Auto-start scripted demo: wait for both audio unlock + preload ready
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoStartScripted || autoStartedRef.current) return;
    // Try to unlock audio context
    try {
      unlockAudio();
      setAudioUnlocked(true);
    } catch {
      // Browser blocked — overlay will handle it
    }
  }, [autoStartScripted]);

  // When both audio is unlocked and preload is ready, start playback
  useEffect(() => {
    if (!autoStartScripted || autoStartedRef.current) return;
    if (audioUnlocked && preloadReady) {
      autoStartedRef.current = true;
      startScriptedDemo();
    }
  }, [autoStartScripted, audioUnlocked, preloadReady]);

  const handleUnlockAndStart = () => {
    unlockAudio();
    setAudioUnlocked(true);
    // If preload is already done, start immediately; otherwise it will auto-start via effect
    if (preloadReady) {
      autoStartedRef.current = true;
      startScriptedDemo();
    }
  };

  // ── Browser TTS fallback ──
  const startBrowserTTS = () => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const voices = synth.getVoices();
    const pick = (speaker) => {
      if (speaker === "AI")
        return voices.find(v => /samantha|google uk english female|google us english/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en")) || voices[0];
      const ai = pick("AI");
      return voices.find(v => /victoria|karen|moira|tessa/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en") && v !== ai) || ai;
    };
    let idx = 0;
    const playNext = () => {
      if (cancelRef.current || idx >= ACTIVE_TRANSCRIPT.length) {
        if (!cancelRef.current) setUiState("closing");
        return;
      }
      const line = ACTIVE_TRANSCRIPT[idx];
      setTranscript(p => [...p, line]);
      setActiveSpeaker(line.speaker);
      triggerEffects(idx);
      const utt = new SpeechSynthesisUtterance(line.text);
      const v = pick(line.speaker); if (v) utt.voice = v;
      utt.rate   = line.speaker === "AI" ? 0.87 : 0.95;
      utt.pitch  = line.speaker === "AI" ? 0.82 : 1.14;
      utt.volume = mutedRef.current ? 0 : 1;
      utt.onend = utt.onerror = () => {
        setActiveSpeaker(null);
        idx++;
        const gap = ACTIVE_TRANSCRIPT[idx]?.speaker !== line.speaker ? 700 : 280;
        setTimeout(playNext, gap);
      };
      synth.cancel();
      synth.speak(utt);
    };
    // Wait for voices to load on first call
    if (voices.length === 0) { synth.onvoiceschanged = () => launchCall(playNext); }
    else { launchCall(playNext); }
  };

  const launchCall = (playFn) => {
    setUiState("dialing");
    addTimer(() => { if (!cancelRef.current) setUiState("connected"); }, 2000);
    addTimer(() => { if (!cancelRef.current) { setUiState("active"); playFn(); } }, 3500);
  };

  // ── Live demo functions ──
  // Echo guard: never start speech recognition while AI audio is playing.
  // speakAI already kills recognition and waits 800ms after playback, but this
  // adds a safety check so the mic never opens during AI speech.
  const startListening = () => new Promise((resolve, reject) => {
    // Block if AI is currently speaking — prevents echo pickup
    if (audioRef.current && audioRef.current._src && audioRef.current._src.playbackState === 2) {
      return reject(new Error("ai-speaking"));
    }
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    let settled = false;
    const finish = (fn, val) => {
      if (settled) return;
      settled = true;
      window._liveTextResolve = null;
      try { if (recognitionRef.current) recognitionRef.current.abort(); } catch {}
      setInterimText("");
      setIsListening(false);
      fn(val);
    };
    // Always allow typed input to resolve this listen, in parallel with mic
    window._liveTextResolve = (text) => finish(resolve, text);

    if (!SpeechRec) {
      // No mic — wait purely on text input (no reject; user can still type)
      setIsListening(true);
      setActiveSpeaker("Patient");
      return;
    }
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    recognitionRef.current = rec;
    let gotResult = false;
    rec.onresult = (e) => {
      const result = e.results[0];
      if (result.isFinal) {
        gotResult = true;
        finish(resolve, result[0].transcript);
      } else {
        setInterimText(result[0].transcript);
      }
    };
    rec.onerror = (e) => { if (!settled) finish(reject, new Error(e.error)); };
    rec.onend = () => { if (!gotResult && !settled) finish(reject, new Error("no-speech")); };
    setIsListening(true);
    setActiveSpeaker("Patient");
    rec.start();
  });

  const demoCache = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('cache') === '1';

  const activePatientKey = (patient?.id === 5 || patient?.id === 101) ? 'marcus' : patient?.id === 1 ? 'sarah' : undefined;

  const sendToAPI = async (msgs, turn, maxTurns) => {
    const res = await fetch("/api/voice-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, patientContext: getPatientContext(), turn, maxTurns, ...(activePatientKey && { patient: activePatientKey }), ...(demoCache && { demoCache: true }) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API ${res.status}`);
    }
    return res.json();
  };

  // Streaming version: calls onTextChunk as text arrives, returns final metadata
  const sendToAPIStreaming = async (msgs, turn, maxTurns, onTextChunk) => {
    const res = await fetch("/api/voice-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, patientContext: getPatientContext(), turn, maxTurns, stream: true, ...(activePatientKey && { patient: activePatientKey }) }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `API ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const part of parts) {
        if (!part.startsWith('data: ')) continue;
        let data;
        try { data = JSON.parse(part.slice(6)); } catch { continue; }
        if (data.type === 'text' && data.content) {
          onTextChunk(data.content);
        } else if (data.type === 'done') {
          result = data;
        } else if (data.type === 'error') {
          throw new Error(data.error || 'Stream error');
        }
      }
    }
    if (!result) throw new Error('Stream ended without completion');
    return result;
  };

  const processMetadata = (data) => {
    if (data.fhirQueries?.length) {
      data.fhirQueries.forEach((q, i) => {
        addTimer(() => {
          if (!cancelRef.current) setFhirLog(p => [...p, { ...q, color: q.method === "POST" ? c.red : "#2563EB" }]);
        }, i * 400);
      });
    }
    if (data.riskScore && data.riskScore > riskScore) setRiskScore(data.riskScore);
    if (data.assessment) setAiAssessment(data.assessment);
    if (data.generateAlert) {
      setAlertGenerated(true);
      addTimer(() => { if (!cancelRef.current) setUiState("alert"); }, 600);
    }
    // Broadcast escalation to coordinator view (cross-tab via localStorage)
    if (data.riskScore || data.generateAlert) {
      const level = (data.riskScore || 0) >= 80 ? 'critical' : (data.riskScore || 0) >= 45 ? 'high' : (data.riskScore || 0) >= 20 ? 'moderate' : 'low';
      localStorage.setItem('vardana-escalation', JSON.stringify({ patientId: patient?.id, riskScore: data.riskScore, generateAlert: data.generateAlert, riskLevel: level, timestamp: Date.now() }));
    }
  };

  // Returns true if TTS succeeded, false if it failed
  // No browser TTS fallback mid-call — voice switching is jarring
  const speakAI = async (text, allowBrowserFallback = false) => {
    // Kill any active speech recognition before AI speaks — prevents 2 voices overlapping
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    setIsListening(false);
    setActiveSpeaker("AI");

    // Use MediaSource streaming on supported browsers — audio starts on first chunk (~200-400ms).
    // Safari/iOS don't support MediaSource for audio/mpeg, so they fall back to the blob path.
    const canStream = typeof MediaSource !== 'undefined' && MediaSource.isTypeSupported('audio/mpeg');

    try {
      // First utterance uses blob+WebAudio path (more reliable with autoplay policy)
      // Subsequent utterances use streaming if supported
      const useBlob = allowBrowserFallback || !canStream;
      if (!useBlob) {
        let res;
        try {
          res = await fetch("/api/elevenlabs-tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text, speaker: "AI" }),
          });
        } catch (e) {
          throw new Error(`Network error — ${e.message}`);
        }
        if (!res.ok) {
          let detail = "";
          try { const j = await res.json(); detail = j?.error || ""; } catch {}
          throw new Error(`HTTP ${res.status}${detail ? ": " + detail : ""}`);
        }
        await playStreamingResponse(res);
      } else {
        const url = await fetchAudio(text, "AI");
        await playAudioUrl(url);
      }
      // Echo guard: pause after AI audio ends before mic opens,
      // prevents the mic from picking up the tail end of AI's own speech
      await new Promise(r => setTimeout(r, 800));
      setActiveSpeaker(null);
      return true;
    } catch {
      // Only use browser TTS at the very start of a call (greeting) — never mid-call
      if (allowBrowserFallback) {
        const synth = window.speechSynthesis;
        if (synth) {
          const utt = new SpeechSynthesisUtterance(text);
          utt.rate = 0.87; utt.pitch = 0.82;
          utt.volume = mutedRef.current ? 0 : 1;
          await new Promise(resolve => { utt.onend = utt.onerror = resolve; synth.cancel(); synth.speak(utt); });
        }
        await new Promise(r => setTimeout(r, 800)); // echo guard
        setActiveSpeaker(null);
        return true; // browser fallback counts as OK for greeting
      }
      setActiveSpeaker(null);
      return false;
    }
  };

  // Play the pre-cached failsafe message and end the call gracefully
  // Minimal streaming TTS helper — fetches and plays via MediaSource.
  // No speaker-state management, no echo guard (caller handles those).
  // Used by the live conversation loop to pipeline Claude → Cartesia segment-by-segment.
  const streamTTSFetch = (text) => {
    return fetch("/api/elevenlabs-tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speaker: "AI" }),
    }).then(res => res.ok ? res : Promise.reject(new Error(`HTTP ${res.status}`)));
  };

  const playFailsafeAndEnd = async () => {
    const pfName = patient?.name?.split(' ')[0] || 'there';
    const pfCoord = ACTIVE_CLINICAL[patient?.id]?.coordinator || PATIENT_CLINICAL_DATA[patient?.id]?.coordinator || "Rachel Kim, RN";
    const failsafeText = `I'm sorry ${pfName}, we're experiencing a brief technical issue. Don't worry — I've shared everything from our conversation with your care coordinator ${pfCoord.split(',')[0]}, and they will follow up with you today. Take care.`;
    setTranscript(p => [...p, { speaker: "AI", text: failsafeText }]);
    setActiveSpeaker("AI");
    // Try pre-cached audio first, then fresh fetch, then browser TTS
    let played = false;
    if (failsafeAudio.current) {
      try {
        await playAudioUrl(failsafeAudio.current);
        played = true;
      } catch {}
    }
    if (!played) {
      try {
        const url = await fetchAudioOnce(failsafeText, "AI");
        await playAudioUrl(url);
        played = true;
      } catch {}
    }
    if (!played) {
      const synth = window.speechSynthesis;
      if (synth) {
        const utt = new SpeechSynthesisUtterance(failsafeText);
        utt.rate = 0.87; utt.pitch = 0.82;
        utt.volume = mutedRef.current ? 0 : 1;
        await new Promise(resolve => { utt.onend = utt.onerror = resolve; synth.cancel(); synth.speak(utt); });
      }
    }
    setActiveSpeaker(null);
    setUiState("done");
  };

  const runLiveConversation = async () => {
    const history = [];
    const firstName = patient?.name?.split(' ')[0] || 'there';
    // Pre-cache failsafe audio in background (don't await — let it load while call runs)
    const coordinatorName = ACTIVE_CLINICAL[patient?.id]?.coordinator || PATIENT_CLINICAL_DATA[patient?.id]?.coordinator || "Rachel Kim, RN";
    const failsafeMsg = `I'm sorry ${firstName}, we're experiencing a brief technical issue. Don't worry — I've shared everything from our conversation with your care coordinator ${coordinatorName.split(',')[0]}, and they will follow up with you today. Take care.`;
    fetchAudioOnce(failsafeMsg, "AI")
      .then(url => { failsafeAudio.current = url; })
      .catch(() => {}); // silent fail — we'll try again in playFailsafeAndEnd

    // Marcus: clinical opener replaces generic greeting + throwaway exchange
    if (isMarcusDemo) {
      const marcusGreeting = `Good morning, ${firstName}. I have your Day ${patient.day || 22} readings pulled up. Your blood pressure today is 158 over 98, which has been trending up over the last few days from your best of 129 over 80 on Day 14. How have you been feeling?`;
      setTranscript(p => [...p, { speaker: "AI", text: marcusGreeting }]);
      history.push({ role: "assistant", content: marcusGreeting });
      setConversationHistory([...history]);
      await speakAI(marcusGreeting, true);
      if (cancelRef.current) return;
    } else {
      // All other patients: generic greeting → patient response → clinical transition
      const dayInfo = patient?.day ? ` Day ${patient.day}` : "";
      const greeting = `Good morning ${firstName}. This is the Vardana care concierge calling for your${dayInfo} check-in. How are you feeling today?`;
      setTranscript(p => [...p, { speaker: "AI", text: greeting }]);
      history.push({ role: "assistant", content: greeting });
      setConversationHistory([...history]);
      await speakAI(greeting, true);
      if (cancelRef.current) return;

      // Wait for patient to respond to greeting
      let greetReply;
      try {
        greetReply = await startListening();
      } catch {
        setIsListening(false);
        setActiveSpeaker(null);
        greetReply = await new Promise(resolve => { window._liveTextResolve = resolve; });
      }
      if (cancelRef.current) return;
      setActiveSpeaker(null);
      setTranscript(p => [...p, { speaker: firstName, text: greetReply }]);
      history.push({ role: "user", content: greetReply });
      setConversationHistory([...history]);

      // AI acknowledges greeting and transitions to check-in
      // Broad pattern: catch explicit negatives, sleep/fatigue/pain, and ambivalent hedging
      const negativePattern = /\b(not\s+(so\s+)?(good|great|well|fine)|bad|terrible|awful|horrible|rough|sick|worse|pain|hurt|struggling|miserable|don'?t\s+feel\s+(so\s+)?(good|great|well)|tired|fatigue|exhaust|sleep|slept|insomnia|can'?t\s+sleep|restless|swollen|swell|edema|dizzy|nausea|breath|chest|ache|weak|haven'?t\s+(been\s+)?(sleeping|feeling|eating)|a\s+(little|bit)\s+(tired|off|worse|rough))\b/i;
      const isNegative = negativePattern.test(greetReply);
      let verifiedMsg;
      if (patient?.id === 1) {
        verifiedMsg = isNegative
          ? `I'm sorry to hear that, ${firstName}. I want to make sure we take good care of you. I'm checking in because I noticed your weight has gone up a couple of pounds over the last two days. Can you tell me more about how you've been feeling?`
          : `Good to hear, ${firstName}. I'm checking in because I noticed your weight has gone up a couple of pounds over the last two days. Have you noticed any ankle swelling or shortness of breath?`;
      } else {
        verifiedMsg = isNegative
          ? `I'm sorry to hear that, ${firstName}. I want to make sure we take good care of you. This is your Day ${patient?.day || ""} check-in — let's go through how you've been doing.`
          : `Good to hear, ${firstName}. This is your Day ${patient?.day || ""} check-in — let me pull up your recent readings and we can go through them together.`;
      }
      setTranscript(p => [...p, { speaker: "AI", text: verifiedMsg }]);
      history.push({ role: "assistant", content: verifiedMsg });
      setConversationHistory([...history]);
      await speakAI(verifiedMsg);
      if (cancelRef.current) return;
    }

    // Conversation loop — AI already spoke, so start by listening
    const maxTurns = 20;
    let conversationEnded = false;
    for (let turn = 0; turn < maxTurns; turn++) {
      if (cancelRef.current) return;

      // Listen for patient
      let userText;
      try {
        userText = await startListening();
      } catch {
        // Speech recognition failed — wait for text input with 90s timeout
        setIsListening(false);
        setActiveSpeaker(null);
        userText = await Promise.race([
          new Promise(resolve => { window._liveTextResolve = resolve; }),
          new Promise(resolve => setTimeout(() => resolve(null), 90000))
        ]);
        if (!userText) {
          // Timed out waiting for input — end gracefully
          if (!cancelRef.current) {
            const timeoutMsg = `It seems like we may have lost our connection, ${firstName}. No worries — I'll share everything from our conversation with your care team. Take care!`;
            setTranscript(p => [...p, { speaker: "AI", text: timeoutMsg }]);
            await speakAI(timeoutMsg, true);
            setUiState("done");
          }
          return;
        }
      }
      if (cancelRef.current) return;
      setActiveSpeaker(null);
      setTranscript(p => [...p, { speaker: firstName, text: userText }]);
      history.push({ role: "user", content: userText });
      setConversationHistory([...history]);

      // Get AI response — stream text into transcript for instant feedback
      setIsThinking(true);
      let aiData;
      let streamedText = '';
      let streamIdx = null;
      try {
        aiData = await sendToAPIStreaming(history, turn, maxTurns, (chunk) => {
          if (streamIdx === null) {
            // First chunk — stop "thinking" indicator and add streaming transcript entry
            setIsThinking(false);
            setTranscript(p => { streamIdx = p.length; return [...p, { speaker: "AI", text: chunk }]; });
            streamedText = chunk;
          } else {
            streamedText += chunk;
            setTranscript(p => p.map((t, i) => i === streamIdx ? { ...t, text: streamedText } : t));
          }
        });
      } catch (err) {
        setIsThinking(false);
        await playFailsafeAndEnd();
        return;
      }
      setIsThinking(false);
      if (cancelRef.current) return;

      // Finalize transcript with cleaned reply (metadata stripped)
      if (streamIdx !== null) {
        setTranscript(p => p.map((t, i) => i === streamIdx ? { ...t, text: aiData.reply } : t));
      } else {
        setTranscript(p => [...p, { speaker: "AI", text: aiData.reply }]);
      }

      // Process metadata
      processMetadata(aiData);
      history.push({ role: "assistant", content: aiData.reply });
      setConversationHistory([...history]);

      // Speak response — single-segment path (reverted from pipeline due to
      // double MediaSource instance race). MIN_PLAY_BYTES bump from 12288 →
      // 24576 in playStreamingResponse still handles the first-word clipping.
      const ttsOk = await speakAI(aiData.reply);
      if (cancelRef.current) return;

      // If TTS failed mid-call, play failsafe exit and end immediately
      if (!ttsOk) {
        await playFailsafeAndEnd();
        return;
      }

      // Check if done — when AI says goodbye, let patient respond before ending.
      // If the AI ended with a question, it's not truly done — continue the loop
      // so the patient can answer and get a proper closing response.
      const endsWithQuestion = /\?\s*$/.test(aiData.reply);
      if (aiData.phase === "done" && !endsWithQuestion) {
        conversationEnded = true;
        // Patient gets to say goodbye back
        if (!cancelRef.current) {
          try {
            const finalText = await startListening();
            if (finalText && !cancelRef.current) {
              setTranscript(p => [...p, { speaker: firstName, text: finalText }]);
            }
          } catch {
            setIsListening(false);
            setActiveSpeaker(null);
          }
        }
        setUiState("done");
        break;
      }
    }

    // Graceful ending ONLY when max turns reached without AI already saying goodbye
    // Instead of a hardcoded message, send one final API call so the AI can address
    // any unresolved concerns the patient raised in the last turn.
    if (!conversationEnded && !cancelRef.current) {
      let closingMsg;
      try {
        const finalData = await sendToAPI(history, maxTurns, maxTurns); // remaining=0 triggers FINAL pacing
        closingMsg = finalData.reply;
        processMetadata(finalData);
      } catch {
        // Fallback if API fails
        const coordName = ACTIVE_CLINICAL[patient?.id]?.coordinator || PATIENT_CLINICAL_DATA[patient?.id]?.coordinator || "Rachel Kim, RN";
        closingMsg = `Well ${firstName}, it was great checking in with you today. I've noted everything from our conversation, and your care coordinator ${coordName.split(',')[0]} will have a full summary. If anything changes or you have concerns before your next check-in, don't hesitate to reach out. Take care!`;
      }
      setTranscript(p => [...p, { speaker: "AI", text: closingMsg }]);
      history.push({ role: "assistant", content: closingMsg });
      setConversationHistory([...history]);
      await speakAI(closingMsg, true);
      setUiState("done");
    }
  };

  const startLiveDemo = async () => {
    cancelRef.current = false;
    unlockAudio();   // iOS: must unlock AudioContext during user gesture
    setDemoMode("live");
    setApiError("");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      setApiError("Microphone access required for live demo. Please allow mic access and try again.");
      return;
    }
    if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
      setApiError("Speech recognition requires Chrome. Please open in Chrome for live demo.");
      return;
    }
    launchCall(() => runLiveConversation());
  };

  // Auto-start live call when autoStartLive is set (skip setup screen)
  const autoStartLiveRef = useRef(false);
  useEffect(() => {
    if (!autoStartLive || autoStartLiveRef.current) return;
    autoStartLiveRef.current = true;
    startLiveDemo();
  }, [autoStartLive]);

  const submitTextInput = () => {
    const text = textInput.trim();
    if (!text) return;
    setTextInput("");
    // _liveTextResolve is set by startListening() so typed input flows through
    // the same conversation loop as voice — appends to transcript, calls Claude,
    // plays Cartesia. No duplicate transcript-add here.
    if (window._liveTextResolve) {
      window._liveTextResolve(text);
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    mutedRef.current = next;
    // Web Audio API gain node (iOS path)
    if (gainRef.current) gainRef.current.gain.value = next ? 0 : 1;
    // HTML5 Audio fallback
    if (audioRef.current?.volume !== undefined) audioRef.current.volume = next ? 0 : 1;
  };

  const endCall = async () => {
    // Stop listening/recognition immediately
    if (recognitionRef.current) try { recognitionRef.current.abort(); } catch {}
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    clearTimers();
    setIsListening(false);
    setIsThinking(false);
    cancelRef.current = true;

    // Speak a brief goodbye before ending
    const pfName = patient?.name?.split(' ')[0] || 'there';
    const goodbyeMsg = `Thank you for your time, ${pfName}. Your care team will have a summary of our conversation. Take care!`;
    setTranscript(p => [...p, { speaker: "AI", text: goodbyeMsg }]);
    setActiveSpeaker("AI");
    try {
      const url = await fetchAudio(goodbyeMsg, "AI");
      await playAudioUrl(url);
    } catch {
      // If TTS fails, try browser fallback
      const synth = window.speechSynthesis;
      if (synth) {
        const utt = new SpeechSynthesisUtterance(goodbyeMsg);
        utt.rate = 0.87; utt.pitch = 0.82;
        utt.volume = mutedRef.current ? 0 : 1;
        await new Promise(resolve => { utt.onend = utt.onerror = resolve; synth.cancel(); synth.speak(utt); });
      }
    }
    setActiveSpeaker(null);
    setUiState("done");
  };

  const generateSummary = async (lines) => {
    const text = lines.map(l => `${l.speaker}: ${l.text}`).join("\n");
    try {
      const res = await fetch("/api/voice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: `Summarize this patient call in 2-3 sentences. Focus on findings and actions.\n\n${text}` }], patientContext: getPatientContext() }),
      });
      if (res.ok) { const d = await res.json(); return d.reply; }
    } catch {}
    return `Call completed (${lines.length} exchanges). Check-in topics discussed.`;
  };

  const [isSummarizing, setIsSummarizing] = useState(false);
  const handleComplete = async () => {
    if (transcript.length > 0) {
      setIsSummarizing(true);
      const summary = await generateSummary(transcript);
      setIsSummarizing(false);
      onComplete({ transcript: [...transcript], summary, timestamp: new Date().toLocaleString(), duration: formatTime(elapsed), riskScore, alertGenerated });
    } else {
      onComplete(null);
    }
  };

  const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const waveHeights = [0.3, 0.6, 1.0, 0.7, 0.4, 0.8, 1.0, 0.5, 0.3, 0.7, 0.9, 0.4];
  const isActive    = ["active", "alert"].includes(uiState);
  const riskColor   = riskScore >= 80 ? c.red : riskScore >= 60 ? c.orange : isMarcusDemo ? "#D97706" : c.green;
  const waveOn      = isActive && activeSpeaker !== null && !muted;

  // ─────────────────────────────────────────────
  // TAP-TO-START OVERLAY (mobile autoplay blocked)
  // ─────────────────────────────────────────────
  if (autoStartScripted && !audioUnlocked) return (
    <div
      onClick={handleUnlockAndStart}
      style={{
        position: "fixed", inset: 0,
        background: "#0C1420",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        zIndex: 300, cursor: "pointer",
      }}
    >
      <div style={{
        width: 72, height: 72, borderRadius: "50%",
        background: "rgba(245,158,11,0.15)",
        border: "2px solid #F59E0B",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20, animation: "pulse 1.5s ease infinite",
      }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#F59E0B">
          <polygon points="5,3 19,12 5,21"/>
        </svg>
      </div>
      <div style={{
        fontFamily: "'DM Serif Display', Georgia, serif",
        fontSize: 20, color: "#F5F7FA", marginBottom: 8,
      }}>
        Tap to start the demo
      </div>
      <div style={{ fontSize: 13, color: "#556882" }}>
        {patient.name} · Day {patient.day || '15'} · {isMarcusDemo ? 'HTN/DM check-in' : 'CHF check-in'}
      </div>
      <div style={{ fontSize: 12, color: '#3A4F6B', marginTop: 12 }}>
        {preloadProgress < 100
          ? `Loading... ${preloadProgress}%`
          : 'Ready \u2014 tap to start'}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // SETUP SCREEN
  // ─────────────────────────────────────────────
  if (uiState === "setup") return (
    <div style={{ position: "fixed", inset: 0, background: c.navy, zIndex: 300, display: "flex", alignItems: isMobileView ? "flex-start" : "center", justifyContent: "center", fontFamily: c.font, padding: isMobileView ? 16 : 24, overflowY: "auto" }}>
      <div style={{ width: "100%", maxWidth: 540, ...(isMobileView ? { paddingTop: 20 } : {}) }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 400, color: "white", letterSpacing: "-0.02em", fontFamily: DS.fontDisplay }}>Vardana<span style={{ color: DS.color.amber[400] }}>.</span></div>
          <div style={{ fontSize: 13, color: "#475569", marginTop: 5 }}>Voice Demo · AI Concierge Call · {patient.name}</div>
        </div>

        {/* Scenario card */}
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 18px", marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={22} color="#A78BFA" /></div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{patient.name}, {patient.age}{isEpic ? (patient.epicData?.patient?.gender === 'male' ? 'M' : 'F') : (patient.gender || '')}{isEpic ? ` — ${(patient.epicData?.conditions || []).length} active conditions` : (patient.id === 5 || patient.id === 101) ? ` — HTN + T2DM · Day ${patient.day || '?'}/90` : ` — CHF · Day ${patient.day || '?'}/90`}</div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>{isEpic ? 'Live Epic FHIR data · AI check-in with real patient context' : patient.id === 1 ? '2.3 lb weight gain. AI calls to assess. Decompensation detected → FHIR alert fires mid-call.' : `${patient.phase} phase · AI check-in with full clinical context`}</div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {apiError && (
          <div style={{ padding: "9px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#FCA5A5", lineHeight: 1.5, marginBottom: 12, wordBreak: "break-word" }}>
            {apiError}
          </div>
        )}

        {/* Start Call */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, marginBottom: 14, textAlign: "center" }}>
            You speak as {patient.name.split(' ')[0]}. Claude AI responds in real-time as the care concierge. Natural conversation with live FHIR queries.
          </div>
          <button onClick={startLiveDemo}
            style={{ width: "100%", padding: "14px", borderRadius: 10, background: "linear-gradient(135deg, #0EA5E9, #0284C7)", color: "white", border: "none", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="phone" size={16} color="white" /> Start Call
          </button>
          <div style={{ fontSize: 10, color: "#475569", textAlign: "center", marginTop: 8 }}>Requires microphone · Chrome</div>
        </div>

        <button onClick={() => onComplete(null)}
          style={{ width: "100%", marginTop: 8, padding: "9px", border: "none", background: "none", color: "#334155", fontSize: 12, cursor: "pointer", fontFamily: c.font }}>
          ← Return to Dashboard
        </button>
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────
  if (uiState === "loading") return (
    <div style={{ position: "fixed", inset: 0, background: "#F6F7F9", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: c.font }}>
      <div style={{ width: 360, textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 20 }}>🎙</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#1E3A5F", marginBottom: 8 }}>Generating audio</div>
        <div style={{ fontSize: 13, color: "#7A96B0", marginBottom: 28 }}>
          Rendering {ACTIVE_TRANSCRIPT.length} lines...
        </div>
        {/* Progress bar — use preloadProgress when preload is active, otherwise loadProgress */}
        {(() => { const pct = Math.max(loadProgress, preloadProgress); const line = Math.ceil(pct / (100 / ACTIVE_TRANSCRIPT.length)); return (<>
        <div style={{ background: "#E8EDF3", borderRadius: 8, height: 8, overflow: "hidden", marginBottom: 12 }}>
          <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #3DBFA0, #2A9E84)", width: `${pct}%`, transition: "width 0.4s ease" }} />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#7A96B0" }}>{pct}% · Line {line} of {ACTIVE_TRANSCRIPT.length}</div>
        </>); })()}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────
  // CLOSING SLIDE — smooth fade + call summary end screen
  // ─────────────────────────────────────────────
  if (uiState === "closing") {
    const closingTranscript = isMarcusDemo ? MARCUS_VOICE_TRANSCRIPT : VOICE_TRANSCRIPT;
    const closingDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const summaryRows = isMarcusDemo ? [
      { label: "Risk score", value: "53 \u2192 73", color: "#C0392B" },
      { label: "Alert fired", value: "P2: Urgent", color: "#C0392B" },
      { label: "Coordinator notified", value: "David Park", color: "#059669" },
      { label: "FHIR flag posted", value: "Epic sandbox", color: "#059669" },
    ] : [
      { label: "Risk score", value: "68 \u2192 84", color: "#C0392B" },
      { label: "Alert fired", value: "P1: Urgent", color: "#C0392B" },
      { label: "Coordinator notified", value: "Rachel Kim", color: "#059669" },
      { label: "FHIR flag posted", value: "Epic sandbox", color: "#059669" },
    ];
    const signalPills = isMarcusDemo ? [
      { text: "BP 158/98", color: "#C0392B", bg: "#FEF2F2" },
      { text: "Lisinopril missed", color: "#D97706", bg: "#FFFBEB" },
      { text: "Headache confirmed", color: "#D97706", bg: "#FFFBEB" },
    ] : [
      { text: "Weight +2.3 lbs", color: "#C0392B", bg: "#FEF2F2" },
      { text: "BP reversed", color: "#D97706", bg: "#FFFBEB" },
      { text: "Edema confirmed", color: "#C0392B", bg: "#FEF2F2" },
    ];
    const summaryHeader = isMarcusDemo ? "BP crisis risk detected" : "Early decompensation pattern detected";
    const summaryNarrative = isMarcusDemo
      ? "Marcus reported a headache and confirmed missing Lisinopril for a few days. Combined with a 4-day BP rise to 158/98, a P2 alert was generated and dispatched to Nurse David Park for same-day medication reconciliation and BP recheck."
      : "Sarah reported ankle swelling and fatigue. Weight up 2.3 lbs over 48 hours combined with BP reversal triggered a P1 alert to Nurse Rachel Kim for same-day cardiology follow-up.";
    const rightNarrative = isMarcusDemo
      ? "Marcus's call flagged a developing BP crisis. He confirmed missing Lisinopril for a few days and reported a morning headache alongside a 4-day blood pressure rise to 158/98. A P2 alert was dispatched to Nurse David Park for same-day medication reconciliation and BP recheck."
      : "Sarah's call confirmed early decompensation signs. She reported ankle swelling and fatigue alongside a 2.3 lb weight gain over 48 hours and BP reversal from her best reading. A P1 alert was dispatched to Nurse Rachel Kim for same-day cardiology follow-up.";
    const patientLabel = isMarcusDemo ? "Marcus" : "Sarah";
    const patientInitial = patientLabel.charAt(0);

    return (
      <div style={{
        position: "fixed", inset: 0, background: "#F6F7F9", zIndex: 300,
        display: "flex", flexDirection: "column",
        alignItems: "center",
        padding: "32px 24px",
        fontFamily: c.font, animation: "fadeIn 0.8s ease",
        overflowY: "auto",
      }}>
        {/* Vardana logo + wordmark */}
        <div style={{ marginBottom: 24, textAlign: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
              <rect width="32" height="32" rx="8" fill="#3DBFA0" />
              <path d="M16 7C11 7 7 11 7 16s4 9 9 9 9-4 9-9-4-9-9-9zm0 14.5c-1.5 0-3-0.8-3.8-2.2l1.3-0.8c0.5 0.9 1.4 1.5 2.5 1.5s2-0.6 2.5-1.5l1.3 0.8c-0.8 1.4-2.3 2.2-3.8 2.2zm4.5-5h-9v-1.5h9v1.5z" fill="white"/>
            </svg>
            <span style={{ fontFamily: DS.fontDisplay, fontSize: 22, fontWeight: 400, color: "#1E3A5F", letterSpacing: "-0.02em" }}>Vardana</span>
          </div>
        </div>

        {/* Two-panel layout: summary (3fr) + detail (2fr) */}
        <div style={{
          display: "flex",
          flexDirection: isMobileView ? "column" : "row",
          gap: 20,
          maxWidth: 900,
          width: "100%",
          marginBottom: 24,
        }}>
          {/* LEFT — Call Summary card (primary) */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #D1D9E0",
            borderRadius: 16, padding: "24px 28px",
            flex: isMobileView ? "none" : 3,
            width: isMobileView ? "100%" : "auto",
            boxShadow: "0 2px 6px rgba(30,58,95,0.07)",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7A96B0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Call Summary
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E3A5F", marginBottom: 12, fontFamily: DS.fontDisplay, letterSpacing: "-0.01em" }}>
              {summaryHeader}
            </div>
            <p style={{ fontSize: 14, color: "#4A6380", lineHeight: 1.65, margin: "0 0 16px" }}>
              {summaryNarrative}
            </p>

            {/* Signal pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
              {signalPills.map((pill, i) => (
                <span key={i} style={{
                  fontSize: 12, fontWeight: 700, color: pill.color,
                  background: pill.bg, border: `1px solid ${pill.color}25`,
                  borderRadius: 6, padding: "4px 10px",
                }}>
                  {pill.text}
                </span>
              ))}
            </div>

            {/* Summary rows */}
            {summaryRows.map((row, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", padding: "8px 0",
                borderTop: i === 0 ? "1px solid #E8EDF3" : "none",
                borderBottom: i < summaryRows.length - 1 ? "1px solid #E8EDF3" : "none",
              }}>
                <span style={{ fontSize: 13, color: "#7A96B0" }}>{row.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: row.color }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* RIGHT — Narrative + collapsible transcript (subordinate) */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #D1D9E0",
            borderRadius: 16, padding: "20px 24px",
            flex: isMobileView ? "none" : 2,
            width: isMobileView ? "100%" : "auto",
            boxShadow: "0 2px 6px rgba(30,58,95,0.07)",
            alignSelf: "flex-start",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7A96B0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
              Call Detail
            </div>
            <p style={{ fontSize: 13, color: "#4A6380", lineHeight: 1.65, margin: "0 0 14px" }}>
              {rightNarrative}
            </p>
            <div style={{ fontSize: 12, color: "#7A96B0", marginBottom: 12 }}>
              Call completed {closingDate} &middot; ~90 seconds
            </div>

            {/* Transcript toggle */}
            <div style={{ borderTop: "1px solid #E8EDF3", paddingTop: 10 }}>
              {/* TODO: link to persisted transcript once pilot logging is live */}
              <a
                href="#"
                onClick={e => { e.preventDefault(); setShowTranscript(prev => !prev); }}
                style={{ fontSize: 12, color: "#3DBFA0", textDecoration: "none", fontWeight: 600 }}
              >
                {showTranscript ? "Hide transcript" : "View call transcript \u2192"}
              </a>
            </div>

            {/* Collapsible transcript */}
            {showTranscript && (
              <div style={{
                marginTop: 14, display: "flex", flexDirection: "column", gap: 12,
                maxHeight: 400, overflowY: "auto", paddingRight: 4,
              }}>
                {closingTranscript.map((line, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: line.speaker === "AI" ? "#E8F5F1" : "#EDE9FE",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700,
                      color: line.speaker === "AI" ? "#1A7A61" : "#7C3AED",
                      marginTop: 3,
                    }}>
                      {line.speaker === "AI" ? "V" : patientInitial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: "#7A96B0",
                        marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em",
                      }}>
                        {line.speaker === "AI" ? "Vardana AI" : patientLabel}
                      </div>
                      <div style={{
                        fontSize: 13, color: "#4A6380", lineHeight: 1.6,
                        background: line.speaker === "AI" ? "#F6F7F9" : "#FAFBFC",
                        padding: "9px 13px", borderRadius: 10,
                        border: "1px solid #E8EDF3",
                      }}>
                        {line.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tagline + CTA */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: DS.fontDisplay, fontSize: 22, color: "#1E3A5F", letterSpacing: "-0.02em", marginBottom: 6 }}>
            Vardana.
          </div>
          <div style={{ fontSize: 14, color: "#7A96B0", marginBottom: 4 }}>
            {isMarcusDemo ? "Chronic condition management across CHF, hypertension, diabetes, and beyond." : "CHF post-discharge care."}
          </div>
          <div style={{ fontSize: 14, color: "#7A96B0", marginBottom: 24 }}>
            Request a pilot at{" "}
            <a href="https://vardana.ai" style={{ color: "#3DBFA0", textDecoration: "none" }}>vardana.ai</a>
          </div>

          <button
            onClick={() => { if (onExitDemo) { onExitDemo(); } else { setUiState("done"); handleComplete(); } }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#3DBFA0"; e.currentTarget.style.color = "#3DBFA0"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#D1D9E0"; e.currentTarget.style.color = "#7A96B0"; }}
            style={{
              background: "none", border: "1px solid #D1D9E0",
              borderRadius: 10, padding: "10px 24px",
              fontSize: 13, color: "#7A96B0", cursor: "pointer",
              fontFamily: "'DM Sans', system-ui, sans-serif",
              transition: "all 0.2s ease",
            }}
          >
            Close Demo
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // CALL SCREEN (dialing / connected / active / alert / done)
  // ─────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: "#F6F7F9", zIndex: 300, display: "flex", flexDirection: "column", fontFamily: c.font }}>

      {/* Top bar */}
      <div style={{ padding: isMobileView ? "10px 12px" : "14px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1E3A5F", borderBottom: "1px solid rgba(255,255,255,0.08)", gap: 8, flexWrap: isMobileView ? "wrap" : "nowrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? 6 : 10, minWidth: 0, flex: isMobileView ? "1 1 auto" : "none" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: uiState === "done" ? "#7FA4C4" : "#22C55E", boxShadow: isActive ? "0 0 0 4px rgba(34,197,94,0.2)" : "none", transition: "all 0.3s", flexShrink: 0 }} />
          <span style={{ fontSize: isMobileView ? 12 : 14, fontWeight: 700, color: "#F5F7FA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {uiState === "dialing"   ? (isMobileView ? "Connecting..." : `Connecting to ${patient.name}...`) :
             uiState === "connected" ? "Connected" :
             uiState === "done"      ? "Call Completed" :
             isThinking              ? "AI thinking..." :
             isListening             ? (isMobileView ? "Listening..." : `● Listening for ${patient.name.split(' ')[0]}...`) :
             activeSpeaker === "AI"  ? "AI speaking..." :
             (activeSpeaker && activeSpeaker !== "AI") ? (isMobileView ? "Patient..." : `${patient.name.split(' ')[0]} responding...`) :
             demoMode === "live"     ? "Live · AI Concierge" : "Live · AI Concierge"}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobileView ? 6 : 10, flexShrink: 0 }}>
          {isActive && !isMobileView && (
            <button onClick={toggleMute} style={{ background: muted ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.1)", border: `1px solid ${muted ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.15)"}`, color: muted ? "#FCA5A5" : "#F5F7FA", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>
              {muted ? "🔇 Muted" : "🔊 Audio On"}
            </button>
          )}
          {isActive && <span style={{ fontSize: isMobileView ? 11 : 13, color: "#7FA4C4", fontVariantNumeric: "tabular-nums" }}>{formatTime(elapsed)}</span>}
          {isActive && isMobileView && (
            <button onClick={toggleMute} style={{ background: muted ? "rgba(220,38,38,0.2)" : "rgba(255,255,255,0.1)", border: `1px solid ${muted ? "rgba(220,38,38,0.4)" : "rgba(255,255,255,0.15)"}`, color: muted ? "#FCA5A5" : "#F5F7FA", borderRadius: 8, padding: "5px 8px", cursor: "pointer", fontFamily: c.font, fontSize: 11, fontWeight: 700 }}>
              {muted ? "🔇" : "🔊"}
            </button>
          )}
          {isActive && (
            <button onClick={endCall} style={{ background: "#C0392B", border: "none", color: "white", borderRadius: 6, padding: isMobileView ? "6px 10px" : "6px 14px", cursor: "pointer", fontFamily: c.font, fontSize: 12, fontWeight: 700 }}>End{!isMobileView && " Call"}</button>
          )}
          {uiState === "done" && (
            <button onClick={handleComplete} disabled={isSummarizing} style={{ background: c.accent, border: "none", color: "white", borderRadius: 8, padding: isMobileView ? "6px 10px" : "7px 14px", cursor: "pointer", fontFamily: c.font, fontSize: isMobileView ? 11 : 13, fontWeight: 700, opacity: isSummarizing ? 0.7 : 1 }}>
              {isSummarizing ? "Summarizing..." : (isMobileView ? "Dashboard" : "Return to Dashboard")}
            </button>
          )}
        </div>
      </div>

      {/* Mobile: compact status bar with risk score + speaker avatars + panel toggle */}
      {isMobileView && isActive && (
        <div style={{ padding: "8px 12px", borderBottom: "1px solid #E8EDF3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* AI avatar small */}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#3DBFA0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", fontFamily: DS.fontDisplay, border: `2px solid ${activeSpeaker === "AI" ? "#3DBFA0" : "#D1D9E0"}`, transition: "all 0.3s" }}>V</div>
            {/* Waveform mini */}
            <div style={{ display: "flex", alignItems: "center", gap: 1.5, height: 20, opacity: waveOn ? 1 : 0.15, transition: "opacity 0.4s" }}>
              {Array.from({ length: 10 }, (_, i) => {
                const h = waveOn ? waveHeights[(i + waveFrame) % 12] : 0.12;
                const isPatientSpeaking = activeSpeaker && activeSpeaker !== "AI";
                return <div key={i} style={{ width: 2, height: `${Math.max(2, h * 18)}px`, borderRadius: 1, background: isPatientSpeaking ? "#1E3A5F" : "#3DBFA0", transition: "height 0.11s ease" }} />;
              })}
            </div>
            {/* Patient avatar small */}
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", fontFamily: DS.fontDisplay, border: `2px solid ${activeSpeaker && activeSpeaker !== "AI" ? "#1E3A5F" : "#D1D9E0"}`, transition: "all 0.3s" }}>{patient.name.charAt(0)}</div>
          </div>
          {/* Risk score compact + Alert indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, transform: alertZoom ? "scale(1.3)" : "scale(1)", transformOrigin: "center center", transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", background: alertZoom ? "rgba(220,38,38,0.1)" : "transparent", borderRadius: 8, padding: alertZoom ? "4px 8px" : 0 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>Risk</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: riskColor, fontVariantNumeric: "tabular-nums", transition: "all 0.9s" }}>{riskScore}</div>
            {alertGenerated && (
              <div style={{ fontSize: 9, fontWeight: 800, color: "#F87171", background: "rgba(220,38,38,0.15)", borderRadius: 4, padding: "2px 6px" }}>{isMarcusDemo ? "P2 ALERT" : "P1 ALERT"}</div>
            )}
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: isMobileView ? "column" : "row", overflow: isMobileView ? "auto" : "hidden" }}>

        {/* ── Left: speakers + gauge ── (hidden on mobile) */}
        {!isMobileView && (
        <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 18px", borderRight: "1px solid #E8EDF3", gap: 18, background: "#FFFFFF" }}>

          {/* AI avatar */}
          <div style={{ position: "relative" }}>
            {activeSpeaker === "AI" && <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "2px solid rgba(61,191,160,0.5)", animation: "ping 1s ease-out infinite" }} />}
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#3DBFA0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", fontFamily: DS.fontDisplay, border: `3px solid ${activeSpeaker === "AI" ? "#3DBFA0" : "#D1D9E0"}`, boxShadow: activeSpeaker === "AI" ? "0 0 24px rgba(61,191,160,0.35)" : "none", transition: "all 0.35s" }}>V</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: activeSpeaker === "AI" ? "#3DBFA0" : "#7A96B0", letterSpacing: "0.04em", transition: "color 0.3s" }}>VARDANA AI</div>

          {/* Shared waveform */}
          <div style={{ display: "flex", alignItems: "center", gap: 2.5, height: 32, opacity: waveOn ? 1 : 0.15, transition: "opacity 0.4s" }}>
            {Array.from({ length: 22 }, (_, i) => {
              const h = waveOn ? waveHeights[(i + waveFrame) % 12] : 0.12;
              const isPatientSpeaking = activeSpeaker && activeSpeaker !== "AI";
              return <div key={i} style={{ width: 2.5, height: `${Math.max(3, h * 28)}px`, borderRadius: 2, background: isPatientSpeaking ? "#1E3A5F" : "#3DBFA0", transition: "height 0.11s ease, background 0.3s" }} />;
            })}
          </div>

          {/* Patient avatar */}
          {(() => { const isPS = activeSpeaker && activeSpeaker !== "AI"; return (<>
          <div style={{ position: "relative" }}>
            {isPS && <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "2px solid rgba(30,58,95,0.5)", animation: "ping 1s ease-out infinite" }} />}
            <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 800, color: "white", fontFamily: DS.fontDisplay, border: `3px solid ${isPS ? "#1E3A5F" : "#D1D9E0"}`, boxShadow: isPS ? "0 0 24px rgba(30,58,95,0.3)" : "none", transition: "all 0.35s" }}>{patient.name.charAt(0)}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: isPS ? "#1E3A5F" : "#7A96B0", letterSpacing: "0.04em", transition: "color 0.3s" }}>{patient.name.toUpperCase()} · {patient.age}{isEpic ? (patient.epicData?.patient?.gender === 'male' ? 'M' : 'F') : (patient.gender || '')}</div>
          </>); })()}

          {/* Risk gauge + Alert — zoom container */}
          <div style={{ width: "100%", transform: alertZoom ? "scale(1.45)" : "scale(1)", transformOrigin: "center center", transition: "transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)", zIndex: alertZoom ? 10 : 1, position: "relative" }}>
            {alertZoom && <div style={{ position: "absolute", inset: -12, borderRadius: 16, background: "rgba(220,38,38,0.08)", border: "2px solid rgba(220,38,38,0.3)", animation: "fhirPulse 1.5s ease infinite", pointerEvents: "none" }} />}
            {/* Risk gauge */}
            <div style={{ background: "#EEF1F5", borderRadius: 12, padding: "14px 16px", width: "100%", textAlign: "center", marginTop: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>{isMarcusDemo ? "BP Crisis Risk" : "Decompensation Risk"}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: riskColor, fontVariantNumeric: "tabular-nums", lineHeight: 1, transition: "all 0.9s ease" }}>{riskScore}</div>
              <div style={{ fontSize: 10, color: "#7A96B0", marginTop: 2 }}>/ 100</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#7A96B0", marginTop: 6 }}>↑ Updated live during call</div>
            </div>

            {/* Alert */}
            {alertGenerated && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 10, padding: "10px 12px", width: "100%", marginTop: 8, animation: "fadeIn 0.4s ease" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#C0392B", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}><Icon name="alert" size={11} color="#C0392B" /> {isMarcusDemo ? "P2 ALERT GENERATED" : "P1 ALERT GENERATED"}</div>
                <div style={{ fontSize: 10, color: "#A93226", lineHeight: 1.4 }}>{isMarcusDemo ? "BP Crisis Risk · Coordinator: David Park" : "FHIR Flag posted · Coordinator notified"}</div>
              </div>
            )}
          </div>

        </div>
        )}

        {/* ── Center: transcript ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: isMobileView ? 300 : "auto" }}>
          {!isMobileView && (
          <div style={{ padding: "13px 20px", borderBottom: "1px solid #E8EDF3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em" }}>Live Transcript</div>
            {activeSpeaker && (
              <div style={{ fontSize: 11, fontWeight: 700, color: activeSpeaker === "AI" ? "#3DBFA0" : "#7A96B0", display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: activeSpeaker === "AI" ? "#3DBFA0" : "#7A96B0", display: "inline-block", animation: "pulse 1s infinite" }} />
                {activeSpeaker === "AI" ? "AI Speaking" : "Patient Speaking"}
              </div>
            )}
          </div>
          )}
          <div ref={transcriptRef} style={{ flex: 1, overflowY: "auto", padding: isMobileView ? "12px 12px" : "16px 20px", display: "flex", flexDirection: "column", gap: isMobileView ? 10 : 12 }}>
            {uiState === "dialing" && (
              <div style={{ textAlign: "center", padding: "52px 0", color: "#7A96B0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon name="phone" size={36} color="#7A96B0" /></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#4A6380" }}>Initiating AI concierge call...</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Ringing {patient.name}{isEpic && patient.epicData?.patient?.phone ? ` · ${patient.epicData.patient.phone}` : !isEpic ? ' · (206) 555-0142' : ''}</div>
              </div>
            )}
            {uiState === "connected" && transcript.length === 0 && (
              <div style={{ textAlign: "center", padding: "52px 0", color: "#7A96B0" }}>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}><Icon name="check" size={36} color="#3DBFA0" /></div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#3DBFA0" }}>Connected</div>
                <div style={{ fontSize: 12, color: "#7A96B0", marginTop: 6 }}>AI concierge beginning structured check-in...</div>
              </div>
            )}
            {transcript.map((line, i) => {
              const speaking = i === transcript.length - 1 && activeSpeaker === line.speaker;
              const isPatientLine = line.speaker !== "AI";
              const patientLabel = demoMode === "live" ? "You" : patient.name;
              const patientInitial = demoMode === "live" ? "Y" : patient.name.charAt(0);
              return (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "slideUp 0.25s ease" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: line.speaker === "AI" ? "#3DBFA0" : "#1E3A5F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", marginTop: 3, border: speaking ? `1px solid ${line.speaker === "AI" ? "#3DBFA0" : "#1E3A5F"}` : "1px solid transparent", transition: "all 0.3s" }}>
                    {line.speaker === "AI" ? "V" : patientInitial}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: "#7A96B0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {line.speaker === "AI" ? "Vardana AI" : patientLabel}
                    </div>
                    <div style={{ fontSize: 13, color: "#1E3A5F", lineHeight: 1.6, background: line.speaker === "AI" ? "#EEF6F3" : "#EEF1F5", padding: "9px 13px", borderRadius: 10, border: speaking && line.speaker === "AI" ? "1px solid #3DBFA0" : line.speaker === "AI" ? "0.5px solid #C2E8DE" : "0.5px solid #D1D9E0", transition: "all 0.35s" }}>
                      {line.text}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Thinking dots for live mode */}
            {isThinking && demoMode === "live" && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "slideUp 0.25s ease" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, background: "#3DBFA0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "white", marginTop: 3, border: "1px solid #3DBFA0" }}>V</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "#7A96B0", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Vardana AI</div>
                  <div style={{ fontSize: 13, color: "#7A96B0", padding: "9px 13px", borderRadius: 10, background: "#EEF6F3", border: "0.5px solid #C2E8DE" }}>
                    <span style={{ animation: "pulse 1s infinite" }}>Thinking</span>
                    <span style={{ animation: "pulse 1s infinite 0.2s" }}>.</span>
                    <span style={{ animation: "pulse 1s infinite 0.4s" }}>.</span>
                    <span style={{ animation: "pulse 1s infinite 0.6s" }}>.</span>
                  </div>
                </div>
              </div>
            )}
            {/* Listening indicator for live mode */}
            {isListening && demoMode === "live" && (
              <div style={{ textAlign: "center", padding: "8px 0", animation: "fadeIn 0.3s ease" }}>
                <span style={{ fontSize: 12, color: "#1E3A5F", fontWeight: 700 }}>● Listening...</span>
                {interimText && (
                  <div style={{ fontSize: 12, color: "#7A96B0", fontStyle: "italic", marginTop: 4, padding: "0 16px" }}>
                    "{interimText}"
                  </div>
                )}
              </div>
            )}
            {uiState === "done" && (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#3DBFA0", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name="check" size={14} color="#3DBFA0" /> Call completed · {formatTime(elapsed)}</div>
                <div style={{ fontSize: 12, color: "#7A96B0", marginTop: 5 }}>Transcript saved · Clinical summary generated · Alert dispatched</div>
              </div>
            )}
          </div>
          {/* Text input fallback for live mode */}
          {demoMode === "live" && isActive && (
            <div style={{ padding: "8px 16px", borderTop: "1px solid #E8EDF3", display: "flex", gap: 8 }}>
              <input
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitTextInput()}
                placeholder={isListening ? "Or type your response..." : "Type your response..."}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 8, background: "#EEF1F5", border: "1px solid #D1D9E0", color: "#1E3A5F", fontSize: 12, fontFamily: c.font, outline: "none" }}
              />
              <button onClick={submitTextInput} disabled={!textInput.trim()}
                style={{ padding: "8px 14px", borderRadius: 8, background: textInput.trim() ? "#3DBFA0" : "#EEF1F5", border: textInput.trim() ? "none" : "1px solid #D1D9E0", color: textInput.trim() ? "white" : "#7A96B0", fontSize: 12, fontWeight: 700, cursor: textInput.trim() ? "pointer" : "default", fontFamily: c.font }}>
                Send
              </button>
            </div>
          )}
        </div>


        {/* ── Right: Patient Chart + FHIR + assessment ── (hidden on mobile) */}
        {!isMobileView && (
        (() => {
          const chartData = ACTIVE_CLINICAL[patient?.id];
          const statusColor = (s) => s === "good" ? "#34D399" : s === "borderline" ? "#F59E0B" : "#F87171";
          const sectionHead = { fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 };
          return (
        <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid #E8EDF3", background: "#FFFFFF" }}>
          <div ref={rightPanelRef} style={{ flex: 1, overflowY: "auto" }}>

            {/* Patient Chart */}
            {chartData && (
              <div style={{ padding: "12px 14px", borderBottom: "1px solid #E8EDF3" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10, display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ fontSize: 13 }}>&#128203;</span> Patient Chart
                </div>

                {/* DOB & Allergy */}
                <div style={{ marginBottom: 10 }}>
                  {chartData.dob && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, marginBottom: 4 }}>
                      <span style={{ color: "#7A96B0" }}>DOB</span>
                      <span style={{ color: "#4A6380", fontWeight: 600 }}>{chartData.dob}</span>
                    </div>
                  )}
                  {chartData.allergy && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                      <span style={{ color: "#7A96B0" }}>Allergy</span>
                      <span style={{ color: chartData.allergy === "None known" ? "#34D399" : "#F59E0B", fontWeight: 600, fontSize: 10 }}>{chartData.allergy}</span>
                    </div>
                  )}
                </div>

                {/* Conditions */}
                <div style={{ marginBottom: 10 }}>
                  <div style={sectionHead}>Conditions</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {chartData.conditions.map((cond, i) => (
                      <span key={i} style={{ fontSize: 9, fontWeight: 600, color: "#4A6380", background: "#EEF1F5", border: "1px solid #E8EDF3", borderRadius: 4, padding: "2px 6px" }}>{cond}</span>
                    ))}
                  </div>
                </div>

                {/* Medications */}
                <div style={{ marginBottom: 10 }}>
                  <div style={sectionHead}>Medications</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {chartData.medications.map((med, i) => (
                      <div key={i} style={{ fontSize: 10, display: "flex", justifyContent: "space-between", gap: 4 }}>
                        <span style={{ color: "#1E3A5F", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{med.name}</span>
                        <span style={{ color: "#7A96B0", fontWeight: 600, flexShrink: 0 }}>{med.dose}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Vitals — 2x2 grid */}
                <div style={{ marginBottom: 10 }}>
                  <div style={sectionHead}>Current Vitals</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    {/* Weight (if available) or Glucose as first cell */}
                    {chartData.vitals.weight ? (
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>Weight</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.weight.status) }}>
                        {chartData.vitals.weight.current}
                        <span style={{ fontSize: 8, fontWeight: 600, marginLeft: 2 }}>{chartData.vitals.weight.unit}</span>
                      </div>
                      {chartData.vitals.weight.trend !== "stable" && (
                        <div style={{ fontSize: 8, color: statusColor(chartData.vitals.weight.status), marginTop: 1 }}>
                          {chartData.vitals.weight.trend === "worsening" ? "↑" : chartData.vitals.weight.trend === "improving" ? "↓" : "→"} {chartData.vitals.weight.trend}
                        </div>
                      )}
                    </div>
                    ) : chartData.vitals.glucose ? (
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>Glucose</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.glucose.status) }}>
                        {chartData.vitals.glucose.value}
                        <span style={{ fontSize: 8, fontWeight: 600, marginLeft: 2 }}>{chartData.vitals.glucose.unit}</span>
                      </div>
                      <div style={{ fontSize: 8, color: "#7A96B0", marginTop: 1 }}>{chartData.vitals.glucose.note}</div>
                    </div>
                    ) : null}
                    {/* BP */}
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>Blood Pressure</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.bp.status) }}>
                        {chartData.vitals.bp.sys}/{chartData.vitals.bp.dia}
                      </div>
                      <div style={{ fontSize: 8, color: "#7A96B0", marginTop: 1 }}>{chartData.vitals.bp.note}</div>
                    </div>
                    {/* HR */}
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>Heart Rate</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.hr.status) }}>
                        {chartData.vitals.hr.value}
                        <span style={{ fontSize: 8, fontWeight: 600, marginLeft: 2 }}>bpm</span>
                      </div>
                    </div>
                    {/* 4th cell: SpO2 (if weight was in 1st cell and glucose in this slot), or SpO2 fallback */}
                    {chartData.vitals.weight && chartData.vitals.glucose ? (
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>Glucose</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.glucose.status) }}>
                        {chartData.vitals.glucose.value}
                        <span style={{ fontSize: 8, fontWeight: 600, marginLeft: 2 }}>{chartData.vitals.glucose.unit}</span>
                      </div>
                    </div>
                    ) : chartData.vitals.spo2 ? (
                    <div style={{ background: "#F6F7F9", borderRadius: 6, padding: "6px 8px" }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", marginBottom: 2 }}>SpO2</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: statusColor(chartData.vitals.spo2.status) }}>
                        {chartData.vitals.spo2.value}
                        <span style={{ fontSize: 8, fontWeight: 600, marginLeft: 2 }}>%</span>
                      </div>
                    </div>
                    ) : null}
                  </div>
                </div>

                {/* Labs */}
                {chartData.labs && (
                  <div>
                    <div style={sectionHead}>Recent Labs</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {chartData.labs.map((lab, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 10, gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(lab.status), flexShrink: 0 }} />
                          <span style={{ color: "#4A6380", fontWeight: 600, minWidth: 55 }}>{lab.name}</span>
                          <span style={{ color: "#1E3A5F", fontWeight: 500, flex: 1 }}>{lab.value}</span>
                          <span style={{ color: "#7A96B0", fontSize: 9 }}>{lab.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Assessments (Marcus) */}
                {chartData.riskAssessments && (
                  <div style={{ marginTop: 10 }}>
                    <div style={sectionHead}>Risk Assessment</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {chartData.riskAssessments.map((ra, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", fontSize: 10, gap: 6 }}>
                          <span style={{ color: "#4A6380", fontWeight: 600, minWidth: 90 }}>{ra.label}</span>
                          <span style={{ color: "#1E3A5F", fontWeight: 700 }}>{ra.value}</span>
                          <span style={{ color: "#7A96B0", fontSize: 9, marginLeft: "auto" }}>{ra.note}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FHIR Activity — newest first */}
            <div ref={fhirSectionRef} style={{ padding: "13px 16px 4px", borderBottom: "none" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em" }}>FHIR Activity</div>
            </div>
            <div style={{ padding: "6px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
              {fhirLog.length === 0 ? (
                <div style={{ fontSize: 12, color: "#7A96B0", textAlign: "center", marginTop: 12, marginBottom: 12, lineHeight: 1.6 }}>Waiting for AI to<br />begin querying...</div>
              ) : [...fhirLog].reverse().map((q, i) => {
                const methodColor = q.method === "POST" ? "#D97706" : q.color === c.red ? c.red : "#059669";
                const methodBg = q.method === "POST" ? "#FFFBEB" : q.color === c.red ? "#FEF2F2" : "#ECFDF5";
                return (
                <div key={fhirLog.length - 1 - i} style={{ background: "#F6F7F9", borderRadius: 7, padding: "7px 9px", border: `1px solid ${q.color === c.red ? "#FEE2E2" : "#E8EDF3"}`, animation: i === 0 ? "slideUp 0.25s ease, fhirPulse 0.6s ease" : "slideUp 0.25s ease" }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center", marginBottom: 3 }}>
                    <span style={{ fontSize: 8, fontWeight: 800, background: methodBg, color: methodColor, padding: "1px 4px", borderRadius: 3 }}>{q.method}</span>
                    <span style={{ fontSize: 8, color: "#4A6380", fontFamily: DS.fontMono, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{q.path.length > 34 ? q.path.slice(0, 34) + "…" : q.path}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#7A96B0" }}>→ {q.result}</div>
                </div>
                );
              })}
            </div>

            {/* AI Assessment */}
            {(demoMode === "live" ? Object.keys(aiAssessment).length > 0 : transcript.length >= (isMarcusDemo ? 3 : 6)) && (
              <div style={{ padding: "12px 14px", borderTop: "1px solid #E8EDF3" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#7A96B0", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>AI Assessment</div>
                {(demoMode === "live" ? (isEpic
                  ? Object.entries(aiAssessment).map(([key, value]) => ({
                      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
                      value: value || "Pending",
                      flag: value && value !== "Pending" && value !== "Normal" && value !== "None"
                    }))
                  : isMarcusDemo ? [
                  { label: "BP 158/98", value: "4-day rise", flag: true },
                  { label: "Glucose", value: "186 mg/dL", flag: false, orange: true },
                  { label: "Lisinopril", value: aiAssessment.lisinopril || "Checking", flag: aiAssessment.lisinopril === "Missed, few days" },
                  { label: "Headache", value: aiAssessment.headache || "Pending", flag: aiAssessment.headache === "Confirmed" },
                ] : [
                  { label: "Weight gain", value: aiAssessment.weightGain || "Pending", flag: aiAssessment.weightGain && aiAssessment.weightGain !== "Pending" },
                  { label: "Orthopnea",   value: aiAssessment.orthopnea || "Pending", flag: aiAssessment.orthopnea === "Confirmed" },
                  { label: "Ankle edema", value: aiAssessment.ankleEdema || "Pending", flag: aiAssessment.ankleEdema === "Confirmed" },
                  { label: "Adherence",   value: aiAssessment.adherence || "Pending", flag: false },
                ]) : isMarcusDemo ? [
                  { label: "BP 158/98", value: "4-day rise", flag: true },
                  { label: "Glucose", value: "186 mg/dL", flag: false, orange: true },
                  { label: "Lisinopril", value: transcript.length >= 5 ? "Missed, few days" : "Checking", flag: transcript.length >= 5 },
                  { label: "Headache", value: transcript.length >= 3 ? "Confirmed" : "Pending", flag: transcript.length >= 3 },
                ] : [
                  { label: "Weight gain", value: "+2.3 lbs/48hr", flag: true },
                  { label: "Orthopnea",   value: transcript.length >= 9 ? "Confirmed" : "Pending", flag: transcript.length >= 9 },
                  { label: "Ankle edema", value: "Confirmed", flag: true },
                  { label: "Adherence",   value: "Meds taken", flag: false },
                ]).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: "#4A6380" }}>{item.label}</span>
                    <span style={{ fontWeight: 700, color: item.flag ? "#C0392B" : (item.orange ? "#D97706" : (item.value === "Pending" ? "#7A96B0" : "#059669")) }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
          );
        })()
        )}
      </div>

      <style>{`
        @keyframes pointerBounce { from { transform: translateY(-50%) translateX(0px); } to { transform: translateY(-50%) translateX(-6px); } }
        @keyframes ping    { 0%   { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes fadeIn  { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.25; } }
        @keyframes fhirPulse { 0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); } 50% { box-shadow: 0 0 0 6px rgba(37,99,235,0.15); } 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); } }
      `}</style>
    </div>
  );
}

// ── SMS Path Demo ──
function SMSPathDemo({ patient, onComplete }) {
  const [smsStep, setSmsStep] = useState(0);
  // 0: SMS sent view, 1: patient phone, 2: app download, 3: health connect, 4: synced

  const steps = [
    { id: 0, label: "SMS Sent" },
    { id: 1, label: "Patient Receives" },
    { id: 2, label: "App Download" },
    { id: 3, label: "Health Connect" },
    { id: 4, label: "First Sync" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: c.bg, zIndex: 300, display: "flex", flexDirection: "column", fontFamily: c.font }}>

      {/* Header */}
      <div style={{ background: DS.color.slate[950], padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontSize: 14, fontWeight: 800, color: "white" }}>SMS Outreach Path</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 12 }}>Sarah Chen → App Onboarding</span>
        </div>
        <button onClick={onComplete} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontFamily: c.font, fontSize: 13, fontWeight: 600 }}>✕ Close</button>
      </div>

      {/* Step progress */}
      <div style={{ background: "white", borderBottom: `1px solid ${c.border}`, padding: "12px 24px", display: "flex", gap: 0 }}>
        {steps.map((step, i) => (
          <div key={step.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setSmsStep(step.id)}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, background: smsStep >= step.id ? c.accent : c.border, color: smsStep >= step.id ? "white" : c.textLight, flexShrink: 0, transition: "all 0.3s" }}>
                {smsStep > step.id ? <Icon name="check" size={12} color="white" /> : step.id + 1}
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: smsStep >= step.id ? c.accent : c.textLight, whiteSpace: "nowrap" }}>{step.label}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: smsStep > step.id ? c.accent : c.border, margin: "0 8px", transition: "background 0.3s" }} />}
          </div>
        ))}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 32, gap: 40 }}>

        {/* Left: coordinator action */}
        {smsStep === 0 && (
          <div style={{ maxWidth: 440, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden" }}>
              <div style={{ background: DS.color.jade[600], padding: "18px 22px" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white", display: "flex", alignItems: "center", gap: 8 }}><Icon name="sms" size={18} color="white" /> SMS Outreach Initiated</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{`Sent via Twilio · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}</div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", marginBottom: 10 }}>Message Sent To</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: c.accentLight, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="users" size={18} color={c.accent} /></div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Sarah Chen</div>
                    <div style={{ fontSize: 13, color: c.textLight }}>(206) 555-0142</div>
                  </div>
                </div>
                <div style={{ background: c.borderLight, borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, marginBottom: 8 }}>MESSAGE CONTENT</div>
                  <div style={{ fontSize: 14, color: c.text, lineHeight: 1.6 }}>
                    Hi Sarah — this is your Vardana care team. We'd like to check in with you today. Tap here to start: <span style={{ color: c.accent, fontWeight: 700 }}>vardana.ai/checkin/sc</span>
                    <br /><br />
                    For the best experience with your health data, <span style={{ color: c.accent, fontWeight: 700 }}>download the Vardana app ↗</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ label: "Delivered", color: c.green }, { label: "Read in 3 min", color: c.accent }, { label: "Link tapped", color: c.teal }].map((s, i) => (
                    <div key={i} style={{ flex: 1, background: s.color + "10", border: `1px solid ${s.color}25`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, margin: "0 auto 4px" }} />
                      <div style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={() => setSmsStep(1)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, marginTop: 16 }}>Next: Patient View →</button>
          </div>
        )}

        {smsStep === 1 && (
          <div style={{ display: "flex", gap: 40, alignItems: "flex-start", maxWidth: 700, width: "100%" }}>
            {/* Phone mockup */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ width: 280, background: "#1A1A1A", borderRadius: 48, padding: "16px 12px", boxShadow: "0 24px 64px rgba(0,0,0,0.3)", border: "2px solid #333" }}>
                {/* Notch */}
                <div style={{ width: 100, height: 24, background: "#1A1A1A", borderRadius: 12, margin: "0 auto 12px", border: "2px solid #2A2A2A" }} />
                {/* Screen */}
                <div style={{ background: "#F2F2F7", borderRadius: 32, overflow: "hidden", minHeight: 480 }}>
                  {/* Status bar */}
                  <div style={{ background: "white", padding: "8px 16px", display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: c.text }}>
                    <span>9:41</span><span>●●● 5G ■■■</span>
                  </div>
                  {/* Messages header */}
                  <div style={{ background: "white", padding: "8px 16px 12px", borderBottom: "1px solid #E5E5EA", textAlign: "center" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Vardana Health</div>
                    <div style={{ fontSize: 11, color: c.textLight }}>(888) 555-0100</div>
                  </div>
                  {/* Messages */}
                  <div style={{ padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {/* Incoming SMS */}
                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                      <div style={{ maxWidth: "80%", background: "#E9E9EB", borderRadius: "18px 18px 18px 4px", padding: "10px 13px", fontSize: 13, color: c.text, lineHeight: 1.5 }}>
                        Hi Sarah — this is your Vardana care team. We'd like to check in with you today.<br /><br />
                        <span style={{ color: "#007AFF", fontWeight: 600 }}>vardana.ai/checkin/sc</span><br /><br />
                        For the best experience, <span style={{ color: "#007AFF", fontWeight: 600 }}>download the app ↗</span>
                        <div style={{ fontSize: 10, color: "#8E8E93", marginTop: 4 }}>8:24 AM</div>
                      </div>
                    </div>
                    {/* Patient reply */}
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <div style={{ maxWidth: "80%", background: "#007AFF", borderRadius: "18px 18px 4px 18px", padding: "10px 13px", fontSize: 13, color: "white", lineHeight: 1.5 }}>
                        Hi! I'll download the app.
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>8:27 AM</div>
                      </div>
                    </div>
                    {/* App store prompt */}
                    <div style={{ background: "white", borderRadius: 12, padding: "10px 12px", border: "1px solid #E5E5EA", margin: "4px 0" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${c.navy}, ${c.accent})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>V</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>Vardana Health</div>
                          <div style={{ fontSize: 10, color: c.textLight }}>Care Management</div>
                        </div>
                        <div style={{ background: "#007AFF", color: "white", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 12 }}>GET</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ width: 120, height: 4, background: "#333", borderRadius: 2, margin: "12px auto 4px" }} />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ background: c.card, borderRadius: 12, padding: "18px 20px", border: `1px solid ${c.border}`, marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 8 }}>Why the app link matters</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { iconName: "arrow", text: "SMS check-in works — but limited to self-reported data only" },
                    { iconName: "smartphone", text: "App unlocks Apple Health / Google Fit integration — passive vitals, steps, sleep" },
                    { iconName: "scale", text: "Smart scale Bluetooth sync: weight logged automatically without daily action" },
                    { iconName: "bar_chart", text: "Richer data = better decompensation detection = fewer missed events" },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: c.textMed, lineHeight: 1.4, alignItems: "flex-start" }}>
                      <Icon name={item.iconName} size={15} color={c.accent} />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSmsStep(2)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Next: App Download →</button>
            </div>
          </div>
        )}

        {smsStep === 2 && (
          <div style={{ maxWidth: 460, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden" }}>
              {/* App store header */}
              <div style={{ background: "linear-gradient(135deg, #0F1A2A, #1B3A6B)", padding: "24px", textAlign: "center" }}>
                <div style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg, #2563EB, #38BDF8)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>V</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "white" }}>Vardana Health</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>AI Care Concierge · Post-Discharge Recovery</div>
                <div style={{ display: "flex", justifyContent: "center", gap: 4, marginTop: 10 }}>
                  {"★★★★☆".split("").map((s, i) => <span key={i} style={{ color: "#FBBF24", fontSize: 18 }}>{s}</span>)}
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginLeft: 4, lineHeight: 2 }}>4.8 · 2.1K ratings</span>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                  {["HIPAA Secure", "Works with Apple Health", "No setup required"].map((tag, i) => (
                    <div key={i} style={{ flex: 1, background: c.borderLight, borderRadius: 8, padding: "8px 6px", textAlign: "center", fontSize: 11, fontWeight: 600, color: c.textMed }}>{tag}</div>
                  ))}
                </div>
                <div style={{ background: "#000", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer" }}>
                  <span style={{ fontSize: 24, color: "white" }}>⌘</span>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Download on the</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>App Store</div>
                  </div>
                </div>
                <div style={{ background: "#1a73e8", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", marginTop: 10 }}>
                  <span style={{ fontSize: 24 }}>▶</span>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>Get it on</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white" }}>Google Play</div>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => setSmsStep(3)} style={{ width: "100%", padding: "12px", borderRadius: 10, background: c.accent, color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, marginTop: 16 }}>Next: Health Data Connection →</button>
          </div>
        )}

        {smsStep === 3 && (
          <div style={{ maxWidth: 480, width: "100%" }}>
            {/* Phone mockup with Health Connect screen */}
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: "linear-gradient(135deg, #FF2D55, #FF9500)", padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
                <Icon name="heart" size={28} color="white" strokeWidth={2} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Apple Health</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Requesting access to your health data</div>
                </div>
              </div>
              <div style={{ padding: "20px 22px" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 4 }}>Vardana Health would like to read:</div>
                <div style={{ fontSize: 13, color: c.textMed, marginBottom: 16 }}>Your care team uses this data for daily health monitoring.</div>
                {[
                  { iconName: "scale", name: "Body Weight", source: "Withings scale · daily", active: true },
                  { iconName: "heart", name: "Heart Rate", source: "Apple Watch · continuous", active: true },
                  { iconName: "stethoscope", name: "Blood Pressure", source: "Omron BP monitor", active: true },
                  { iconName: "activity", name: "Steps", source: "iPhone · automatic", active: true },
                  { iconName: "sun", name: "Sleep Analysis", source: "Apple Watch", active: false },
                  { iconName: "droplet", name: "Blood Oxygen (SpO2)", source: "Apple Watch", active: true },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 5 ? `1px solid ${c.borderLight}` : "none" }}>
                    <div style={{ width: 24, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={item.iconName} size={18} color={c.textMed} /></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: c.textLight }}>{item.source}</div>
                    </div>
                    <div style={{ width: 44, height: 26, borderRadius: 13, background: item.active ? "#34C759" : "#E5E5EA", display: "flex", alignItems: "center", padding: "0 3px", justifyContent: item.active ? "flex-end" : "flex-start" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                    </div>
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button style={{ flex: 1, padding: "12px", borderRadius: 10, background: "#E5E5EA", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", color: c.text, fontFamily: c.font }}>Deny All</button>
                  <button onClick={() => setSmsStep(4)} style={{ flex: 2, padding: "12px", borderRadius: 10, background: "#007AFF", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", color: "white", fontFamily: c.font }}>Allow Access</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {smsStep === 4 && (
          <div style={{ maxWidth: 520, width: "100%" }}>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, boxShadow: c.shadowLg, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ background: DS.color.jade[600], padding: "20px 24px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={22} color="white" strokeWidth={2.5} /></div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Health Data Connected</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{`First sync complete · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}</div>
                </div>
              </div>
              <div style={{ padding: "20px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Synced to Sarah's Profile</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                  {[
                    { iconName: "scale", label: "Weight (14 days)", value: "187.7 lbs", subtext: "+2.3 lbs trend flagged", color: c.red },
                    { iconName: "heart", label: "Resting Heart Rate", value: "82 bpm", subtext: "Avg over 7 days", color: c.orange },
                    { iconName: "activity", label: "Daily Steps", value: "1,840", subtext: "↓ 67% vs last week", color: c.orange },
                    { iconName: "droplet", label: "SpO2", value: "95%", subtext: "Last reading: 7:12 AM", color: c.orange },
                  ].map((item, i) => (
                    <div key={i} style={{ background: c.borderLight, borderRadius: 10, padding: "12px 14px" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
                        <Icon name={item.iconName} size={14} color={item.color} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: c.textLight }}>{item.label}</span>
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: 11, color: c.textLight, marginTop: 2 }}>{item.subtext}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: c.accentLight, border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.accent, marginBottom: 6 }}>Impact on coordinator view</div>
                  <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>
                    Sarah's passive wearable data now supplements FHIR vitals. The AI concierge automatically incorporates step decline, SpO2 trend, and resting HR elevation into the decompensation risk score — no manual data entry required.
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onComplete} style={{ width: "100%", padding: "12px", borderRadius: 10, background: DS.color.slate[950], color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Return to Coordinator Dashboard</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── AI Reasoning Card ──
function AIReasoningCard({ onOutreach, onBack, isScriptedDemo = false, isMarcus = false }) {
  const [expanded, setExpanded] = useState(false);
  const [showEHR, setShowEHR] = useState(false);
  const isMobile = useIsMobile();

  const alertLabel = isMarcus ? "BP Crisis Risk · Action Required" : "Decompensation Risk · Action Required";
  const alertTitle = isMarcus ? "4-day BP worsening trend detected" : "Early decompensation pattern detected";
  const riskScore = isMarcus ? 53 : 72;
  const summary = isMarcus
    ? <>Marcus's blood pressure has worsened from <span style={{ fontFamily: DS.fontMono }}>129/80</span> to <span style={{ fontFamily: DS.fontMono }}>158/98</span> over 4 days. Fasting glucose elevated at <span style={{ fontFamily: DS.fontMono }}>186 mg/dL</span>. Patient reported headache this morning. Lisinopril non-adherence suspected — patient ran out of medication several days ago.</>
    : <>Sarah's weight increased <strong style={{ color: c.text, fontFamily: DS.fontMono }}>2.3 lbs</strong> over 48 hours (<span style={{ fontFamily: DS.fontMono }}>185.4 → 187.7</span> lbs), coinciding with the end of the Stabilize phase (Day 14). Blood pressure has reversed from a best of <span style={{ fontFamily: DS.fontMono }}>126/78</span> to <span style={{ fontFamily: DS.fontMono }}>136/86</span>. Patient self-reported increased fatigue yesterday and ankle edema this morning via the AI concierge.</>;
  const evidence = isMarcus ? [
    { iconName: "stethoscope", label: "Blood Pressure", value: "158/98 mmHg", status: "critical", detail: "4-day worsening from 129/80" },
    { iconName: "trend_up", label: "Glucose", value: "186 mg/dL", status: "warning", detail: "Fasting, elevated above target" },
    { iconName: "chat", label: "Patient Report", value: "Headache", status: "warning", detail: "Onset this morning, persistent" },
    { iconName: "pill", label: "Adherence", value: "Lisinopril missed", status: "critical", detail: "Ran out, pharmacy not called" },
  ] : [
    { iconName: "scale", label: "Weight", value: "+2.3 lbs / 48hr", status: "critical", detail: "Exceeded 2 lb/48hr threshold" },
    { iconName: "stethoscope", label: "Blood Pressure", value: "136/86 mmHg", status: "warning", detail: "Reversed from 126/78 best" },
    { iconName: "chat", label: "Patient Report", value: "Fatigue + edema", status: "critical", detail: "Ankle swelling confirmed today" },
    { iconName: "trend_up", label: "Trajectory", value: "3-day reversal", status: "warning", detail: "Trend inflection after 12-day decline" },
  ];
  const contextNote = isMarcus
    ? <>Patient is at <span style={{ fontFamily: DS.fontDisplay }}>Day 22</span> — in <strong style={{ color: c.text }}>Stabilize → Optimize</strong> phase. BP crisis in HTN + T2DM patients with medication non-adherence requires <strong style={{ color: c.text }}>urgent coordinator follow-up</strong> to prevent end-organ damage.</>
    : <>Patient is at <span style={{ fontFamily: DS.fontDisplay }}>Day 15</span> — transitioning from <strong style={{ color: c.text }}>Stabilize → Optimize</strong> phase. Weight reversal at phase transition is a recognized pattern in CHF post-discharge populations, often associated with <strong style={{ color: c.text }}>suboptimal diuretic titration</strong> during care transitions.</>;
  const actions = isMarcus ? [
    { priority: "1", action: "Contact patient within 4 hours", detail: "Assess headache severity, confirm missed Lisinopril doses. Patient expects outreach — AI concierge informed him this morning.", tag: "Coordinator" },
    { priority: "2", action: "Arrange Lisinopril refill and discuss timing", detail: "20mg daily — consider PM dosing if morning adherence is poor. Verify pharmacy on file.", tag: "Clinical" },
    { priority: "3", action: "Increase BP monitoring to twice daily for 7 days", detail: "If BP does not return below 140/90 within 72 hours, escalate to PCP for medication adjustment.", tag: "Follow-up" },
  ] : [
    { priority: "1", action: "Contact patient within 4 hours", detail: "Assess edema severity, dyspnea at rest, medication adherence. Patient expects outreach — AI concierge informed her this morning.", tag: "Coordinator" },
    { priority: "2", action: "Discuss Furosemide dose increase with cardiology", detail: "40mg → 60mg. CKD Stage 3a (eGFR 48) — monitor creatinine if dose changed.", tag: "Clinical" },
    { priority: "3", action: "Schedule weight check follow-up at 48 hours", detail: "If weight does not decrease by ≥1 lb post-adjustment, escalate to cardiology appointment.", tag: "Follow-up" },
  ];
  const patientName = isMarcus ? "Marcus" : "Sarah";
  const checkinHistory = isMarcus ? [
    { time: "Yesterday 7:30 AM", who: "AI → Patient", text: "Routine check-in. BP 154/96, trending up. Patient confirmed taking Amlodipine but ran out of Lisinopril." },
    { time: "Today 7:30 AM", who: "AI → Patient", text: "BP 158/98, 4-day worsening trend. Patient reported headache. Missed Lisinopril for several days. AI escalated to care coordinator David Park." },
  ] : [
    { time: "Yesterday 8:00 AM", who: "AI → Patient", text: "Asked about weight increase (+1.1 lbs). Patient reported feeling 'a little more tired than usual.' AI advised low-sodium diet, confirmed Furosemide adherence." },
    { time: "Today 7:45 AM", who: "AI → Patient", text: "Flagged 2.3 lb/48hr weight gain. Patient confirmed ankle swelling. AI informed patient that care coordinator would reach out. Advised continued medication adherence and sodium restriction." },
  ];

  return (
    <div style={{ background: c.card, borderRadius: DS.radius.lg, boxShadow: DS.shadow.alert, borderLeft: `4px solid ${DS.color.crimson[600]}`, overflow: "hidden" }}>
      {/* Hero header — flat white with crimson accent */}
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${DS.color.border.subtle}` }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: DS.radius.md, background: DS.color.crimson[50], border: `1.5px solid ${DS.color.crimson[100]}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="alert" size={22} color={DS.color.crimson[600]} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: DS.color.crimson[600], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{alertLabel}</div>
              <div style={{ fontSize: 18, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay, lineHeight: 1.3 }}>{alertTitle}</div>
              <div style={{ fontSize: 13, color: c.textLight, marginTop: 4 }}>Generated {isMarcus ? "12" : "38"} min ago · Confidence: High</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 400, color: DS.color.crimson[600], fontFamily: DS.fontDisplay, lineHeight: 1 }}>{riskScore}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: DS.color.crimson[600] }}>/ 100</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: DS.radius.sm, background: DS.color.crimson[50], color: DS.color.crimson[600], border: `1px solid ${DS.color.crimson[100]}` }}>P2 — Urgent</span>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${DS.color.border.subtle}` }}>
        <div style={{ fontSize: 14, color: c.textMed, lineHeight: 1.65 }}>
          {summary}
        </div>
      </div>

      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${DS.color.border.subtle}`, background: DS.color.crimson[50] }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.color.slate[500], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Evidence Chain</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          {evidence.map((s, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: DS.radius.md, background: DS.color.canvas.white, border: `1px solid ${DS.color.border.subtle}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <Icon name={s.iconName} size={14} color={s.status === "critical" ? DS.color.crimson[600] : DS.color.amber[500]} />
                <span style={{ fontSize: 12, fontWeight: 700, color: DS.color.slate[500] }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 400, fontFamily: DS.fontDisplay, color: s.status === "critical" ? DS.color.crimson[600] : DS.color.amber[600] }}>{s.value}</div>
              <div style={{ fontSize: 11, color: DS.color.slate[400], marginTop: 2 }}>{s.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "14px 24px", borderBottom: `1px solid ${DS.color.border.subtle}`, background: DS.color.slate[50] }}>
        <div style={{ fontSize: 13, color: DS.color.slate[500], lineHeight: 1.6 }}>
          {contextNote}
        </div>
      </div>

      <div style={{ padding: "16px 24px", borderBottom: `1px solid ${DS.color.border.subtle}` }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: DS.color.slate[500], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Recommended Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "12px 14px", background: c.card, borderRadius: 10, border: `1px solid ${c.border}` }}>
              <div style={{ width: 28, height: 28, borderRadius: DS.radius.sm, flexShrink: 0, background: DS.color.slate[900], color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, fontFamily: DS.fontDisplay }}>{r.priority}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{r.action}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.purpleLight, color: c.purple }}>{r.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: c.textMed, marginTop: 4, lineHeight: 1.5 }}>{r.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isScriptedDemo && (
        <>
        <button onClick={() => setExpanded(!expanded)} style={{ width: "100%", padding: "14px 20px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: expanded ? `1px solid ${c.border}` : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="chat" size={14} color={c.textMed} />
            <span style={{ fontSize: 13, fontWeight: 700, color: c.textMed }}>What {patientName} told Vardana today →</span>
          </div>
          <span style={{ fontSize: 14, color: c.textLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>⌄</span>
        </button>

        {expanded && (
          <div style={{ padding: "12px 20px 16px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {checkinHistory.map((ex, i) => (
                <div key={i} style={{ padding: "10px 14px", background: c.borderLight, borderRadius: 8, borderLeft: `3px solid ${c.accent}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: c.accent }}>{ex.who}</span>
                    <span style={{ fontSize: 11, color: c.textLight }}>{ex.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>{ex.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action button */}
        <div style={{ padding: "16px 24px", background: DS.color.slate[50] }}>
          <button onClick={onOutreach} style={{ width: "100%", padding: "13px 16px", borderRadius: DS.radius.md, background: DS.color.slate[950], color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: DS.transition.fast }}>
            <Icon name="phone" size={14} color="white" /> Contact Patient
          </button>
        </div>
        </>
      )}

      {/* Mock EHR / FHIR Resource Panel */}
      {showEHR && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,26,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }} onClick={() => setShowEHR(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: c.card, borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.2)", fontFamily: c.font }}>
            <div style={{ background: DS.color.slate[950], padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Epic EHR — Patient Record</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Sarah Chen · MRN: SCH-2024-0847</div>
              </div>
              <button onClick={() => setShowEHR(false)} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {/* FHIR Resource: Patient */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: c.accent, color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>FHIR</span> Patient Resource
                </div>
                <div style={{ background: DS.color.slate[50], borderRadius: 10, padding: 16, fontFamily: DS.fontMono, fontSize: 12, lineHeight: 1.8, color: c.textMed, border: `1px solid ${c.border}`, whiteSpace: "pre-wrap" }}>{`{
  "resourceType": "Patient",
  "id": "sch-2024-0847",
  "name": [{ "family": "Chen", "given": ["Sarah"] }],
  "gender": "female",
  "birthDate": "1958-07-14",
  "identifier": [{ "system": "urn:oid:2.16.840.1.113883.4.1", "value": "MRN-SCH-2024-0847" }]
}`}</div>
              </div>

              {/* FHIR Resource: Condition */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: DS.color.crimson[600], color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>FHIR</span> Active Conditions
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[
                    { code: "I50.2", display: "HFpEF (EF 45%)", status: "active", onset: "2025-11-02" },
                    { code: "I10", display: "Hypertension", status: "active", onset: "2018-03-15" },
                    { code: "E11.9", display: "Type 2 Diabetes", status: "active", onset: "2020-06-22" },
                    { code: "N18.3", display: "CKD Stage 3a", status: "active", onset: "2023-01-10" },
                  ].map((cond, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: DS.color.slate[50], borderRadius: 8, border: `1px solid ${c.border}` }}>
                      <span style={{ fontFamily: DS.fontMono, fontSize: 11, fontWeight: 700, color: DS.color.crimson[600], background: DS.color.crimson[50], padding: "2px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{cond.code}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.text, flex: 1 }}>{cond.display}</span>
                      <span style={{ fontSize: 11, color: c.textLight }}>Since {cond.onset}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* FHIR Resource: Recent Observations */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: c.green, color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>FHIR</span> Recent Observations
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { name: "Weight", value: "187.7 lbs", date: "Today", flag: "H" },
                    { name: "Blood Pressure", value: "136/86 mmHg", date: "Today", flag: "H" },
                    { name: "BNP", value: "485 pg/mL", date: "Mar 6", flag: "H" },
                    { name: "Creatinine", value: "1.4 mg/dL", date: "Mar 6", flag: "H" },
                    { name: "eGFR", value: "48 mL/min", date: "Mar 6", flag: "L" },
                    { name: "Potassium", value: "4.5 mEq/L", date: "Mar 6", flag: "" },
                  ].map((obs, i) => (
                    <div key={i} style={{ padding: "10px 12px", background: DS.color.slate[50], borderRadius: 8, border: `1px solid ${c.border}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight }}>{obs.name}</div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: obs.flag ? (obs.flag === "H" ? DS.color.crimson[600] : c.orange) : c.text, fontFamily: DS.fontDisplay, marginTop: 2 }}>{obs.value} {obs.flag && <span style={{ fontSize: 10, fontWeight: 800, background: obs.flag === "H" ? DS.color.crimson[50] : "#FEF3C7", color: obs.flag === "H" ? DS.color.crimson[600] : c.orange, padding: "1px 4px", borderRadius: 3 }}>{obs.flag}</span>}</div>
                      <div style={{ fontSize: 10, color: c.textLight, marginTop: 2 }}>{obs.date}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FHIR Resource: MedicationRequest */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ background: c.purple, color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>FHIR</span> Active Medications
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {[
                    { name: "Carvedilol 12.5mg", sig: "PO BID", prescriber: "Dr. Harrington" },
                    { name: "Lisinopril 10mg", sig: "PO QD", prescriber: "Dr. Harrington" },
                    { name: "Furosemide 40mg", sig: "PO QD", prescriber: "Dr. Harrington" },
                    { name: "Metformin 1000mg", sig: "PO BID", prescriber: "Dr. Patel" },
                    { name: "Spironolactone 25mg", sig: "PO QD", prescriber: "Dr. Harrington" },
                  ].map((med, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 14px", background: DS.color.slate[50], borderRadius: 8, border: `1px solid ${c.border}` }}>
                      <Icon name="pill" size={14} color={c.purple} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: c.text, flex: 1 }}>{med.name}</span>
                      <span style={{ fontSize: 11, fontFamily: DS.fontMono, color: c.textMed }}>{med.sig}</span>
                      <span style={{ fontSize: 11, color: c.textLight }}>{med.prescriber}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ padding: "16px 24px", borderTop: `1px solid ${c.border}`, background: DS.color.slate[50], display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: c.textLight }}>Data source: FHIR R4 via Medplum · Last synced {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
              <button onClick={() => setShowEHR(false)} style={{ padding: "8px 20px", borderRadius: 8, background: DS.color.slate[950], color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Epic FHIR Live Integration ──
function EpicFHIRSection() {
  const [epicData, setEpicData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [fetchTime, setFetchTime] = useState(null);

  const fetchEpicData = async () => {
    if (epicData) { setExpanded(!expanded); return; }
    setLoading(true);
    setError(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/epic-fhir?patientId=erXuFYUfucBZaryVksYEcMg3&resource=all");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEpicData(data);
      setFetchTime(Date.now() - start);
      setExpanded(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: c.card, borderRadius: c.radius, border: `1.5px solid ${c.tealLight}`, boxShadow: c.shadowMd, overflow: "hidden" }}>
      <button onClick={fetchEpicData} style={{ width: "100%", padding: "14px 18px", border: "none", background: expanded ? "linear-gradient(135deg, #0D3B66 0%, #0F766E 100%)" : "linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.3s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: expanded ? "rgba(255,255,255,0.15)" : c.teal, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800 }}>EHR</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: expanded ? "white" : c.text }}>Epic EHR Integration</div>
            <div style={{ fontSize: 11, color: expanded ? "rgba(255,255,255,0.7)" : c.textLight }}>Live FHIR R4 · Backend Systems API</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {loading && <span style={{ fontSize: 12, color: c.teal, fontWeight: 600 }}>Connecting...</span>}
          {epicData && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: expanded ? "rgba(16,185,129,0.2)" : c.greenLight, color: expanded ? "#6EE7B7" : c.green, border: `1px solid ${expanded ? "rgba(16,185,129,0.3)" : "#A7F3D0"}` }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", animation: "pulse 2s infinite" }} />LIVE
          </span>}
          <span style={{ fontSize: 14, color: expanded ? "white" : c.textLight, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>⌄</span>
        </div>
      </button>

      {error && <div style={{ padding: "10px 18px", fontSize: 12, color: c.red, background: c.redBg }}>{error}</div>}

      {expanded && epicData && (
        <div style={{ padding: "16px 18px" }}>
          {fetchTime && <div style={{ fontSize: 11, color: c.textLight, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: c.green }} />
            Fetched from Epic sandbox in {fetchTime}ms · {epicData.conditions.length + epicData.medications.length + epicData.labs.length + epicData.diagnosticReports.length} resources
          </div>}

          {/* Patient Demographics */}
          <div style={{ padding: "12px 14px", background: c.borderLight, borderRadius: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Patient Demographics · FHIR R4</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {[
                { label: "Name", value: epicData.patient?.name },
                { label: "DOB", value: epicData.patient?.dob },
                { label: "Gender", value: epicData.patient?.gender },
                { label: "Location", value: epicData.patient?.address },
              ].map((f, i) => (
                <div key={i} style={{ fontSize: 12 }}>
                  <span style={{ color: c.textLight }}>{f.label}: </span>
                  <span style={{ fontWeight: 600, color: c.text }}>{f.value || "—"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conditions */}
          {epicData.conditions.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Conditions ({epicData.conditions.length})</div>
              {epicData.conditions.map((cond, i) => (
                <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < epicData.conditions.length - 1 ? `1px solid ${c.borderLight}` : "none", display: "flex", justifyContent: "space-between" }}>
                  <span>{cond.text}</span>
                  <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: cond.status === "active" ? c.redLight : c.greenLight, color: cond.status === "active" ? c.red : c.green, fontWeight: 600 }}>{cond.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* Medications */}
          {epicData.medications.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Medications ({epicData.medications.length})</div>
              {epicData.medications.map((med, i) => (
                <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < epicData.medications.length - 1 ? `1px solid ${c.borderLight}` : "none" }}>
                  <span style={{ fontWeight: 600, color: c.text }}>{med.name}</span>
                  {med.dosage && <div style={{ fontSize: 11, color: c.textLight, marginTop: 2 }}>{med.dosage}</div>}
                </div>
              ))}
            </div>
          )}

          {/* Labs */}
          {epicData.labs.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Lab Results ({epicData.labs.length})</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: c.font }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                    {["Test", "Value", "Date"].map((h, i) => (
                      <th key={i} style={{ padding: "6px 4px", textAlign: "left", fontSize: 10, fontWeight: 700, color: c.textLight, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {epicData.labs.map((lab, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                      <td style={{ padding: "6px 4px", fontWeight: 600, color: c.text }}>{lab.name}</td>
                      <td style={{ padding: "6px 4px", color: c.accent, fontWeight: 700 }}>{lab.value} {lab.unit}</td>
                      <td style={{ padding: "6px 4px", color: c.textLight }}>{lab.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Diagnostic Reports */}
          {epicData.diagnosticReports.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Diagnostic Reports ({epicData.diagnosticReports.length})</div>
              {epicData.diagnosticReports.map((dr, i) => (
                <div key={i} style={{ fontSize: 12, color: c.textMed, padding: "4px 0", borderBottom: i < epicData.diagnosticReports.length - 1 ? `1px solid ${c.borderLight}` : "none", display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 600, color: c.text }}>{dr.name}</span>
                  <span style={{ color: c.textLight }}>{dr.date}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, padding: "8px 12px", background: c.tealLight + "60", borderRadius: 8, fontSize: 11, color: c.teal, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="lock" size={12} color={c.teal} /> Authenticated via SMART on FHIR Backend Services · JWT + RS384 · FHIR R4
          </div>
        </div>
      )}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

// ── Supporting Data ──
function SupportingData() {
  const [openSection, setOpenSection] = useState("weight");
  const toggle = (id) => setOpenSection(openSection === id ? null : id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 8 }}>Supporting Data</div>
      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("weight")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text, display: "flex", alignItems: "center", gap: 6 }}><Icon name="scale" size={14} color={c.textMed} /> Weight Trend — 14 days</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.red, fontFamily: DS.fontDisplay }}>187.7 lbs (+2.3)</span>
            <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
          </div>
        </button>
        {openSection === "weight" && (
          <div style={{ padding: "0 12px 14px" }}>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={WEIGHT_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <defs>
                    <linearGradient id="wg3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c.accent} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={c.accent} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} interval={2} />
                  <YAxis domain={[184, 189]} tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} width={40} />
                  <ReferenceLine y={186} stroke={c.red} strokeDasharray="6 4" strokeOpacity={0.5} label={{ value: "Alert", position: "right", fontSize: 10, fill: c.red }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${c.border}`, fontFamily: c.font }} />
                  <Area type="monotone" dataKey="weight" stroke={c.accent} strokeWidth={2.5} fill="url(#wg3)" dot={{ r: 3.5, fill: c.accent, stroke: "white", strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("bp")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text, display: "flex", alignItems: "center", gap: 6 }}><Icon name="stethoscope" size={14} color={c.textMed} /> Blood Pressure Trend</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.orange, fontFamily: DS.fontDisplay }}>136/86 mmHg</span>
            <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
          </div>
        </button>
        {openSection === "bp" && (
          <div style={{ padding: "0 12px 14px" }}>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={BP_DATA} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={c.border} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 150]} tick={{ fontSize: 11, fill: c.textLight }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, fontFamily: c.font }} />
                  <Area type="monotone" dataKey="sys" stroke={c.red} strokeWidth={2} fill="none" dot={{ r: 3, fill: c.red, stroke: "white", strokeWidth: 2 }} name="Systolic" />
                  <Area type="monotone" dataKey="dia" stroke={c.accent} strokeWidth={2} fill="none" dot={{ r: 3, fill: c.accent, stroke: "white", strokeWidth: 2 }} name="Diastolic" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" }}>
        <button onClick={() => toggle("labs")} style={{ width: "100%", padding: "14px 18px", border: "none", background: "none", cursor: "pointer", fontFamily: c.font, textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.text, display: "flex", alignItems: "center", gap: 6 }}><Icon name="flask" size={14} color={c.textMed} /> Lab Results (Feb 14)</span>
          <span style={{ fontSize: 14, color: c.textLight }}>⌄</span>
        </button>
        {openSection === "labs" && (
          <div style={{ padding: "0 18px 14px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: c.font }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {["Test", "Value", "Ref", ""].map((h, i) => (
                    <th key={i} style={{ padding: "8px 4px", textAlign: "left", fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { test: "NT-proBNP", val: "1,850 pg/mL", ref: "<300", status: "High", color: c.red },
                  { test: "Creatinine", val: "1.4 mg/dL", ref: "0.6–1.2", status: "High", color: c.red },
                  { test: "eGFR", val: "48 mL/min", ref: ">60", status: "Low", color: c.orange },
                  { test: "Sodium", val: "138 mEq/L", ref: "136–145", status: "Normal", color: c.green },
                  { test: "Potassium", val: "4.2 mEq/L", ref: "3.5–5.0", status: "Normal", color: c.green },
                  { test: "HbA1c", val: "7.8%", ref: "<7%", status: "High", color: c.red },
                ].map((l, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                    <td style={{ padding: "8px 4px", fontWeight: 600, color: c.text, fontFamily: DS.fontMono, fontSize: 12 }}>{l.test}</td>
                    <td style={{ padding: "8px 4px", color: l.color, fontWeight: 700, fontFamily: DS.fontMono, fontSize: 12 }}>{l.val}</td>
                    <td style={{ padding: "8px 4px", color: c.textLight, fontFamily: DS.fontMono, fontSize: 12 }}>{l.ref}</td>
                    <td style={{ padding: "8px 4px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: l.color === c.green ? c.greenLight : l.color === c.orange ? c.orangeLight : c.redLight, color: l.color }}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Medications (5)</div>
          {["Carvedilol 12.5mg BID", "Lisinopril 10mg daily", "Furosemide 40mg daily AM", "Metformin 1000mg BID", "Spironolactone 25mg daily"].map((m, i) => (
            <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < 4 ? `1px solid ${c.borderLight}` : "none" }}>{m}</div>
          ))}
          <div style={{ marginTop: 8, fontSize: 12, color: c.red, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}><Icon name="alert" size={12} color={c.red} /> Allergy: Sulfa drugs</div>
        </div>
        <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "14px 18px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Conditions (5)</div>
          {["Chronic systolic HFrEF, NYHA III", "Hypertensive heart disease", "Type 2 diabetes", "CKD Stage 3a (eGFR 48)", "Morbid obesity (BMI 34.2)"].map((cond, i) => (
            <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < 4 ? `1px solid ${c.borderLight}` : "none" }}>{cond}</div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Patient Detail View ──
function RecentCallCard({ callData }) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <div style={{ marginTop: 20, background: c.card, borderRadius: c.radius, border: `1.5px solid ${c.tealLight}`, boxShadow: c.shadowMd, overflow: "hidden" }}>
      <div style={{ background: DS.color.slate[900], padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="phone" size={16} color="white" />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Recent AI Concierge Call</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{callData.timestamp} · Duration: {callData.duration}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {callData.alertGenerated && (
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(220,38,38,0.2)", color: "#F87171", border: "1px solid rgba(220,38,38,0.3)" }}>Alert Generated</span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: "rgba(14,165,233,0.15)", color: c.teal }}>Risk: {callData.riskScore}/100</span>
        </div>
      </div>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${c.border}` }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: c.textLight, textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.05em" }}>AI Summary</div>
        <div style={{ fontSize: 14, color: c.textMed, lineHeight: 1.6 }}>{callData.summary}</div>
      </div>
      <div style={{ padding: "12px 20px" }}>
        <button onClick={() => setShowTranscript(!showTranscript)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: c.font, fontSize: 13, fontWeight: 600, color: c.teal, padding: 0 }}>
          {showTranscript ? "▾ Hide Transcript" : "▸ Show Full Transcript"} ({callData.transcript.length} messages)
        </button>
        {showTranscript && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto" }}>
            {callData.transcript.map((line, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: line.speaker === "AI" ? c.teal : "#7C3AED", minWidth: 48 }}>{line.speaker === "AI" ? "Vardana" : "Patient"}</span>
                <span style={{ fontSize: 13, color: c.textMed, lineHeight: 1.5 }}>{line.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EpicPatientDetail({ patient, onOutreach, callData }) {
  const d = patient.epicData;
  const sectionHead = { fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 };
  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 400, color: c.text, margin: 0, fontFamily: DS.fontDisplay }}>{patient.name}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, background: c.tealLight, color: c.teal, border: `1px solid ${c.teal}30` }}>EPIC FHIR</span>
          </div>
          <p style={{ fontSize: 14, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>
            {d.patient?.gender} · DOB: {d.patient?.dob} · {d.patient?.address || ""}
          </p>
        </div>
        <button onClick={onOutreach} style={{ padding: "10px 18px", borderRadius: 10, background: DS.color.slate[950], color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", gap: 6, boxShadow: c.shadowMd }}>
          <Icon name="phone" size={14} color="white" /> Contact Patient
        </button>
      </div>

      {/* AI Check-in Section */}
      {callData ? (
        <RecentCallCard callData={callData} />
      ) : (
        <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "20px", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Icon name="chat" size={16} color={c.accent} />
            <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>AI Check-in</span>
          </div>
          <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.6, marginBottom: 14 }}>
            No AI check-in has been conducted yet. Initiate a voice call to have the AI concierge assess this patient using their live Epic FHIR data.
          </div>
          <button onClick={onOutreach} style={{ padding: "10px 16px", borderRadius: DS.radius.md, background: DS.color.slate[900], color: "white", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="phone" size={14} color="white" /> Contact Patient
          </button>
        </div>
      )}

      {/* Clinical Profile Summary */}
      <div style={{ background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Icon name="bar_chart" size={16} color={c.accent} />
          <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Clinical Profile Summary</span>
          <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.tealLight, color: c.teal }}>FROM EPIC</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
          {[
            { label: "Active Conditions", value: (d.conditions || []).filter(x => x.status === 'active').length },
            { label: "Medications", value: (d.medications || []).length },
            { label: "Lab Results", value: (d.labs || []).length },
            { label: "Reports", value: (d.diagnosticReports || []).length },
          ].map((item, i) => (
            <div key={i} style={{ padding: "10px 12px", borderRadius: 10, background: c.borderLight }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: c.card, borderRadius: c.radius, border: `1.5px solid ${c.tealLight}`, boxShadow: c.shadowMd, padding: "20px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 16 }}>🏥</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>Live EHR Data</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: c.greenLight, color: c.green, border: "1px solid #A7F3D0" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />LIVE
          </span>
        </div>

        {/* Demographics */}
        <div style={{ padding: "12px 14px", background: c.borderLight, borderRadius: 10, marginBottom: 14 }}>
          <div style={sectionHead}>Patient Demographics</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { label: "Name", value: d.patient?.name },
              { label: "DOB", value: d.patient?.dob },
              { label: "Gender", value: d.patient?.gender },
              { label: "Location", value: d.patient?.address },
              { label: "Phone", value: d.patient?.phone },
              { label: "Race", value: d.patient?.race },
            ].map((f, i) => (
              <div key={i} style={{ fontSize: 12 }}>
                <span style={{ color: c.textLight }}>{f.label}: </span>
                <span style={{ fontWeight: 600, color: c.text }}>{f.value || "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Conditions */}
        {d.conditions.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionHead}>Conditions ({d.conditions.length})</div>
            {d.conditions.map((cond, i) => (
              <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < d.conditions.length - 1 ? `1px solid ${c.borderLight}` : "none", display: "flex", justifyContent: "space-between" }}>
                <span>{cond.text}</span>
                <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, background: cond.status === "active" ? c.redLight : c.greenLight, color: cond.status === "active" ? c.red : c.green, fontWeight: 600 }}>{cond.status}</span>
              </div>
            ))}
          </div>
        )}

        {/* Medications */}
        {d.medications.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionHead}>Medications ({d.medications.length})</div>
            {d.medications.map((med, i) => (
              <div key={i} style={{ fontSize: 13, color: c.textMed, padding: "4px 0", borderBottom: i < d.medications.length - 1 ? `1px solid ${c.borderLight}` : "none" }}>
                <span style={{ fontWeight: 600, color: c.text }}>{med.name}</span>
                {med.dosage && <div style={{ fontSize: 11, color: c.textLight, marginTop: 2 }}>{med.dosage}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Labs */}
        {d.labs.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionHead}>Lab Results ({d.labs.length})</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: c.font }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {["Test", "Value", "Date"].map((h, i) => (
                    <th key={i} style={{ padding: "6px 4px", textAlign: "left", fontSize: 10, fontWeight: 700, color: c.textLight, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.labs.map((lab, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                    <td style={{ padding: "6px 4px", fontWeight: 600, color: c.text }}>{lab.name}</td>
                    <td style={{ padding: "6px 4px", color: c.accent, fontWeight: 700 }}>{lab.value} {lab.unit}</td>
                    <td style={{ padding: "6px 4px", color: c.textLight }}>{lab.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Diagnostic Reports */}
        {d.diagnosticReports.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={sectionHead}>Diagnostic Reports ({d.diagnosticReports.length})</div>
            {d.diagnosticReports.map((dr, i) => (
              <div key={i} style={{ fontSize: 12, color: c.textMed, padding: "4px 0", borderBottom: i < d.diagnosticReports.length - 1 ? `1px solid ${c.borderLight}` : "none", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600, color: c.text }}>{dr.name}</span>
                <span style={{ color: c.textLight }}>{dr.date}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: "8px 12px", background: c.tealLight + "60", borderRadius: 8, fontSize: 11, color: c.teal, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="lock" size={12} color={c.teal} /> Authenticated via SMART on FHIR Backend Services · JWT + RS384 · FHIR R4
        </div>
      </div>
    </div>
  );
}

// ── Generic Patient Summary (non-Sarah roster patients) ──
function GenericPatientSummary({ patient, onOutreach }) {
  const trendColors = { worsening: c.red, stable: c.teal, improving: "#10B981" };
  const trendIcons = { worsening: "↗", stable: "→", improving: "↘" };
  const phaseColors = { Stabilize: "#10B981", "Stabilize → Optimize": "#10B981", Optimize: "#3B82F6", Maintain: "#8B5CF6" };
  const data = PATIENT_CLINICAL_DATA[patient.id];
  const cardStyle = { background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" };
  const sectionHead = { fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 };
  const statusColor = (s) => s === "good" ? c.green : s === "elevated" ? c.red : c.orange;

  return (
    <div style={{ marginTop: 20, display: "grid", gap: 16 }}>
      {/* Journey Progress */}
      <div style={{ ...cardStyle, overflow: "hidden" }}>
        <div style={{ background: DS.color.slate[950], padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="flag" size={16} color="white" />
          <div style={{ fontSize: 14, fontWeight: 700, color: "white" }}>Recovery Journey</div>
        </div>
        <div style={{ padding: "18px 20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Day</div>
              <div style={{ fontSize: 24, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{patient.day}<span style={{ fontSize: 14, fontWeight: 500, color: c.textLight, fontFamily: DS.fontSans }}> / 90</span></div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Phase</div>
              <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, background: (phaseColors[patient.phase] || c.teal) + "18", color: phaseColors[patient.phase] || c.teal }}>{patient.phase}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>Trend</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 18, color: trendColors[patient.trend] || c.textMed }}>{trendIcons[patient.trend] || "→"}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: trendColors[patient.trend] || c.textMed, textTransform: "capitalize" }}>{patient.trend || "—"}</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ height: 8, borderRadius: 4, background: c.borderLight, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 4, width: `${Math.min(100, (patient.day / 90) * 100)}%`, background: `linear-gradient(90deg, #10B981, ${phaseColors[patient.phase] || "#3B82F6"})`, transition: "width 0.5s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: c.textLight }}>
              <span>Day 1</span><span>Day 14</span><span>Day 60</span><span>Day 90</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Outreach */}
      {patient.scheduledOutreach && (
        <div style={{ ...cardStyle, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="calendar" size={16} color={c.accent} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>Scheduled Outreach</div>
              <div style={{ fontSize: 12, color: c.textLight }}>{patient.scheduledOutreach}</div>
            </div>
          </div>
          <button onClick={onOutreach} style={{ padding: "8px 14px", borderRadius: 8, background: c.teal, color: "white", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: c.font }}>Contact Now</button>
        </div>
      )}

      {data ? (
        <>
          {/* Current Vitals */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Current Vitals</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {/* Weight */}
              <div style={{ padding: "14px 16px", background: c.borderLight, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 6 }}>WEIGHT</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{data.vitals.weight.current}</span>
                  <span style={{ fontSize: 12, color: c.textLight }}>{data.vitals.weight.unit}</span>
                </div>
                <div style={{ fontSize: 12, color: statusColor(data.vitals.weight.status), fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>{data.vitals.weight.trend}</div>
              </div>
              {/* BP */}
              <div style={{ padding: "14px 16px", background: c.borderLight, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 6 }}>BLOOD PRESSURE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ fontSize: 24, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{data.vitals.bp.sys}/{data.vitals.bp.dia}</span>
                  <span style={{ fontSize: 12, color: c.textLight }}>mmHg</span>
                </div>
                <div style={{ fontSize: 12, color: statusColor(data.vitals.bp.status), fontWeight: 600, marginTop: 4 }}>{data.vitals.bp.note}</div>
              </div>
              {/* HR */}
              <div style={{ padding: "14px 16px", background: c.borderLight, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 6 }}>HEART RATE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{data.vitals.hr.value}</span>
                  <span style={{ fontSize: 12, color: c.textLight }}>bpm</span>
                </div>
                <div style={{ fontSize: 12, color: statusColor(data.vitals.hr.status), fontWeight: 600, marginTop: 4 }}>{data.vitals.hr.note}</div>
              </div>
              {/* SpO2 */}
              <div style={{ padding: "14px 16px", background: c.borderLight, borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, marginBottom: 6 }}>OXYGEN SATURATION</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <span style={{ fontSize: 24, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{data.vitals.spo2.value}</span>
                  <span style={{ fontSize: 12, color: c.textLight }}>%</span>
                </div>
                <div style={{ fontSize: 12, color: statusColor(data.vitals.spo2.status), fontWeight: 600, marginTop: 4 }}>{data.vitals.spo2.status === "good" ? "Normal" : "Monitor"}</div>
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Active Conditions</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {data.conditions.map((cond, i) => (
                <span key={i} style={{ padding: "6px 12px", borderRadius: 8, background: c.borderLight, fontSize: 13, fontWeight: 600, color: c.text, border: `1px solid ${c.border}` }}>{cond}</span>
              ))}
            </div>
          </div>

          {/* Medications */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Medications</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.medications.map((med, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: c.borderLight, borderRadius: 10 }}>
                  <Icon name="pill" size={18} color={c.accent} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{med.name} <span style={{ fontWeight: 500, color: c.textLight }}>{med.dose}</span></div>
                    <div style={{ fontSize: 12, color: c.textLight, marginTop: 2 }}>{med.timing}</div>
                  </div>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: c.greenLight, border: `1.5px solid ${c.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color={c.green} /></div>
                </div>
              ))}
            </div>
            {data.allergy && (
              <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF3C7", borderRadius: 10, fontSize: 12, color: c.orange, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="alert" size={12} color={c.orange} /> Allergy: {data.allergy}
              </div>
            )}
          </div>

          {/* Labs */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Recent Lab Results</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: c.font }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                  {["Test", "Value", "Date", "Status"].map((h, i) => (
                    <th key={i} style={{ padding: "8px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: c.textLight, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.labs.map((lab, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${c.borderLight}` }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600, color: c.text }}>{lab.name}</td>
                    <td style={{ padding: "8px 6px", color: c.textMed }}>{lab.value}</td>
                    <td style={{ padding: "8px 6px", color: c.textLight }}>{lab.date}</td>
                    <td style={{ padding: "8px 6px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: statusColor(lab.status) + "18", color: statusColor(lab.status), textTransform: "capitalize" }}>{lab.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recent AI Check-ins */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Recent AI Check-ins</div>
            {data.recentCheckins.map((item, i) => (
              <div key={i} style={{ padding: "14px 16px", background: i === 0 ? `${c.purple}08` : c.borderLight, borderRadius: 10, marginBottom: i < data.recentCheckins.length - 1 ? 8 : 0, border: i === 0 ? `1px solid ${c.purple}20` : "none" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? c.purple : c.textLight, marginBottom: 6 }}>{item.date}</div>
                <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.6 }}>{item.summary}</div>
              </div>
            ))}
          </div>

          {/* Care Team */}
          <div style={{ ...cardStyle, padding: "20px 24px" }}>
            <div style={sectionHead}>Care Team</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { name: data.coordinator, role: "Care Coordinator", initials: data.coordinator.split(' ').map(w => w[0]).join('').substring(0, 2), color: c.teal },
                { name: patient.doctor, role: "Physician", initials: patient.doctor.replace("Dr. ", "").split(' ').map(w => w[0]).join(''), color: c.accent },
                { name: "Vardana AI", role: "Care Concierge", initials: "V", color: c.purple },
              ].map((member, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: c.borderLight, borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: `${member.color}15`, border: `2px solid ${member.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: member.color, fontFamily: DS.fontSans }}>{member.initials}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: c.textLight }}>{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ background: c.tealLight + "30", borderRadius: c.radius, border: `1px solid ${c.tealLight}`, padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Icon name="info" size={14} color={c.teal} />
          <div style={{ fontSize: 13, color: c.teal, lineHeight: 1.5 }}>
            <strong>EHR Integration Required</strong> — Detailed clinical data will be available after connecting this patient's electronic health record.
          </div>
        </div>
      )}
    </div>
  );
}

function PatientDetail({ patient, onBack, onOutreach, callData, guidanceBanner, isScriptedDemo = false }) {
  const [showContactPointer, setShowContactPointer] = useState(false);
  if (patient.isEpic) return <EpicPatientDetail patient={patient} onOutreach={onOutreach} callData={callData} />;

  const isPrimaryPatient = patient.id === 1 || patient.id === 101;

  // Scripted demo: show pointer at 5s, auto-trigger Contact Patient at 7s
  useEffect(() => {
    if (!isScriptedDemo) return;
    const pointerTimer = setTimeout(() => setShowContactPointer(true), 5000);
    const navTimer = setTimeout(() => { setShowContactPointer(false); onOutreach(); }, 7000);
    return () => { clearTimeout(pointerTimer); clearTimeout(navTimer); };
  }, [isScriptedDemo]);

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
      {guidanceBanner}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: c.text, margin: 0, fontFamily: DS.fontDisplay }}>{patient.name}</h1>
          <p style={{ fontSize: 14, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>
            {patient.age}{patient.gender || ""} · {patient.doctor ? patient.doctor + " · " : ""}<span style={{ fontFamily: DS.fontDisplay }}>Day {patient.day}</span> of 90 · {patient.phase}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Hide header CTA when alert sticky bar is visible (avoid duplicate) */}
          {!patient.alert && (
            <button onClick={onOutreach} style={{ padding: "10px 18px", borderRadius: 10, background: DS.color.slate[950], color: "white", border: "none", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", gap: 6, boxShadow: c.shadowMd }}>
              <Icon name="phone" size={14} color="white" /> Contact Patient
            </button>
          )}
          {patient.risk != null && (
            <div style={{ textAlign: "right" }}>
              <RiskBadge level={patient.riskLevel} score={patient.risk} />
              {patient.riskAssessedDuringCall && <div style={{ fontSize: 10, color: c.teal, fontWeight: 600, marginTop: 3 }}>Risk assessed during call</div>}
            </div>
          )}
        </div>
      </div>

      <div style={{ paddingBottom: patient.alert ? 80 : 0 }}>
        {isPrimaryPatient ? (
          <>
            <AIReasoningCard onOutreach={onOutreach} onBack={onBack} isScriptedDemo={isScriptedDemo} isMarcus={patient.id === 101} />
            {callData && <RecentCallCard callData={callData} />}
            {!isScriptedDemo && <div style={{ marginTop: 20 }}><SupportingData /></div>}
          </>
        ) : (
          <>
            {callData && <RecentCallCard callData={callData} />}
            <GenericPatientSummary patient={patient} onOutreach={onOutreach} />
          </>
        )}
      </div>

      {/* Sticky bottom action bar for alerted patients */}
      {patient.alert && (
        <div style={{ position: "sticky", bottom: 0, background: isScriptedDemo ? "#0C1420" : "white", borderTop: `1px solid ${isScriptedDemo ? "#1C2B40" : c.border}`, padding: "12px 24px", display: "flex", gap: 12, boxShadow: isScriptedDemo ? "0 -4px 20px rgba(0,0,0,0.3)" : "0 -4px 20px rgba(0,0,0,0.08)", zIndex: 10 }}>
          {isScriptedDemo ? (
            <div style={{ position: "relative", width: "100%" }}>
              <button onClick={onOutreach} style={{ width: "100%", background: "#D97706", color: "white", border: "none", padding: "14px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="phone" size={14} color="white" /> Contact Patient
              </button>
              {showContactPointer && (
                <div style={{ position: "absolute", right: 24, top: "50%", transform: "translateY(-50%)", animation: "pointerBounce 0.6s ease infinite alternate", pointerEvents: "none", zIndex: 50 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#F59E0B"><path d="M4 0 L4 20 L8 16 L12 24 L14 22 L10 14 L16 14 Z"/></svg>
                </div>
              )}
            </div>
          ) : (
            <button onClick={onOutreach} style={{ width: "100%", background: DS.color.slate[950], color: "white", border: "none", padding: "12px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: c.font, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <Icon name="phone" size={14} color="white" /> Contact Patient
              </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scripted Demo Guidance Banner ──
function ScriptedGuidanceBanner({ text, onDismiss }) {
  return (
    <div style={{
      background: 'rgba(245,158,11,0.08)',
      border: '1px solid rgba(245,158,11,0.25)',
      borderRadius: 10,
      padding: '12px 16px',
      marginBottom: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#D97706', fontFamily: c.font }}>Scripted Demo</span>
        <span style={{ fontSize: 13, color: c.textMed, fontFamily: c.font }}>{text}</span>
      </div>
      <button onClick={onDismiss} style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#556882" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

// ── Main App ──
function CareCoordinatorView({ onSwitchRole, isScriptedDemo = false, isLiveDemo = false, isMarcusDemo = false }) {
  const isMobile = useIsMobile();
  const [view, setView] = useState("roster"); // roster | patient | voiceCall | smsPath
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showOutreachModal, setShowOutreachModal] = useState(false);
  const [showRosterBanner, setShowRosterBanner] = useState(false);
  const [showDetailBanner, setShowDetailBanner] = useState(false);
  const [callTranscripts, setCallTranscripts] = useState({});
  const [riskOverrides, setRiskOverrides] = useState({}); // { patientId: { score, level } }
  const [epicPatients, setEpicPatients] = useState([]);
  const [epicLoading, setEpicLoading] = useState(false);
  const [wsAlerts, setWsAlerts] = useState([]);
  const [wsStatus, setWsStatus] = useState('disconnected'); // disconnected | connected | reconnecting
  const [activeSessions, setActiveSessions] = useState(3);
  const wsRef = useRef(null);
  const wsReconnectRef = useRef(null);

  // WebSocket connection to backend alert feed
  useEffect(() => {
    let cancelled = false;
    const connect = () => {
      if (cancelled) return;
      try {
        setWsStatus('reconnecting');
        const ws = new WebSocket('ws://3.89.228.45:8765/ws');
        wsRef.current = ws;
        ws.onopen = () => { if (!cancelled) setWsStatus('connected'); };
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'coordinator_alert') {
              setWsAlerts(prev => [{ id: Date.now(), ...msg.data, timestamp: new Date().toLocaleTimeString() }, ...prev].slice(0, 10));
            } else if (msg.type === 'session_update') {
              setActiveSessions(msg.data?.active_count ?? activeSessions);
            }
          } catch {}
        };
        ws.onclose = () => {
          if (!cancelled) {
            setWsStatus('reconnecting');
            wsReconnectRef.current = setTimeout(connect, 3000);
          }
        };
        ws.onerror = () => { ws.close(); };
      } catch {
        if (!cancelled) wsReconnectRef.current = setTimeout(connect, 3000);
      }
    };
    connect();
    return () => {
      cancelled = true;
      if (wsRef.current) wsRef.current.close();
      if (wsReconnectRef.current) clearTimeout(wsReconnectRef.current);
    };
  }, []);

  const simulateAlert = () => {
    const alert = {
      id: Date.now(),
      patient: 'Marcus Williams',
      type: 'chest_pain',
      severity: 'P1',
      message: 'Patient reports chest tightness during check-in. BP 162/101. Recommending immediate evaluation.',
      risk: 84,
      timestamp: new Date().toLocaleTimeString(),
    };
    setWsAlerts(prev => [alert, ...prev].slice(0, 10));
  };

  // Scripted demo: user clicks Sarah Chen on roster, then clicks Contact Patient to start call

  // Listen for cross-tab escalation events from patient chat (Video 2 demo moment)
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key !== 'vardana-escalation' || !e.newValue) return;
      try {
        const data = JSON.parse(e.newValue);
        if (data.patientId && data.riskScore) {
          setRiskOverrides(prev => ({ ...prev, [data.patientId]: { score: data.riskScore, level: data.riskLevel || 'high' } }));
          // If this patient is currently selected, update the alert state
          if (data.generateAlert) {
            setSelectedPatient(prev => prev?.id === data.patientId ? { ...prev, alert: true, alertType: 'AI chat escalation', alertTime: 'Just now', risk: data.riskScore, riskLevel: data.riskLevel } : prev);
          }
        }
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Enrich patient with call-assessed risk score (freezes at peak from call)
  const enrichPatient = (p) => {
    const override = riskOverrides[p.id];
    if (!override) return p;
    return { ...p, risk: override.score, riskLevel: override.level, riskAssessedDuringCall: true };
  };

  const fetchEpicPatients = async () => {
    if (epicPatients.length > 0 || epicLoading) return;
    setEpicLoading(true);
    const epicIds = [
      "erXuFYUfucBZaryVksYEcMg3",       // Camila Lopez
      "eq081-VQEgP8drUUqCWzHfw3",       // Jason Argonaut
    ];
    try {
      const results = await Promise.allSettled(
        epicIds.map(id => fetch(`/api/epic-fhir?patientId=${id}&resource=all`).then(r => r.ok ? r.json() : null))
      );
      const patients = results
        .filter(r => r.status === "fulfilled" && r.value?.patient)
        .map(r => {
          const data = r.value;
          const age = data.patient.dob ? Math.floor((Date.now() - new Date(data.patient.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;
          return {
            id: `epic-${data.patient.id}`,
            name: data.patient.name || "Epic Patient",
            age,
            day: null, phase: null, risk: null, riskLevel: null,
            alert: false, trend: null, scheduledOutreach: null,
            isEpic: true,
            epicData: data,
          };
        });
      if (patients.length > 0) setEpicPatients(patients);
    } catch (e) {
      console.error("Epic fetch failed:", e);
    } finally {
      setEpicLoading(false);
    }
  };

  const handleInitiate = (channel, timing) => {
    setShowOutreachModal(false);
    if (channel === "voice" && timing === "now") {
      preUnlockAudio();
      setView("voiceCall");
    } else if (channel === "sms") {
      setView("smsPath");
    } else {
      // Scheduled: just show confirmation (simplified)
      alert(`Outreach scheduled via ${channel}.`);
    }
  };

  // Pre-render TTS audio in background while roster is showing (scripted demo)
  useEffect(() => {
    if (!isScriptedDemo) return;
    const patientKey = isMarcusDemo ? 'marcus' : 'sarah';
    if (window._vardanaPreloadedUrls && window._vardanaPreloadedPatient === patientKey) return;
    const transcript = isMarcusDemo ? MARCUS_VOICE_TRANSCRIPT : VOICE_TRANSCRIPT;
    let cancelled = false;
    (async () => {
      try {
        const urls = await Promise.all(
          transcript.map((line, i) =>
            new Promise(resolve => setTimeout(resolve, i * 50))
              .then(() => {
                if (cancelled) return null;
                return fetch("/api/tts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ text: line.text, speaker: line.speaker }),
                }).then(r => r.ok ? r.blob().then(b => URL.createObjectURL(b)) : null);
              })
              .catch(() => null)
          )
        );
        if (!cancelled && urls.every(u => u)) {
          window._vardanaPreloadedUrls = urls;
          window._vardanaPreloadedPatient = patientKey;
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [isScriptedDemo, isMarcusDemo]);

  // Pre-unlock audio on user gesture before voice call mounts
  const preUnlockAudio = () => {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        const ctx = new AudioCtx();
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        // Store on window so VoiceCallDemo can reuse it
        window._vardanaAudioCtx = ctx;
      } catch {}
    }
  };

  // Determine which roster and clinical data to use
  const activeRoster = isMarcusDemo ? MARCUS_ROSTER : ROSTER;
  const activeClinicalData = isMarcusDemo ? { ...PATIENT_CLINICAL_DATA, ...MARCUS_CLINICAL_DATA } : PATIENT_CLINICAL_DATA;
  const primaryPatientId = isMarcusDemo ? 101 : 1;
  const coordinatorName = isMarcusDemo ? "David Park, RN" : "Rachel Kim, RN";

  if (view === "voiceCall") {
    return <VoiceCallDemo patient={selectedPatient} autoStartScripted={isScriptedDemo} autoStartLive={isLiveDemo} onExitDemo={isScriptedDemo ? onSwitchRole : null} isMarcusDemo={isMarcusDemo} onComplete={(data) => {
      if (data) {
        setCallTranscripts(prev => ({ ...prev, [selectedPatient.id]: data }));
        if (data.riskScore) {
          const level = data.riskScore >= 70 ? "high" : data.riskScore >= 40 ? "moderate" : "low";
          setRiskOverrides(prev => ({ ...prev, [selectedPatient.id]: { score: data.riskScore, level } }));
        }
      }
      setView("roster");
    }} />;
  }

  if (view === "smsPath") {
    return <SMSPathDemo patient={selectedPatient} onComplete={() => { setView("roster"); }} />;
  }

  return (
    <div style={{ fontFamily: c.font, background: c.bg, minHeight: "100vh" }}>
      
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        button:active { opacity: 0.9; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${c.border}; border-radius: 3px; }
        @keyframes amberBorderPulse {
          0% { box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
          50% { box-shadow: 0 0 0 4px rgba(245,158,11,0.5); }
          100% { box-shadow: 0 0 0 2px rgba(245,158,11,0.2); }
        }
      `}</style>
      <Header patientSelected={view === "patient"} onBack={() => setView("roster")} onSwitchRole={onSwitchRole} coordinatorName={isMarcusDemo ? "David Park" : "Rachel Kim"} coordinatorInitials={isMarcusDemo ? "DP" : "RK"} />
      {/* WebSocket status + active sessions bar */}
      <div style={{ background: "#0F172A", padding: "6px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontFamily: c.font, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: wsStatus === 'connected' ? '#34D399' : wsStatus === 'reconnecting' ? '#F59E0B' : '#EF4444' }} />
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{wsStatus === 'connected' ? 'Connected' : wsStatus === 'reconnecting' ? 'Reconnecting...' : 'Disconnected'}</span>
          <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>|</span>
          <span style={{ color: "rgba(255,255,255,0.5)" }}>{activeSessions} active session{activeSessions !== 1 ? 's' : ''}</span>
        </div>
        <button onClick={simulateAlert} style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", color: "#F59E0B", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: c.font }}>Simulate Alert</button>
      </div>
      {/* WebSocket alert feed */}
      {wsAlerts.length > 0 && view === "roster" && (
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "12px 24px 0" }}>
          {wsAlerts.slice(0, 3).map((alert, i) => (
            <div key={alert.id} style={{
              background: alert.severity === 'P1' ? '#FEF2F2' : '#FFFBEB',
              border: `1px solid ${alert.severity === 'P1' ? '#FECACA' : '#FDE68A'}`,
              borderLeft: `4px solid ${alert.severity === 'P1' ? '#EF4444' : '#F59E0B'}`,
              borderRadius: 8, padding: "12px 16px", marginBottom: 8,
              animation: 'slideIn 0.3s ease-out',
            }}>
              <style>{`@keyframes slideIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: alert.severity === 'P1' ? '#DC2626' : '#D97706', background: alert.severity === 'P1' ? '#FEE2E2' : '#FEF3C7', padding: "2px 6px", borderRadius: 4 }}>{alert.severity}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{alert.patient}</span>
                </div>
                <span style={{ fontSize: 10, color: c.textLight }}>{alert.timestamp}</span>
              </div>
              <div style={{ fontSize: 12, color: c.textMed, lineHeight: 1.5 }}>{alert.message}</div>
              {alert.risk && <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginTop: 4 }}>Risk Score: {alert.risk}</div>}
            </div>
          ))}
        </div>
      )}
      {view === "patient" && selectedPatient ? (
        <PatientDetail
          patient={selectedPatient}
          onBack={() => setView("roster")}
          isScriptedDemo={isScriptedDemo}
          onOutreach={() => {
            if (isScriptedDemo) {
              preUnlockAudio();
              setView("voiceCall");
            } else {
              setShowOutreachModal(true);
            }
          }}
          callData={callTranscripts[selectedPatient?.id]}
          guidanceBanner={showDetailBanner ? (
            <ScriptedGuidanceBanner
              text="Review the evidence chain below, then click Contact Patient to start the AI voice call."
              onDismiss={() => setShowDetailBanner(false)}
            />
          ) : null}
        />
      ) : (
        <RosterView
          onSelect={(p) => { setSelectedPatient(enrichPatient(p)); setView("patient"); setShowDetailBanner(isScriptedDemo); }}
          onCallPatient={(p) => { preUnlockAudio(); setSelectedPatient(enrichPatient(p)); setView("voiceCall"); }}
          onBack={isScriptedDemo ? onSwitchRole : undefined}
          epicPatients={epicPatients} epicLoading={epicLoading} onFetchEpic={fetchEpicPatients} riskOverrides={riskOverrides}
          isScriptedDemo={isScriptedDemo}
          roster={activeRoster}
          primaryPatientId={primaryPatientId}
          guidanceBanner={showRosterBanner ? (
            <ScriptedGuidanceBanner
              text={isMarcusDemo
                ? "Marcus Williams has been flagged. Click &quot;Call Patient&quot; to start the AI voice call."
                : "Sarah Chen has been flagged. Click &quot;Call Patient&quot; to start the AI voice call."}
              onDismiss={() => setShowRosterBanner(false)}
            />
          ) : null}
        />
      )}
      {showOutreachModal && selectedPatient && (
        <OutreachModal
          patient={selectedPatient}
          onClose={() => setShowOutreachModal(false)}
          onInitiate={handleInitiate}
        />
      )}
    </div>
  );
}

// ── Patient Header ──
function PatientHeader({ onSwitchRole }) {
  return (
    <div style={{ background: DS.color.slate[950], color: "white", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 20, fontWeight: 400, fontFamily: DS.fontDisplay, letterSpacing: "-0.02em" }}>
          Vardana<span style={{ color: DS.color.amber[400] }}>.</span>
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, opacity: 0.5, borderLeft: "1px solid rgba(255,255,255,0.2)", paddingLeft: 12 }}>
          Patient Portal
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
        {onSwitchRole && <button onClick={onSwitchRole} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontFamily: c.font, fontWeight: 600 }}>Switch Role</button>}
        <span style={{ opacity: 0.6 }}>Sarah Chen</span>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>SC</div>
      </div>
    </div>
  );
}

// ── Patient Contact Modal (Voice / Chat selection) ──
function PatientContactModal({ onClose, onVoice, onChat }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,26,42,0.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(4px)" }}>
      <div style={{ background: c.card, borderRadius: 16, width: "100%", maxWidth: 480, boxShadow: "0 24px 64px rgba(0,0,0,0.2)", overflow: "hidden", fontFamily: c.font }}>
        <div style={{ background: DS.color.slate[950], padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>Talk to Vardana AI</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Your care concierge is ready to help</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", border: "none", color: "white", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {/* Voice Call */}
            <div style={{ flex: 1, background: c.borderLight, border: `2px solid ${c.accent}30`, borderRadius: 14, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #0EA5E9, #0284C7)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon name="phone" size={22} color="white" /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 4 }}>Voice Call</div>
              <div style={{ fontSize: 11, color: c.textLight, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>Speak directly with Vardana. Natural conversation about how you're feeling.</div>
              <button onClick={onVoice} style={{ width: "100%", padding: "10px", borderRadius: 9, background: "linear-gradient(135deg, #0EA5E9, #0284C7)", color: "white", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: c.font }}>Start Voice Call</button>
              <div style={{ fontSize: 10, color: c.textLight, marginTop: 6 }}>Requires microphone</div>
            </div>
            {/* Chat */}
            <div style={{ flex: 1, background: c.borderLight, border: `2px solid ${c.purple}30`, borderRadius: 14, padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${c.purple}, #7C3AED)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}><Icon name="sms" size={22} color="white" /></div>
              <div style={{ fontSize: 14, fontWeight: 800, color: c.text, marginBottom: 4 }}>Chat</div>
              <div style={{ fontSize: 11, color: c.textLight, lineHeight: 1.5, marginBottom: 14, flex: 1 }}>Type your questions. Same AI concierge, at your own pace.</div>
              <button onClick={onChat} style={{ width: "100%", padding: "10px", borderRadius: 9, background: `linear-gradient(135deg, ${c.purple}, #7C3AED)`, color: "white", border: "none", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: c.font }}>Start Chat</button>
              <div style={{ fontSize: 10, color: c.textLight, marginTop: 6 }}>No mic needed</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: "100%", padding: "10px", border: "none", background: "none", color: c.textLight, fontSize: 13, cursor: "pointer", fontFamily: c.font }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Chat Component ──
function PatientChat({ patient, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [history, setHistory] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // AI greeting on mount
  useEffect(() => {
    const greeting = `Hi ${patient.name.split(' ')[0]}, I'm your Vardana care concierge. How can I help you today?`;
    setMessages([{ role: "ai", text: greeting }]);
    setHistory([{ role: "assistant", content: greeting }]);
  }, [patient.name]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text }]);
    const newHistory = [...history, { role: "user", content: text }];
    setHistory(newHistory);
    setIsTyping(true);

    try {
      const res = await fetch("/api/voice-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newHistory, turn: Math.floor(newHistory.length / 2), maxTurns: 20, chatMode: true }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setMessages(prev => [...prev, { role: "ai", text: data.reply }]);
      setHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      // Notify coordinator view of escalation via localStorage (cross-tab)
      if (data.riskScore || data.generateAlert) {
        const escalation = { patientId: patient.id, riskScore: data.riskScore, generateAlert: data.generateAlert, riskLevel: data.riskScore >= 80 ? 'critical' : data.riskScore >= 45 ? 'high' : data.riskScore >= 20 ? 'moderate' : 'low', timestamp: Date.now() };
        localStorage.setItem('vardana-escalation', JSON.stringify(escalation));
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: "I'm sorry, I'm having trouble connecting right now. Please try again." }]);
    }
    setIsTyping(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: DS.color.slate[950], zIndex: 300, display: "flex", flexDirection: "column", fontFamily: c.font }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onBack} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "white", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: c.font }}>← Back</button>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${c.purple}, #7C3AED)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>V</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "white" }}>Vardana AI</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>Care Concierge</div>
          </div>
        </div>
        <button onClick={onBack} style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#FCA5A5", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: c.font }}>End Chat</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 10px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", marginBottom: 12 }}>
              {msg.role === "ai" && (
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.purple}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.purple, marginRight: 8, flexShrink: 0, marginTop: 2 }}>V</div>
              )}
              <div style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                background: msg.role === "user" ? "linear-gradient(135deg, #0EA5E9, #0284C7)" : "rgba(255,255,255,0.06)",
                border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.08)",
                color: "white",
                fontSize: 13,
                lineHeight: 1.6,
              }}>
                {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                  part.startsWith('**') && part.endsWith('**')
                    ? <strong key={j}>{part.slice(2, -2)}</strong>
                    : part
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${c.purple}25`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: c.purple }}>V</div>
              <div style={{ padding: "10px 14px", borderRadius: "14px 14px 14px 4px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", fontSize: 13 }}>Typing...</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ maxWidth: 600, margin: "0 auto", display: "flex", gap: 8 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "white", fontSize: 14, fontFamily: c.font, outline: "none" }}
          />
          <button onClick={sendMessage} disabled={isTyping || !input.trim()} style={{ padding: "12px 20px", borderRadius: 12, background: isTyping || !input.trim() ? "rgba(255,255,255,0.06)" : "linear-gradient(135deg, #0EA5E9, #0284C7)", color: "white", border: "none", fontSize: 14, fontWeight: 800, cursor: isTyping ? "default" : "pointer", fontFamily: c.font, opacity: isTyping || !input.trim() ? 0.4 : 1 }}>Send</button>
        </div>
      </div>
    </div>
  );
}

// ── Patient Experience View ──
function PatientExperienceView({ onSwitchRole }) {
  const patient = ROSTER[0]; // Sarah Chen
  const [view, setView] = useState("dashboard"); // dashboard | voiceCall | chat
  const [showContactModal, setShowContactModal] = useState(false);
  const latestWeight = WEIGHT_DATA[WEIGHT_DATA.length - 1];
  const prevWeight = WEIGHT_DATA[WEIGHT_DATA.length - 3];
  const latestBP = BP_DATA[BP_DATA.length - 1];
  const journeyPct = (patient.day / 90) * 100;

  const sarahPatient = { ...patient, isEpic: false, alert: false };

  if (view === "voiceCall") {
    return <VoiceCallDemo patient={sarahPatient} onComplete={() => setView("dashboard")} />;
  }
  if (view === "chat") {
    return <PatientChat patient={sarahPatient} onBack={() => setView("dashboard")} />;
  }

  const medications = [
    { name: "Carvedilol", dose: "12.5mg", timing: "Twice daily (morning & evening)", iconName: "pill" },
    { name: "Lisinopril", dose: "10mg", timing: "Once daily (morning)", iconName: "pill" },
    { name: "Furosemide", dose: "40mg", timing: "Once daily (morning)", icon: "💧" },
    { name: "Metformin", dose: "1000mg", timing: "Twice daily (with meals)", iconName: "pill" },
    { name: "Spironolactone", dose: "25mg", timing: "Once daily", iconName: "pill" },
  ];

  const cardStyle = { background: c.card, borderRadius: c.radius, border: `1px solid ${c.border}`, boxShadow: c.shadow, overflow: "hidden" };
  const sectionHead = { fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 };

  return (
    <div style={{ minHeight: "100vh", background: "#E5E7EB", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px", fontFamily: c.font }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; }
        button:active { opacity: 0.9; }
      `}</style>
      <div style={{ width: 390, minHeight: 844, background: DS.color.canvas.warm, borderRadius: 44, boxShadow: "0 25px 60px rgba(0,0,0,0.15), 0 0 0 4px #1F2937", overflow: "hidden", position: "relative" }}>
      <PatientHeader onSwitchRole={onSwitchRole} />

      <div style={{ padding: 16 }}>

        {/* Welcome */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 400, color: c.text, margin: 0, fontFamily: DS.fontDisplay }}>Welcome back, Sarah</h1>
          <p style={{ fontSize: 14, color: c.textLight, margin: "4px 0 0", fontFamily: c.font }}>Here's your recovery progress for today</p>
        </div>

        {/* AI Concierge Check-in — above the fold */}
        <div style={{ ...cardStyle, padding: 0, marginBottom: 16, background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", border: "none", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(14,165,233,0.08)" }} />
          <div style={{ padding: "20px 24px", position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #0EA5E9, #A855F7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="phone" size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "white" }}>Your daily check-in is ready</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 }}>Talk to Vardana AI about how you're feeling today</div>
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              style={{
                padding: "10px 22px", borderRadius: 10,
                background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                color: "white", border: "none", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: c.font, whiteSpace: "nowrap",
                boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              Start Check-in
            </button>
          </div>
        </div>

        {/* Weight Alert — elevated above journey bar when alert active */}
        {patient.alert && (
          <div style={{ ...cardStyle, padding: "18px 20px", marginBottom: 16, borderLeft: `4px solid ${c.red}`, background: "#FEF2F2" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Icon name="alert" size={16} color={c.red} />
              <div style={{ fontSize: 13, fontWeight: 700, color: c.red, textTransform: "uppercase", letterSpacing: "0.05em" }}>Weight Change Alert</div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{latestWeight.weight}</span>
              <span style={{ fontSize: 13, color: c.textLight }}>lbs</span>
              <span style={{ fontSize: 14, color: c.red, fontWeight: 700 }}>+{(latestWeight.weight - prevWeight.weight).toFixed(1)} lbs in 48hrs</span>
            </div>
            <div style={{ fontSize: 13, color: c.textMed, marginTop: 8, lineHeight: 1.5 }}>Your care team has been notified. Nurse Rachel Kim will call you today.</div>
          </div>
        )}

        {/* Journey Progress */}
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: c.text }}>Recovery Journey</div>
              <div style={{ fontSize: 13, color: c.textLight, marginTop: 2 }}>Day {patient.day} of 90</div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.purple, background: c.purpleLight, padding: "4px 12px", borderRadius: 8 }}>
              {patient.phase}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ position: "relative", height: 10, background: c.borderLight, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${journeyPct}%`, background: "linear-gradient(90deg, #059669, #2563EB)", borderRadius: 6, transition: "width 1s ease" }} />
          </div>
          {/* Phase labels */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: c.textLight }}>
            <span style={{ color: c.green, fontWeight: 700 }}>Stabilize (1–14)</span>
            <span style={{ color: "#3B82F6", fontWeight: 700 }}>Optimize (15–60)</span>
            <span style={{ color: c.purple, fontWeight: 600 }}>Maintain (61–90)</span>
          </div>
        </div>

        {/* Vitals Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Weight — normal position when no alert */}
          {!patient.alert && (
          <div style={{ ...cardStyle, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Your Weight</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{latestWeight.weight}</span>
              <span style={{ fontSize: 13, color: c.textLight }}>lbs</span>
            </div>
            <div style={{ fontSize: 12, color: c.red, fontWeight: 600, marginTop: 4 }}>
              +{(latestWeight.weight - prevWeight.weight).toFixed(1)} lbs in 48hrs
            </div>
            <div style={{ fontSize: 11, color: c.textLight, marginTop: 6 }}>Your care team has been notified about this change.</div>
          </div>
          )}

          {/* Blood Pressure */}
          <div style={{ ...cardStyle, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Blood Pressure</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>{latestBP.sys}/{latestBP.dia}</span>
              <span style={{ fontSize: 13, color: c.textLight }}>mmHg</span>
            </div>
            <div style={{ fontSize: 12, color: c.orange, fontWeight: 600, marginTop: 4 }}>
              Slightly elevated
            </div>
            <div style={{ fontSize: 11, color: c.textLight, marginTop: 6 }}>Target: below 130/80 mmHg</div>
          </div>

          {/* Heart Rate */}
          <div style={{ ...cardStyle, padding: "18px 20px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: c.textLight, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Heart Rate</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 400, color: c.text, fontFamily: DS.fontDisplay }}>82</span>
              <span style={{ fontSize: 13, color: c.textLight }}>bpm</span>
            </div>
            <div style={{ fontSize: 12, color: c.green, fontWeight: 600, marginTop: 4 }}>
              Normal range
            </div>
          </div>

          {/* Next Check-in */}
          <div style={{ ...cardStyle, padding: "18px 20px", background: DS.color.amber[50] }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: DS.color.amber[600], textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Next Check-in</div>
            <div style={{ fontSize: 18, fontWeight: 400, color: DS.color.amber[700], fontFamily: DS.fontDisplay }}>Today</div>
            <div style={{ fontSize: 12, color: c.textMed, fontWeight: 600, marginTop: 4 }}>
              AI Concierge call scheduled
            </div>
            <div style={{ fontSize: 11, color: c.textLight, marginTop: 6 }}>Vardana will call to check on your progress.</div>
          </div>
        </div>

        {/* Talk to Vardana CTA */}
        <div style={{ ...cardStyle, padding: 0, marginBottom: 16, background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)", border: "none", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(14,165,233,0.08)" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(168,85,247,0.08)" }} />
          <div style={{ padding: "24px 28px", position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #0EA5E9, #A855F7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="sms" size={18} color="white" />
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: DS.fontDisplay }}>Have a question?</div>
            </div>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 16px", maxWidth: 340 }}>
              Talk to your Vardana AI care concierge anytime.
            </p>
            <button
              onClick={() => setShowContactModal(true)}
              style={{
                padding: "12px 28px", borderRadius: 10,
                background: "linear-gradient(135deg, #0EA5E9, #0284C7)",
                color: "white", border: "none", fontSize: 14, fontWeight: 800,
                cursor: "pointer", fontFamily: c.font,
                boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <Icon name="sms" size={16} color="white" /> Start a Check-in
            </button>
          </div>
        </div>

        {/* Medications */}
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
          <div style={sectionHead}>Your Medications</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {medications.map((med, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: c.borderLight, borderRadius: 10 }}>
                <Icon name={med.iconName} size={20} color={c.accent} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{med.name} <span style={{ fontWeight: 500, color: c.textLight }}>{med.dose}</span></div>
                  <div style={{ fontSize: 12, color: c.textLight, marginTop: 2 }}>{med.timing}</div>
                </div>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: c.greenLight, border: `1.5px solid ${c.green}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color={c.green} /></div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: "10px 14px", background: "#FEF3C7", borderRadius: 10, fontSize: 12, color: c.orange, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="alert" size={12} color={c.orange} /> Allergy: Sulfa drugs — Always remind your doctor before any new prescriptions.
          </div>
        </div>

        {/* Recent AI Check-ins */}
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 16 }}>
          <div style={sectionHead}>Recent Check-ins with Vardana AI</div>
          {[
            { date: "Yesterday, 8:00 AM", summary: "You mentioned feeling more tired and noticed some ankle swelling. Vardana connected this to a 1.1 lb weight increase and flagged it for your care team as an early sign to monitor." },
            { date: "Today, 7:45 AM", summary: "Your weight is up 2.3 lbs over 2 days — back above your discharge weight. Vardana identified this as a fluid retention pattern and notified Nurse Rachel Kim. She will call you today." },
          ].map((item, i) => (
            <div key={i} style={{ padding: "14px 16px", background: i === 1 ? c.purpleLight : c.borderLight, borderRadius: 10, marginBottom: i < 1 ? 8 : 0, border: i === 1 ? `1px solid ${c.purple}30` : "none" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: i === 1 ? c.purple : c.textLight, marginBottom: 6 }}>{item.date}</div>
              <div style={{ fontSize: 13, color: c.textMed, lineHeight: 1.6 }}>{item.summary}</div>
            </div>
          ))}
        </div>

        {/* Care Team */}
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: 24 }}>
          <div style={sectionHead}>Your Care Team</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { name: "Rachel Kim, RN", role: "Care Coordinator", initials: "RK", color: c.teal },
              { name: "Dr. James Harrington", role: "Cardiologist", initials: "JH", color: c.accent },
              { name: "Vardana AI", role: "Care Concierge", initials: "V", color: c.purple },
            ].map((member, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: c.borderLight, borderRadius: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${member.color}15`, border: `2px solid ${member.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: member.color, fontFamily: DS.fontSans }}>{member.initials}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: c.textLight }}>{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
      </div>{/* end phone frame */}
      {showContactModal && (
        <PatientContactModal
          onClose={() => setShowContactModal(false)}
          onVoice={() => { setShowContactModal(false); setView("voiceCall"); }}
          onChat={() => { setShowContactModal(false); setView("chat"); }}
        />
      )}
    </div>
  );
}

// ── App Entry (routed via main.jsx) ──
export default function App({ initialRole, navigate }) {
  const goBack = () => navigate(DEMO_BASE);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const demoParam = searchParams.get('demo');
  const patientParam = searchParams.get('patient');
  const isScriptedDemo = demoParam === 'scripted';
  const isLiveDemo = demoParam === 'live';
  const isMarcusDemo = patientParam === 'marcus';

  if (initialRole === "coordinator") return <CareCoordinatorView onSwitchRole={goBack} isScriptedDemo={isScriptedDemo} isLiveDemo={isLiveDemo} isMarcusDemo={isMarcusDemo} />;
  if (initialRole === "patient") return <PatientExperienceView onSwitchRole={goBack} />;

  // Fallback — redirect to demo page
  navigate(DEMO_BASE);
  return null;
}
