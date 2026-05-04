import { useState } from "react";
import axios from "axios";

const API = "http://127.0.0.1:8000";

function statusBadge(s) {
  const styles = {
    OPEN:          { background: "rgba(255,80,100,0.15)",  color: "#ff8090", border: "1px solid rgba(255,80,100,0.25)" },
    INVESTIGATING: { background: "rgba(255,190,50,0.13)",  color: "#ffd47a", border: "1px solid rgba(255,190,50,0.25)" },
    RESOLVED:      { background: "rgba(0,220,160,0.12)",   color: "#00dca0", border: "1px solid rgba(0,220,160,0.25)" },
    CLOSED:        { background: "rgba(100,160,255,0.12)", color: "#90c0ff", border: "1px solid rgba(100,160,255,0.22)" },
  };
  return (
    <span style={{ padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 500, ...styles[s] }}>
      {s}
    </span>
  );
}

function SevDots({ sev }) {
  const levels = { P1: 4, P2: 3, P3: 2, P4: 1, CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const n = levels[String(sev).toUpperCase()] || 1;
  const colors = ["#00dca0", "#ffd44a", "#ff9830", "#ff5060"];
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          width: 8, height: 8, borderRadius: "50%",
          background: i < n ? colors[n - 1] : "rgba(255,255,255,0.1)"
        }} />
      ))}
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginLeft: 5 }}>{sev}</span>
    </div>
  );
}

