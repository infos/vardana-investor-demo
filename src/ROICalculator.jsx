import { useState, useMemo } from "react";

const fmt = (n, decimals = 0) =>
  n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
const fmtDollar = (n) => {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${fmt(n)}`;
};

function Slider({ label, hint, value, min, max, step, display, onChange }) {
  return (
    <div style={{ padding: "14px 0 16px", borderBottom: "1px solid #e6eaf2" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 8, alignItems: "baseline" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#2563eb", whiteSpace: "nowrap" }}>{display}</span>
      </div>
      <p style={{ color: "#667085", fontSize: 12, lineHeight: 1.4, margin: "0 0 10px" }}>{hint}</p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#2563eb", cursor: "pointer" }}
      />
    </div>
  );
}

function MetricCard({ kicker, big, bigColor, desc }) {
  return (
    <div style={{
      background: "#fbfcfe",
      border: "1px solid #e6eaf2",
      borderRadius: 18,
      padding: 18,
    }}>
      <div style={{ color: "#667085", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {kicker}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em", color: bigColor ?? "#162033" }}>
        {big}
      </div>
      <div style={{ marginTop: 8, color: "#667085", fontSize: 13, lineHeight: 1.45 }}>
        {desc}
      </div>
    </div>
  );
}

export default function ROICalculator() {
  const [patients, setPatients] = useState(500);
  const [readmitRate, setReadmitRate] = useState(22);
  const [readmitCost, setReadmitCost] = useState(15000);
  const [reductionPct, setReductionPct] = useState(35);
  const [erVisits, setErVisits] = useState(120);
  const [erCost, setErCost] = useState(2800);
  const [erReductionPct, setErReductionPct] = useState(40);
  const [pmpm, setPmpm] = useState(35);

  const programmCost = patients * pmpm * 12;

  const metrics = useMemo(() => {
    const baseReadmits = patients * (readmitRate / 100);
    const readmitsSaved = baseReadmits * (reductionPct / 100);
    const readmitSavings = readmitsSaved * readmitCost;
    const erSaved = erVisits * (erReductionPct / 100);
    const erSavings = erSaved * erCost;
    const programCost = patients * pmpm * 12;
    const totalSavings = readmitSavings + erSavings;
    const netSavings = totalSavings - programCost;
    const roi = programCost > 0 ? (netSavings / programCost) * 100 : 0;
    const paybackMonths = totalSavings > 0 ? (programCost / (totalSavings / 12)) : Infinity;
    return {
      baseReadmits,
      readmitsSaved,
      readmitSavings,
      erSaved,
      erSavings,
      totalSavings,
      netSavings,
      roi,
      paybackMonths,
    };
  }, [patients, readmitRate, readmitCost, reductionPct, erVisits, erCost, erReductionPct, pmpm]);

  const tableRows = [
    {
      category: "30-Day Readmissions Prevented",
      baseline: `${fmt(Math.round(metrics.baseReadmits))} readmits/yr`,
      impact: `${fmt(Math.round(metrics.readmitsSaved))} prevented`,
      savings: fmtDollar(metrics.readmitSavings),
    },
    {
      category: "ED/ER Visits Avoided",
      baseline: `${fmt(erVisits)} visits/yr`,
      impact: `${fmt(Math.round(metrics.erSaved))} avoided`,
      savings: fmtDollar(metrics.erSavings),
    },
    {
      category: `Program Cost ($${pmpm} PMPM)`,
      baseline: `$${pmpm} × ${fmt(patients)} pts × 12 mo`,
      impact: "—",
      savings: `–${fmtDollar(programmCost)}`,
    },
    {
      category: "NET ROI",
      baseline: "—",
      impact: "—",
      savings: fmtDollar(metrics.netSavings),
    },
  ];

  const paybackText =
    metrics.paybackMonths === Infinity
      ? "N/A"
      : metrics.paybackMonths < 1
      ? `< 1 month`
      : `${metrics.paybackMonths.toFixed(1)} months`;

  return (
    <div style={{
      fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, sans-serif",
      background: "linear-gradient(180deg, #f8fbff 0%, #f5f7fb 100%)",
      color: "#162033",
      minHeight: "100vh",
      margin: 0,
    }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 24px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <h1 style={{ margin: "0 0 8px", fontSize: 34, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 800 }}>
              Vardana CHF ROI Calculator
            </h1>
          </div>
          <p style={{ color: "#667085", fontSize: 16, maxWidth: 880, lineHeight: 1.5, margin: 0 }}>
            Estimate the financial impact of Vardana's remote cardiac monitoring program on hospital readmissions,
            emergency visits, and overall cost of care for your CHF patient population.
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "clamp(320px, 36%, 420px) 1fr",
          gap: 22,
          alignItems: "start",
        }}
          className="calc-grid"
        >
          {/* ── LEFT: Controls ── */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e6eaf2",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: 20,
            position: "sticky",
            top: 20,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#667085", margin: "4px 0 14px" }}>
              Patient Population
            </div>
            <Slider
              label="Annual CHF Patients"
              hint="Total number of CHF patients discharged from your facility each year."
              value={patients}
              min={50}
              max={5000}
              step={50}
              display={fmt(patients)}
              onChange={setPatients}
            />
            <Slider
              label="Baseline 30-Day Readmission Rate"
              hint="Your current unadjusted 30-day readmission rate. US average is ~22%."
              value={readmitRate}
              min={5}
              max={45}
              step={1}
              display={`${readmitRate}%`}
              onChange={setReadmitRate}
            />
            <Slider
              label="Average Readmission Cost"
              hint="All-in cost per CHF readmission episode (direct + indirect). National average ~$15,000."
              value={readmitCost}
              min={5000}
              max={40000}
              step={500}
              display={`$${fmt(readmitCost)}`}
              onChange={setReadmitCost}
            />

            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#667085", margin: "18px 0 4px" }}>
              Vardana Program Impact
            </div>
            <Slider
              label="Readmission Reduction"
              hint="Clinical evidence supports 28–42% reduction with RPM. Default 35% is conservative."
              value={reductionPct}
              min={10}
              max={60}
              step={1}
              display={`${reductionPct}%`}
              onChange={setReductionPct}
            />
            <Slider
              label="Annual ED/ER Visits (CHF)"
              hint="Number of emergency visits per year from your CHF population."
              value={erVisits}
              min={0}
              max={1000}
              step={10}
              display={fmt(erVisits)}
              onChange={setErVisits}
            />
            <Slider
              label="Average ED Visit Cost"
              hint="Average cost per emergency visit (facility + physician). Typical range: $1,500–$5,000."
              value={erCost}
              min={500}
              max={8000}
              step={100}
              display={`$${fmt(erCost)}`}
              onChange={setErCost}
            />
            <Slider
              label="ED Visit Reduction"
              hint="RPM programs typically reduce CHF-related ED visits by 30–50%."
              value={erReductionPct}
              min={10}
              max={70}
              step={1}
              display={`${erReductionPct}%`}
              onChange={setErReductionPct}
            />

            <div style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#667085", margin: "18px 0 4px" }}>
              Program Pricing
            </div>
            <Slider
              label="Vardana Rate"
              hint={`Per member per month. Annual program cost = $${pmpm} × ${fmt(patients)} patients × 12 months = ${fmtDollar(programmCost)}.`}
              value={pmpm}
              min={20}
              max={50}
              step={1}
              display={`$${pmpm} PMPM`}
              onChange={setPmpm}
            />
          </div>

          {/* ── RIGHT: Results ── */}
          <div style={{
            background: "#ffffff",
            border: "1px solid #e6eaf2",
            borderRadius: 20,
            boxShadow: "0 10px 30px rgba(15,23,42,0.08)",
            padding: 20,
          }}>
            {/* Metric cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
              className="metrics-grid"
            >
              <MetricCard
                kicker="Annual Net Savings"
                big={fmtDollar(metrics.netSavings)}
                bigColor={metrics.netSavings >= 0 ? "#0f9f6e" : "#b45309"}
                desc="Total financial benefit minus program cost"
              />
              <MetricCard
                kicker="Program ROI"
                big={`${Math.round(metrics.roi)}%`}
                bigColor={metrics.roi >= 0 ? "#0f9f6e" : "#b45309"}
                desc="Return on investment over 12 months"
              />
              <MetricCard
                kicker="Payback Period"
                big={paybackText}
                bigColor="#162033"
                desc="Time to recover the full program cost"
              />
            </div>

            {/* Split: table + story */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.1fr 0.9fr",
              gap: 16,
            }}
              className="split-grid"
            >
              {/* Savings breakdown table */}
              <div style={{ border: "1px solid #e6eaf2", borderRadius: 18, background: "#fff", padding: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>Savings Breakdown</h3>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "11px 8px", borderBottom: "1px solid #e6eaf2", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085" }}>Category</th>
                      <th style={{ padding: "11px 8px", borderBottom: "1px solid #e6eaf2", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085" }}>Baseline</th>
                      <th style={{ padding: "11px 8px", borderBottom: "1px solid #e6eaf2", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085" }}>Impact</th>
                      <th style={{ padding: "11px 8px", borderBottom: "1px solid #e6eaf2", textAlign: "left", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#667085" }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i}>
                        <td style={{
                          padding: "11px 8px",
                          borderBottom: i < tableRows.length - 1 ? "1px solid #e6eaf2" : "none",
                          fontWeight: row.category === "NET ROI" ? 700 : 400,
                          verticalAlign: "top",
                        }}>
                          {row.category}
                        </td>
                        <td style={{
                          padding: "11px 8px",
                          borderBottom: i < tableRows.length - 1 ? "1px solid #e6eaf2" : "none",
                          color: "#667085",
                          verticalAlign: "top",
                        }}>
                          {row.baseline}
                        </td>
                        <td style={{
                          padding: "11px 8px",
                          borderBottom: i < tableRows.length - 1 ? "1px solid #e6eaf2" : "none",
                          color: "#667085",
                          verticalAlign: "top",
                        }}>
                          {row.impact}
                        </td>
                        <td style={{
                          padding: "11px 8px",
                          borderBottom: i < tableRows.length - 1 ? "1px solid #e6eaf2" : "none",
                          fontWeight: row.category === "NET ROI" ? 700 : 400,
                          color: row.category === "NET ROI"
                            ? metrics.netSavings >= 0 ? "#0f9f6e" : "#b45309"
                            : row.savings.startsWith("–") ? "#b45309" : "#162033",
                          verticalAlign: "top",
                          whiteSpace: "nowrap",
                        }}>
                          {row.savings}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Narrative */}
              <div style={{ border: "1px solid #e6eaf2", borderRadius: 18, background: "#fff", padding: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>The Story</h3>
                <p style={{ margin: "0 0 10px", color: "#162033", lineHeight: 1.6, fontSize: 14 }}>
                  With <strong>{fmt(patients)} CHF patients</strong> and a{" "}
                  <strong>{readmitRate}%</strong> readmission rate, your facility currently manages{" "}
                  <strong>~{fmt(Math.round(metrics.baseReadmits))} readmissions per year</strong>.
                </p>
                <p style={{ margin: "0 0 10px", color: "#162033", lineHeight: 1.6, fontSize: 14 }}>
                  Vardana's remote monitoring platform is projected to reduce that by{" "}
                  <strong>{reductionPct}%</strong>, preventing{" "}
                  <strong>{fmt(Math.round(metrics.readmitsSaved))} hospitalizations</strong> and
                  saving <strong>{fmtDollar(metrics.readmitSavings)}</strong> annually in readmission costs alone.
                </p>
                <p style={{ margin: "0 0 10px", color: "#162033", lineHeight: 1.6, fontSize: 14 }}>
                  An additional <strong>{fmt(Math.round(metrics.erSaved))} ED visits</strong> are
                  avoided, adding <strong>{fmtDollar(metrics.erSavings)}</strong> in emergency cost
                  savings.
                </p>
                <p style={{ margin: "0 0 10px", color: "#162033", lineHeight: 1.6, fontSize: 14 }}>
                  At Vardana's rate of <strong>${pmpm} PMPM</strong>, the annual program cost is{" "}
                  <strong>{fmtDollar(programmCost)}</strong> ({fmt(patients)} patients × ${pmpm} × 12 months).
                  After this cost, the net annual benefit is{" "}
                  <strong style={{ color: metrics.netSavings >= 0 ? "#0f9f6e" : "#b45309" }}>
                    {fmtDollar(metrics.netSavings)}
                  </strong>
                  {metrics.paybackMonths !== Infinity && ` with a payback period of ${paybackText}`}.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
                  <span style={{ background: "#dbeafe", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                    {fmt(Math.round(metrics.readmitsSaved))} Readmissions Prevented
                  </span>
                  <span style={{ background: "#dbeafe", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                    {fmt(Math.round(metrics.erSaved))} ED Visits Avoided
                  </span>
                  <span style={{ background: "#dbeafe", color: "#2563eb", borderRadius: 999, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>
                    {Math.round(metrics.roi)}% ROI
                  </span>
                </div>
                <p style={{ marginTop: 16, color: "#667085", fontSize: 12, lineHeight: 1.5 }}>
                  Estimates based on published CHF RPM literature and CMS cost benchmarks.
                  Actual results will vary by patient population and program implementation.
                  Not a guarantee of specific financial outcomes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @media (max-width: 980px) {
          .calc-grid { grid-template-columns: 1fr !important; }
          .metrics-grid { grid-template-columns: 1fr !important; }
          .split-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 980px) {
          div[style*="position: sticky"] { position: static !important; }
        }
      `}</style>
    </div>
  );
}
