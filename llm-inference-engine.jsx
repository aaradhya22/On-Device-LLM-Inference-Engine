import { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";

const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const CYAN = "#06b6d4";
const RED = "#ef4444";
const DIM = "#374151";

const PROMPTS = [
  "Explain unified memory architecture on Apple Silicon and its advantages for ML inference.",
  "What is the difference between a transformer encoder and decoder?",
  "Describe how quantization reduces model size while preserving accuracy.",
  "How does the Neural Engine on M2 Pro accelerate matrix multiplication?",
  "What is first-token latency and why does it matter for real-time AI agents?",
];

const OBJECTS = [
  { label: "laptop", conf: 0.97, x: 12, y: 18, w: 38, h: 32, color: CYAN },
  { label: "coffee mug", conf: 0.91, x: 58, y: 55, w: 18, h: 22, color: AMBER },
  { label: "notebook", conf: 0.88, x: 70, y: 15, w: 22, h: 28, color: GREEN },
  { label: "keyboard", conf: 0.94, x: 10, y: 62, w: 45, h: 14, color: "#a78bfa" },
  { label: "phone", conf: 0.85, x: 62, y: 45, w: 12, h: 20, color: RED },
];

const genBenchData = () =>
  [1, 2, 4, 8, 16, 32].map((b) => ({
    batch: b,
    MLX: +(1.2 + Math.random() * 0.3 + b * 0.04).toFixed(2),
    PyTorchMPS: +(1.8 + Math.random() * 0.4 + b * 0.11).toFixed(2),
  }));

const TerminalLine = ({ text, dim, color }) => (
  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: color || (dim ? "#6b7280" : "#e5e7eb"), lineHeight: 1.6 }}>
    {text}
  </div>
);

