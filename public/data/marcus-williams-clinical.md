# Marcus Williams - Clinical Reference

## Demographics
- Name: Marcus Williams
- Age: 58 years old, male
- DOB: June 3, 1967
- Address: 3214 MLK Jr Way, Seattle, WA 98144
- Phone: 206-555-0287
- Primary Care: Dr. Angela Torres, Internal Medicine
- Care Coordinator: Nurse David Park
- Program: Continuous Cardiometabolic Care · Day 22 at time of scenario snapshot
- Program Start: Day 1 (22 days before the scenario "today"). Bundle dates auto-shift at load time; see public/data/marcus-williams-bundle.json `_demoAnchor`.
- ID: VRD-2026-002

## Active Conditions
| ICD-10 | Condition | Onset |
|--------|-----------|-------|
| I10 | Essential (primary) hypertension | 2018-04-12 |
| E11.65 | Type 2 diabetes mellitus with hyperglycemia | 2021-09-08 |
| E78.5 | Hyperlipidemia | 2019-02-14 |
| E66.01 | Obesity, BMI 31.4 | 2019-02-14 |

## Medications
| Medication | Dosage | Purpose |
|-----------|--------|---------|
| Lisinopril | 20mg daily AM | ACE inhibitor, HTN |
| Amlodipine | 5mg daily | Calcium channel blocker, HTN |
| Metformin | 1000mg BID with meals | T2DM glucose management |
| Atorvastatin | 40mg daily PM | Lipid management |
| Aspirin | 81mg daily | Cardiovascular risk reduction |

## Allergy
- Penicillin (rash)

## Clinical Story: 22-Day BP + Glucose Series
Marcus was doing well for the first 2 weeks. BP was trending toward target (<130/80). Then starting Day 18 his morning BP began rising. He ran out of Lisinopril on Day 19 and did not refill for 3 days. By Day 22 (today) BP is 158/98, a sustained 4-day worsening trend. His fasting glucose has also been elevated, suggesting stress response and dietary drift. He has a mild headache this morning.

## Vital Signs Series
Dates are relative to the scenario "today" (Day 22). In the fixture bundle,
Day 22 is anchored to the `_demoAnchor` date and shifted forward at load
time so "today" always matches real wall-clock today.

| Day | BP Morning (mmHg) | Fasting Glucose (mg/dL) | Note |
|-----|-------------------|------------------------|------|
| 1 | 148/94 | 182 | Baseline, elevated at program start |
| 3 | 145/91 | 175 | Improving on meds |
| 5 | 142/88 | 168 | Improving |
| 7 | 138/86 | 162 | Trending toward target |
| 10 | 134/84 | 155 | Approaching target |
| 12 | 131/82 | 148 | Near target |
| 14 | 129/80 | 144 | Best reading, near BP target |
| 16 | 130/81 | 146 | Holding |
| 17 | 132/83 | 149 | Slight uptick |
| 18 | 136/87 | 158 | First concerning rise |
| 19 | 141/90 | 166 | Missed Lisinopril refill |
| 20 | 148/94 | 172 | Back to baseline, no meds |
| 21 | 154/96 | 178 | Worsening |
| 22 | 158/98 | 186 | TODAY: TRIGGER, 4-day rise + symptoms |

## Lab Results (Program Start, Day 1)
| Test | Value | Reference | Note |
|------|-------|-----------|------|
| HbA1c | 8.4% | <7% | Above target |
| Fasting Glucose | 182 mg/dL | 70-100 | Elevated |
| LDL | 118 mg/dL | <100 | Above target on statin |
| Creatinine | 1.1 mg/dL | 0.7-1.2 | Normal |
| eGFR | 72 mL/min | >60 | Normal |
| Potassium | 4.0 mEq/L | 3.5-5.0 | Normal |
| Microalbumin/Cr | 42 mg/g | <30 | Mildly elevated, early nephropathy |

## Risk Score Arc
- Starting: 53 (High Risk, orange)
- After headache report: 68
- After confirming missed meds 3 days: 73
- Alert threshold: 70+ (P2 Alert, Coordinator notification)

## CarePlan
- Continuous Cardiometabolic Care
- Period: Day 1 onward (quarterly review milestones at Q1 +90d, Q2 +180d, Q3 +270d)
- Activities:
  1. Daily morning BP monitoring
  2. Twice-daily glucose monitoring
  3. Weekly coordinator check-in call