export default function App() {
  const [incident, setIncident] = useState(null);
  const [incidentId, setIncidentId] = useState(1);
  const [error, setError] = useState("");
  const [log, setLog] = useState([]);
  const [rca, setRca] = useState({
    root_cause_category: "",
    fix_applied: "",
    prevention_steps: "",
  });

  const addLog = (msg) => {
    const t = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLog(prev => [`${t}  ${msg}`, ...prev].slice(0, 5));
  };

  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 4000);
  };

  const createIncident = async () => {
    try {
      const res = await axios.post(`${API}/signals`, {
        component_id: "FRONTEND",
        severity: "P1",
        message: "UI triggered incident",
      });
      const id = res.data.incident_id;

      setIncidentId(id);
      addLog(`Created incident #${id}`);

    // AUTO LOAD (important UX fix)
      const data = await axios.get(`${API}/incidents/${id}`);
      setIncident(data.data);

    } catch {
      showError("Failed to create incident");
    }
  };

  const fetchIncident = async () => {
    try {
      const res = await axios.get(`${API}/incidents/${incidentId}`);
      setIncident(res.data);
      addLog(`Loaded incident #${res.data.id}`);
    } catch {
      showError("Failed to fetch incident");
      setIncident(null);
    }
  };

  const updateStatus = async (status) => {
    try {
      await axios.put(`${API}/incidents/${incidentId}/status`, null, { params: { status } });
      addLog(`Status → ${status}`);
      fetchIncident();
    } catch {
      showError("Status update failed");
    }
  };

  const submitRCA = async () => {
    try {
      await axios.post(`${API}/incidents/${incidentId}/rca`, null, { params: rca });
      addLog("RCA submitted");
      setRca({ root_cause_category: "", fix_applied: "", prevention_steps: "" });
      fetchIncident();
    } catch {
      showError("RCA submission failed");
    }
  };

  return (
    <div style={s.root}>
      {/* Background orbs */}
      <div style={s.orb1} />
      <div style={s.orb2} />
      <div style={s.orb3} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.28); }
        input:focus, textarea:focus { outline: none; border-color: rgba(130,80,255,0.6) !important; background: rgba(255,255,255,0.14) !important; }
        button:hover { opacity: 0.85; }
        button:active { transform: scale(0.97); }
      `}</style>

      <div style={s.content}>

        {/* Header */}
        <div style={{ ...s.glass, ...s.header }}>
          <div>
            <div style={s.title}>IMS Dashboard</div>
            <div style={s.titleSub}>Real-time Incident Monitoring</div>
          </div>
          <div style={s.livePill}>
            <div style={s.liveDot} />
            Live
          </div>
        </div>

        {/* Error */}
        {error && <div style={s.errorBox}>{error}</div>}

        {/* Lookup + Create */}
        <div style={{ ...s.glass, ...s.panel }}>
          <div style={s.panelTitle}>Incident Lookup</div>
          <div style={s.idRow}>
            <input
              type="number"
              value={incidentId}
              onChange={e => setIncidentId(e.target.value)}
              style={{ ...s.input, width: 90, flexShrink: 0 }}
            />
            <button style={{ ...s.btn, ...s.btnPrimary }} onClick={fetchIncident}>Load</button>
            <button style={{ ...s.btn, ...s.btnResolve }} onClick={createIncident}>+ New</button>
          </div>
        </div>

        {/* Incident Details */}
        {incident && (
          <div style={{ ...s.glass, ...s.panel }}>
            <div style={s.panelTitle}>Incident Details</div>

            {[
              ["ID",        `#${incident.id}`],
              ["Component", incident.component_id],
              ["Status",    statusBadge(incident.status)],
              ["Severity",  <SevDots sev={incident.severity} />],
              ["MTTR",      incident.mttr_seconds ? `${incident.mttr_seconds}s` : "N/A"],
            ].map(([k, v]) => (
              <div key={k} style={s.fieldRow}>
                <span style={s.fieldKey}>{k}</span>
                <span style={s.fieldVal}>{v}</span>
              </div>
            ))}

            <div style={s.actionRow}>
              <button style={{ ...s.btn, ...s.btnInvestigate }} onClick={() => updateStatus("INVESTIGATING")}>Investigate</button>
              <button style={{ ...s.btn, ...s.btnResolve }}     onClick={() => updateStatus("RESOLVED")}>Resolve</button>
              <button style={{ ...s.btn, ...s.btnClose }}       onClick={() => updateStatus("CLOSED")}>Close</button>
            </div>
          </div>
        )}

        {/* RCA */}
        <div style={{ ...s.glass, ...s.panel }}>
          <div style={s.panelTitle}>Root Cause Analysis</div>

          <div style={s.rcaLabel}>Root Cause Category</div>
          <input
            placeholder="e.g. Infrastructure, Code, Human"
            value={rca.root_cause_category}
            style={{ ...s.input, marginBottom: 14 }}
            onChange={e => setRca({ ...rca, root_cause_category: e.target.value })}
          />

          <div style={s.rcaLabel}>Fix Applied</div>
          <textarea
            placeholder="Describe the fix..."
            value={rca.fix_applied}
            style={{ ...s.input, minHeight: 70, resize: "vertical", fontSize: 13, marginBottom: 14 }}
            onChange={e => setRca({ ...rca, fix_applied: e.target.value })}
          />

          <div style={s.rcaLabel}>Prevention Steps</div>
          <textarea
            placeholder="How to prevent recurrence..."
            value={rca.prevention_steps}
            style={{ ...s.input, minHeight: 70, resize: "vertical", fontSize: 13, marginBottom: 14 }}
            onChange={e => setRca({ ...rca, prevention_steps: e.target.value })}
          />

          <button style={{ ...s.btn, ...s.btnPrimary }} onClick={submitRCA}>Submit RCA</button>
        </div>

        {/* Logs */}
        {log.length > 0 && (
          <div style={{ ...s.glass, ...s.panel }}>
            <div style={s.panelTitle}>Activity Log</div>
            {log.map((l, i) => (
              <div key={i} style={s.logEntry}>{l}</div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

const s = {
  root: {
    fontFamily: "'DM Sans', sans-serif",
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1a1040 0%, #0d1b3e 40%, #0a2a2a 100%)",
    padding: "32px 24px",
    position: "relative",
    overflow: "hidden",
  },
  orb1: {
    position: "fixed", width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(130,80,255,0.35) 0%, transparent 70%)",
    top: -130, left: -90, pointerEvents: "none",
  },
  orb2: {
    position: "fixed", width: 340, height: 340, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(0,200,180,0.25) 0%, transparent 70%)",
    bottom: -90, right: -70, pointerEvents: "none",
  },
  orb3: {
    position: "fixed", width: 240, height: 240, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(60,120,255,0.2) 0%, transparent 70%)",
    top: "50%", right: "15%", pointerEvents: "none",
  },
  content: {
    position: "relative", zIndex: 2,
    maxWidth: 620, margin: "0 auto",
  },
  glass: {
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 20,
    boxShadow: "0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)",
  },
  header: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px", marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 600, color: "#fff", letterSpacing: -0.5 },
  titleSub: { fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  livePill: {
    display: "flex", alignItems: "center", gap: 7,
    background: "rgba(0,220,160,0.12)", border: "1px solid rgba(0,220,160,0.25)",
    borderRadius: 20, padding: "6px 14px", fontSize: 11, color: "#00dca0", fontWeight: 500,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: "50%", background: "#00dca0",
    animation: "blink 1.8s ease-in-out infinite",
  },
  panel: { padding: "22px 24px", marginBottom: 16 },
  panelTitle: {
    fontSize: 10, fontWeight: 600, letterSpacing: "0.18em",
    textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16,
  },
  idRow: { display: "flex", gap: 10, alignItems: "center" },
  input: {
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 12,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    padding: "10px 14px",
    width: "100%",
    transition: "border-color 0.2s, background 0.2s",
  },
  fieldRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", fontSize: 13,
  },
  fieldKey: { color: "rgba(255,255,255,0.38)", fontSize: 12 },
  fieldVal: { color: "rgba(255,255,255,0.9)", fontFamily: "'DM Mono', monospace", fontSize: 12 },
  actionRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
  btn: {
    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
    padding: "10px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.15)",
    cursor: "pointer", transition: "all 0.18s", whiteSpace: "nowrap",
  },
  btnPrimary:     { background: "rgba(130,80,255,0.25)",  borderColor: "rgba(130,80,255,0.45)",  color: "#c4a8ff" },
  btnInvestigate: { background: "rgba(255,190,50,0.12)",  borderColor: "rgba(255,190,50,0.3)",   color: "#ffd67a" },
  btnResolve:     { background: "rgba(0,220,160,0.12)",   borderColor: "rgba(0,220,160,0.3)",    color: "#00dca0" },
  btnClose:       { background: "rgba(100,160,255,0.12)", borderColor: "rgba(100,160,255,0.28)", color: "#90c0ff" },
  errorBox: {
    background: "rgba(255,80,100,0.1)", border: "1px solid rgba(255,80,100,0.25)",
    borderRadius: 12, padding: "10px 16px", fontSize: 12, color: "#ff8090", marginBottom: 16,
  },
  rcaLabel: {
    fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 500,
    letterSpacing: "0.08em", marginBottom: 6,
  },
  logEntry: {
    fontSize: 11, color: "rgba(255,255,255,0.3)",
    padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    fontFamily: "'DM Mono', monospace",
  },
};