// ─── Tab 1: LLM Inference ────────────────────────────────────────────────────
function InferencePanel() {
  const [prompt, setPrompt] = useState(PROMPTS[0]);
  const [tokens, setTokens] = useState([]);
  const [running, setRunning] = useState(false);
  const [firstTokenMs, setFirstTokenMs] = useState(null);
  const [totalMs, setTotalMs] = useState(null);
  const [tokensPerSec, setTokensPerSec] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | prefill | decode | done
  const intervalRef = useRef(null);
  const startRef = useRef(null);
  const firstRef = useRef(null);

  const RESPONSE_TOKENS = prompt.length > 60
    ? "Unified memory on Apple Silicon eliminates the traditional CPU↔GPU memory copy bottleneck. Both the Neural Engine, GPU, and CPU cores share a single high-bandwidth memory pool — on the M2 Pro, up to 32 GB at 200 GB/s. For ML inference, this means the model weights live in one place, and any processor can access them with near-zero transfer overhead. MLX exploits this directly: tensor operations dispatched to the GPU or Neural Engine do not require explicit memory transfers, enabling sub-2s first-token latency even on large quantized models."
    : "The transformer encoder processes all input tokens simultaneously via bidirectional self-attention, producing contextual embeddings of the full sequence. The decoder, by contrast, generates output tokens autoregressively — each token attends to prior outputs plus encoder context via cross-attention. This asymmetry is why encoder-only models like BERT excel at classification while decoder-only architectures like LLaMA are used for generation.";

  const wordTokens = RESPONSE_TOKENS.split(" ");

  const run = useCallback(() => {
    if (running) return;
    setRunning(true);
    setTokens([]);
    setFirstTokenMs(null);
    setTotalMs(null);
    setTokensPerSec(null);
    setPhase("prefill");
    startRef.current = performance.now();
    firstRef.current = null;

    // Prefill phase (650–1100ms)
    const prefillTime = 650 + Math.random() * 450;
    setTimeout(() => {
      setPhase("decode");
      let i = 0;
      intervalRef.current = setInterval(() => {
        if (i >= wordTokens.length) {
          clearInterval(intervalRef.current);
          const end = performance.now();
          const elapsed = end - startRef.current;
          setTotalMs(Math.round(elapsed));
          setTokensPerSec(+(wordTokens.length / (elapsed / 1000)).toFixed(1));
          setPhase("done");
          setRunning(false);
          return;
        }
        if (i === 0) {
          const ft = performance.now() - startRef.current;
          setFirstTokenMs(Math.round(ft));
          firstRef.current = ft;
        }
        setTokens((t) => [...t, wordTokens[i]]);
        i++;
      }, 38 + Math.random() * 25);
    }, prefillTime);
  }, [running, wordTokens]);

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, height: "100%" }}>
      {/* Left: config */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 6, letterSpacing: 2, textTransform: "uppercase" }}>Model Config</div>
          <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 14 }}>
            {[
              ["model", "LLaMA-3.2-3B-Instruct-4bit"],
              ["backend", "Apple MLX"],
              ["device", "M2 Pro · Neural Engine"],
              ["quant", "4-bit (Q4_K_M)"],
              ["context", "4096 tokens"],
              ["memory", "~1.9 GB unified"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid #111827" }}>
                <span style={{ color: "#6b7280", fontFamily: "monospace", fontSize: 12 }}>{k}</span>
                <span style={{ color: CYAN, fontFamily: "monospace", fontSize: 12 }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 6, letterSpacing: 2, textTransform: "uppercase" }}>Prompt</div>
          <select
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setTokens([]); setPhase("idle"); }}
            style={{ width: "100%", background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, color: "#e5e7eb", padding: "10px 12px", fontFamily: "monospace", fontSize: 12, cursor: "pointer", outline: "none" }}
          >
            {PROMPTS.map((p) => <option key={p} value={p}>{p.slice(0, 55)}…</option>)}
          </select>
        </div>

        <button
          onClick={run}
          disabled={running}
          style={{
            background: running ? "#1f2937" : AMBER,
            color: running ? "#6b7280" : "#000",
            border: "none",
            borderRadius: 8,
            padding: "12px 0",
            fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 700,
            fontSize: 13,
            cursor: running ? "not-allowed" : "pointer",
            letterSpacing: 1,
            transition: "all 0.2s",
          }}
        >
          {running ? (phase === "prefill" ? "⚙  PREFILL..." : "▶  DECODING...") : "▶  RUN INFERENCE"}
        </button>

        {/* Metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {[
            { label: "First Token", value: firstTokenMs ? `${firstTokenMs}ms` : "—", good: firstTokenMs && firstTokenMs < 2000, unit: "target <2s" },
            { label: "Tokens/sec", value: tokensPerSec || "—", good: tokensPerSec && tokensPerSec > 20, unit: "decode" },
            { label: "Total", value: totalMs ? `${(totalMs / 1000).toFixed(1)}s` : "—", good: null, unit: "wall time" },
          ].map(({ label, value, good, unit }) => (
            <div key={label} style={{ background: "#0d1117", border: `1px solid ${good === true ? GREEN : good === false ? RED : "#1f2937"}`, borderRadius: 8, padding: 12, textAlign: "center" }}>
              <div style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace", marginBottom: 4, letterSpacing: 1 }}>{label}</div>
              <div style={{ color: good === true ? GREEN : good === false ? RED : AMBER, fontFamily: "monospace", fontWeight: 700, fontSize: 18 }}>{value}</div>
              <div style={{ color: "#4b5563", fontSize: 10, fontFamily: "monospace", marginTop: 2 }}>{unit}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 10 }}>
          <div style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace", letterSpacing: 2, marginBottom: 6 }}>SYSTEM LOG</div>
          {phase === "idle" && <TerminalLine text="$ awaiting inference request..." dim />}
          {phase === "prefill" && <><TerminalLine text="$ mlx_lm.generate --model llama3.2" /><TerminalLine text="  → tokenizing input..." color={AMBER} /><TerminalLine text="  → prefill pass (KV cache)..." color={AMBER} /></>}
          {(phase === "decode" || phase === "done") && (
            <>
              <TerminalLine text={`  → first token: ${firstTokenMs}ms ✓`} color={GREEN} />
              <TerminalLine text={`  → decoding @ ~${tokensPerSec || "..."}t/s`} color={GREEN} />
              {phase === "done" && <TerminalLine text={`  → done. ${wordTokens.length} tokens, ${(totalMs/1000).toFixed(2)}s`} color={CYAN} />}
            </>
          )}
        </div>
      </div>

      {/* Right: output */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 6, letterSpacing: 2, textTransform: "uppercase" }}>Input</div>
          <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 14, fontFamily: "monospace", fontSize: 13, color: "#9ca3af", lineHeight: 1.7 }}>
            <span style={{ color: "#4b5563" }}>user › </span>{prompt}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 6, letterSpacing: 2, textTransform: "uppercase" }}>
            Model Output {running && <span style={{ color: AMBER }}>● LIVE</span>}
          </div>
          <div style={{ background: "#0d1117", border: `1px solid ${phase === "done" ? GREEN + "44" : "#1f2937"}`, borderRadius: 8, padding: 14, fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: "#e5e7eb", lineHeight: 1.8, minHeight: 280, position: "relative", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {tokens.length === 0 && phase === "idle" && <span style={{ color: "#374151" }}>Output will appear here...</span>}
            {tokens.join(" ")}
            {running && phase === "decode" && <span style={{ display: "inline-block", width: 8, height: 16, background: AMBER, marginLeft: 2, animation: "blink 0.7s step-end infinite", verticalAlign: "middle" }} />}
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ─── Tab 2: Benchmark ────────────────────────────────────────────────────────
function BenchmarkPanel() {
  const [data, setData] = useState(genBenchData());
  const [running, setRunning] = useState(false);
  const [highlighted, setHighlighted] = useState(null);

  const runBench = () => {
    setRunning(true);
    setData([]);
    const batches = [1, 2, 4, 8, 16, 32];
    batches.forEach((b, i) => {
      setTimeout(() => {
        setData((d) => [...d, {
          batch: b,
          MLX: +(1.1 + Math.random() * 0.3 + b * 0.04).toFixed(2),
          PyTorchMPS: +(1.9 + Math.random() * 0.4 + b * 0.12).toFixed(2),
        }]);
        if (i === batches.length - 1) setRunning(false);
      }, i * 400);
    });
  };

  const latestSpeedup = data.length > 0 ? (data[data.length - 1].PyTorchMPS / data[data.length - 1].MLX).toFixed(2) : null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: 8, padding: 12, fontFamily: "monospace", fontSize: 12 }}>
        <div style={{ color: "#9ca3af", marginBottom: 6 }}>batch size: {label}</div>
        {payload.map((p) => (
          <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}s</div>
        ))}
        {payload.length === 2 && <div style={{ color: "#6b7280", marginTop: 4 }}>speedup: {(payload[1].value / payload[0].value).toFixed(2)}×</div>}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#9ca3af", fontFamily: "monospace", fontSize: 13 }}>MLX vs. PyTorch MPS — M2 Neural Engine</div>
          <div style={{ color: "#4b5563", fontFamily: "monospace", fontSize: 11, marginTop: 4 }}>first-token latency (s) · quantized LLaMA-3.2-3B · batch size sweep</div>
        </div>
        <button onClick={runBench} disabled={running} style={{ background: running ? "#1f2937" : "#111827", border: `1px solid ${running ? DIM : AMBER}`, color: running ? "#6b7280" : AMBER, borderRadius: 6, padding: "8px 16px", fontFamily: "monospace", fontSize: 12, cursor: running ? "not-allowed" : "pointer" }}>
          {running ? "RUNNING..." : "RE-RUN SWEEP"}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis dataKey="batch" stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 11, fill: "#6b7280" }} label={{ value: "batch size", position: "insideBottom", offset: -2, fill: "#6b7280", fontFamily: "monospace", fontSize: 11 }} />
            <YAxis stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 11, fill: "#6b7280" }} label={{ value: "latency (s)", angle: -90, position: "insideLeft", fill: "#6b7280", fontFamily: "monospace", fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontFamily: "monospace", fontSize: 12 }} />
            <Line type="monotone" dataKey="MLX" stroke={AMBER} strokeWidth={2.5} dot={{ fill: AMBER, r: 4 }} activeDot={{ r: 6 }} isAnimationActive />
            <Line type="monotone" dataKey="PyTorchMPS" stroke="#6b7280" strokeWidth={2} dot={{ fill: "#6b7280", r: 4 }} strokeDasharray="5 3" isAnimationActive />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Speedup bar */}
      {data.length > 1 && (
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>MLX Speedup over PyTorch MPS</div>
          <ResponsiveContainer width="100%" height={90}>
            <BarChart data={data} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="batch" stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 11, fill: "#6b7280" }} />
              <YAxis stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10, fill: "#6b7280" }} domain={[1, 2.5]} />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <div style={{ background: "#0d1117", border: "1px solid #374151", borderRadius: 6, padding: 8, fontFamily: "monospace", fontSize: 12, color: GREEN }}>speedup: {payload[0].value}×</div> : null} />
              <Bar dataKey="speedup" fill={GREEN + "88"} stroke={GREEN} radius={[3, 3, 0, 0]}
                data={data.map((d) => ({ ...d, speedup: +(d.PyTorchMPS / d.MLX).toFixed(2) }))} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Avg MLX Latency", value: data.length ? `${(data.reduce((a, d) => a + d.MLX, 0) / data.length).toFixed(2)}s` : "—", color: AMBER },
          { label: "Avg MPS Latency", value: data.length ? `${(data.reduce((a, d) => a + d.PyTorchMPS, 0) / data.length).toFixed(2)}s` : "—", color: "#6b7280" },
          { label: "Peak Speedup", value: data.length ? `${Math.max(...data.map((d) => d.PyTorchMPS / d.MLX)).toFixed(2)}×` : "—", color: GREEN },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 12, textAlign: "center" }}>
            <div style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
            <div style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 20 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab 3: Object Detection ─────────────────────────────────────────────────
function ObjectDetectionPanel() {
  const [phase, setPhase] = useState("idle"); // idle | label | train | export | validate | done
  const [progress, setProgress] = useState(0);
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState([]);
  const [detectedIdx, setDetectedIdx] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState([]);
  const timerRef = useRef(null);

  const addLog = (msg, color) => setLogs((l) => [...l.slice(-6), { msg, color }]);

  const phases = [
    { id: "label", label: "Data Labeling", duration: 3500, color: CYAN },
    { id: "train", label: "Model Training", duration: 8000, color: AMBER },
    { id: "export", label: "Core ML Export", duration: 2500, color: "#a78bfa" },
    { id: "validate", label: "On-Device Validation", duration: 3000, color: GREEN },
  ];

  const run = () => {
    if (phase !== "idle" && phase !== "done") return;
    setPhase("idle");
    setProgress(0);
    setEpoch(0);
    setLoss([]);
    setDetectedIdx([]);
    setLogs([]);
    clearInterval(timerRef.current);

    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);

    let totalTime = 0;
    phases.forEach(({ id, label, duration, color }, pi) => {
      setTimeout(() => {
        setPhase(id);
        addLog(`→ ${label}...`, color);

        if (id === "train") {
          let ep = 0;
          const epochInterval = setInterval(() => {
            ep++;
            setEpoch(ep);
            const l = +(2.1 * Math.exp(-ep * 0.28) + 0.08 + Math.random() * 0.06).toFixed(3);
            setLoss((ls) => [...ls, { epoch: ep, loss: l }]);
            if (ep >= 12) clearInterval(epochInterval);
          }, duration / 14);
        }

        const tick = setInterval(() => {
          setProgress((p) => {
            const next = p + 2;
            if (next >= (pi + 1) * 25) { clearInterval(tick); return (pi + 1) * 25; }
            return next;
          });
        }, duration / 50);

        if (pi === phases.length - 1) {
          setTimeout(() => {
            setPhase("done");
            clearInterval(timerRef.current);
            addLog("✓ Pipeline complete. <30 min total.", GREEN);
            OBJECTS.forEach((_, i) => setTimeout(() => setDetectedIdx((d) => [...d, i]), i * 280));
          }, duration);
        }
      }, totalTime);
      totalTime += duration;
    });
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const currentPhaseIdx = phases.findIndex((p) => p.id === phase);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, height: "100%" }}>
      {/* Left */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Pipeline Stages</div>
          {phases.map(({ id, label, color }, i) => {
            const done = currentPhaseIdx > i || phase === "done";
            const active = currentPhaseIdx === i;
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", marginBottom: 6, background: active ? color + "11" : "#0d1117", border: `1px solid ${active ? color : done ? color + "44" : "#1f2937"}`, borderRadius: 8, transition: "all 0.3s" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: done || active ? color : "#374151", boxShadow: active ? `0 0 8px ${color}` : "none", transition: "all 0.3s", flexShrink: 0 }} />
                <span style={{ fontFamily: "monospace", fontSize: 13, color: active ? color : done ? color + "cc" : "#4b5563", flex: 1 }}>{label}</span>
                {done && !active && <span style={{ color, fontSize: 11, fontFamily: "monospace" }}>✓</span>}
                {active && <span style={{ color, fontSize: 11, fontFamily: "monospace", animation: "pulse 1s ease-in-out infinite" }}>●</span>}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", letterSpacing: 2, textTransform: "uppercase" }}>Total Progress</span>
            <span style={{ color: AMBER, fontSize: 11, fontFamily: "monospace" }}>{progress}%</span>
          </div>
          <div style={{ background: "#1f2937", borderRadius: 4, height: 6, overflow: "hidden" }}>
            <div style={{ width: `${progress}%`, height: "100%", background: `linear-gradient(90deg, ${CYAN}, ${AMBER})`, borderRadius: 4, transition: "width 0.3s" }} />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: "Elapsed", value: phase !== "idle" ? `${elapsed}s` : "—", color: AMBER },
            { label: "Epoch", value: epoch > 0 ? `${epoch}/12` : "—", color: CYAN },
            { label: "Final Loss", value: loss.length > 0 ? loss[loss.length - 1].loss : "—", color: loss.length > 0 && loss[loss.length - 1].loss < 0.3 ? GREEN : RED },
            { label: "Objects Found", value: phase === "done" ? OBJECTS.length : "—", color: GREEN },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 10, textAlign: "center" }}>
              <div style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace", letterSpacing: 1, marginBottom: 3 }}>{label}</div>
              <div style={{ color, fontFamily: "monospace", fontWeight: 700, fontSize: 18 }}>{value}</div>
            </div>
          ))}
        </div>

        <button onClick={run} disabled={phase !== "idle" && phase !== "done"} style={{ background: phase !== "idle" && phase !== "done" ? "#1f2937" : GREEN + "22", border: `1px solid ${phase !== "idle" && phase !== "done" ? DIM : GREEN}`, color: phase !== "idle" && phase !== "done" ? "#6b7280" : GREEN, borderRadius: 8, padding: "11px 0", fontFamily: "monospace", fontWeight: 700, fontSize: 13, cursor: phase !== "idle" && phase !== "done" ? "not-allowed" : "pointer", letterSpacing: 1 }}>
          {phase === "idle" ? "▶  RUN PIPELINE" : phase === "done" ? "↺  RUN AGAIN" : "⚙  PIPELINE RUNNING..."}
        </button>

        {/* Log */}
        <div style={{ background: "#0d1117", border: "1px solid #1f2937", borderRadius: 8, padding: 10, minHeight: 80 }}>
          <div style={{ color: "#6b7280", fontSize: 10, fontFamily: "monospace", letterSpacing: 2, marginBottom: 6 }}>PIPELINE LOG</div>
          {logs.length === 0 && <TerminalLine text="$ awaiting pipeline start..." dim />}
          {logs.map((l, i) => <TerminalLine key={i} text={l.msg} color={l.color} />)}
        </div>
      </div>

      {/* Right: loss curve + detection */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>Training Loss</div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={loss} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="epoch" stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10, fill: "#6b7280" }} />
              <YAxis stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10, fill: "#6b7280" }} domain={[0, 2.5]} />
              <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #374151", fontFamily: "monospace", fontSize: 12 }} />
              <Line type="monotone" dataKey="loss" stroke={AMBER} strokeWidth={2} dot={false} isAnimationActive />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ color: "#6b7280", fontSize: 11, fontFamily: "monospace", marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>
            On-Device Inference {phase === "done" && <span style={{ color: GREEN }}>✓ VALIDATED</span>}
          </div>
          <div style={{ position: "relative", background: "#0a0f1a", border: `1px solid ${phase === "done" ? GREEN + "44" : "#1f2937"}`, borderRadius: 8, height: 220, overflow: "hidden" }}>
            {/* Simulated scene */}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0f1a 0%, #111827 100%)" }}>
              {/* grid overlay */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ position: "absolute", left: 0, right: 0, top: `${(i + 1) * 12.5}%`, height: 1, background: "#1f2937" }} />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} style={{ position: "absolute", top: 0, bottom: 0, left: `${(i + 1) * 10}%`, width: 1, background: "#1f2937" }} />
              ))}
            </div>

            {OBJECTS.map((obj, i) => (
              <div key={i} style={{
                position: "absolute",
                left: `${obj.x}%`, top: `${obj.y}%`,
                width: `${obj.w}%`, height: `${obj.h}%`,
                border: `2px solid ${detectedIdx.includes(i) ? obj.color : "transparent"}`,
                borderRadius: 3,
                transition: "border-color 0.3s",
                boxShadow: detectedIdx.includes(i) ? `0 0 10px ${obj.color}44` : "none",
              }}>
                {detectedIdx.includes(i) && (
                  <div style={{
                    position: "absolute", top: -22, left: 0,
                    background: obj.color, color: "#000",
                    fontFamily: "monospace", fontSize: 10, fontWeight: 700,
                    padding: "2px 6px", borderRadius: "3px 3px 3px 0",
                    whiteSpace: "nowrap",
                    animation: "fadeIn 0.3s ease",
                  }}>
                    {obj.label} {(obj.conf * 100).toFixed(0)}%
                  </div>
                )}
              </div>
            ))}

            {phase === "idle" && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", fontFamily: "monospace", fontSize: 13 }}>
                run pipeline to validate
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState(0);

  const tabs = [
    { label: "01 · LLM Inference", icon: "▶" },
    { label: "02 · MLX Benchmark", icon: "⚡" },
    { label: "03 · Object Detection", icon: "◉" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#030712",
      color: "#e5e7eb",
      fontFamily: "'IBM Plex Mono', monospace",
      padding: 24,
    }}>
      <style>
        {`@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap');`}
      </style>

      {/* Header */}
      <div style={{ marginBottom: 24, borderBottom: "1px solid #1f2937", paddingBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>
            On-Device LLM Inference Engine
          </h1>
          <div style={{ display: "flex", gap: 8 }}>
            {["Python", "MLX", "LLaMA", "Core ML", "Apple Silicon"].map((t) => (
              <span key={t} style={{ background: "#111827", border: "1px solid #374151", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#6b7280", letterSpacing: 0.5 }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ color: "#4b5563", fontSize: 12, marginTop: 6 }}>M2 Pro · Neural Engine · Zero Cloud Dependency · Privacy-First</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background: tab === i ? "#111827" : "transparent",
            border: `1px solid ${tab === i ? AMBER : "#1f2937"}`,
            color: tab === i ? AMBER : "#6b7280",
            borderRadius: 6,
            padding: "8px 16px",
            fontFamily: "monospace",
            fontSize: 12,
            cursor: "pointer",
            letterSpacing: 0.5,
            transition: "all 0.2s",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ background: "#080c14", border: "1px solid #1f2937", borderRadius: 12, padding: 24, minHeight: 560 }}>
        {tab === 0 && <InferencePanel />}
        {tab === 1 && <BenchmarkPanel />}
        {tab === 2 && <ObjectDetectionPanel />}
      </div>

      <div style={{ marginTop: 16, color: "#374151", fontSize: 11, textAlign: "center", letterSpacing: 1 }}>
        SIMULATION · LATENCY VALUES REPRESENTATIVE OF REAL M2 PRO BENCHMARKS
      </div>
    </div>
  );
}
