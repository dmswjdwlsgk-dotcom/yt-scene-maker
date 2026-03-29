// src/components/TtsPanel.jsx
import { useState } from "react";
import { DEFAULT_TTS, SUPERTONE_VOICES } from "../lib/defaults.js";
import { generateTtsForScene } from "../lib/tts.js";

const S = {
  panel: {
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 16,
    padding: 20,
    color: "#fff",
    fontFamily: "inherit",
  },
  section: {
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  valueLabel: { fontSize: 12, color: "#F97316", fontWeight: 700 },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 8,
  },
  input: {
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    width: "100%",
  },
  slider: { width: "100%", accentColor: "#F97316", cursor: "pointer", marginTop: 6 },
  divider: { border: "none", borderTop: "1px solid #1E2430", margin: "12px 0" },
  btn: (color) => ({
    padding: "10px 16px",
    background: color || "linear-gradient(90deg, #F97316, #EF4444)",
    border: "none",
    borderRadius: 10,
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
    width: "100%",
  }),
  sceneRow: {
    display: "flex", alignItems: "center", gap: 10,
    padding: "10px 14px",
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 10,
    marginBottom: 8,
  },
};

function Toggle({ value, onChange }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? "#F97316" : "#374151",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: value ? 22 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s",
      }} />
    </button>
  );
}

function SliderRow({ label, min, max, step, value, onChange, format }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
        <span style={S.label}>{label}</span>
        <span style={S.valueLabel}>{format ? format(value) : value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={S.slider}
      />
    </>
  );
}

export default function TtsPanel({ settings, onSettingsChange, scenes = [], supertoneKey, onTtsGenerated }) {
  const s = { ...DEFAULT_TTS, ...settings };
  const [generating, setGenerating] = useState(false);
  const [sceneStatus, setSceneStatus] = useState({}); // { sceneId: "loading"|"done"|"error" }
  const [error, setError] = useState("");

  function update(key, val) {
    onSettingsChange({ ...s, [key]: val });
  }

  async function generateAll() {
    if (!scenes.length) return;
    setGenerating(true);
    setError("");
    const results = {};
    for (const scene of scenes) {
      setSceneStatus((prev) => ({ ...prev, [scene.id]: "loading" }));
      try {
        const dataUrl = await generateTtsForScene(scene, s, supertoneKey);
        results[scene.id] = dataUrl;
        setSceneStatus((prev) => ({ ...prev, [scene.id]: "done" }));
        if (onTtsGenerated) onTtsGenerated(scene.id, dataUrl);
      } catch (err) {
        setSceneStatus((prev) => ({ ...prev, [scene.id]: "error" }));
        setError(`씬 ${scene.sceneNumber} 오류: ${err.message}`);
      }
    }
    setGenerating(false);
  }

  async function generateOne(scene) {
    setSceneStatus((prev) => ({ ...prev, [scene.id]: "loading" }));
    setError("");
    try {
      const dataUrl = await generateTtsForScene(scene, s, supertoneKey);
      setSceneStatus((prev) => ({ ...prev, [scene.id]: "done" }));
      if (onTtsGenerated) onTtsGenerated(scene.id, dataUrl);
    } catch (err) {
      setSceneStatus((prev) => ({ ...prev, [scene.id]: "error" }));
      setError(`씬 ${scene.sceneNumber} 오류: ${err.message}`);
    }
  }

  const voiceEntries = Object.entries(SUPERTONE_VOICES);

  return (
    <div style={S.panel}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
        TTS (음성 합성)
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
        대본을 AI 음성으로 변환합니다
      </div>

      {/* Engine selector */}
      <div style={S.section}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>TTS 엔진</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "supertone", label: "Supertone" },
            { id: "voicevox", label: "Voicevox" },
          ].map((eng) => (
            <button
              key={eng.id}
              onClick={() => update("ttsEngine", eng.id)}
              style={{
                flex: 1, padding: "9px 0",
                background: s.ttsEngine === eng.id ? "rgba(249,115,22,0.15)" : "#1A1D27",
                border: s.ttsEngine === eng.id ? "1px solid #F97316" : "1px solid #1E2430",
                borderRadius: 8, cursor: "pointer",
                color: s.ttsEngine === eng.id ? "#F97316" : "#9CA3AF",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
              }}
            >
              {eng.label}
            </button>
          ))}
        </div>
      </div>

      {/* Supertone settings */}
      {s.ttsEngine === "supertone" && (
        <div style={S.section}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
            Supertone 설정
          </div>

          {!supertoneKey && (
            <div style={{
              padding: "10px 12px", background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
              fontSize: 12, color: "#FCA5A5", marginBottom: 12,
            }}>
              API 키 관리에서 Supertone API 키를 입력해주세요.
            </div>
          )}

          <div style={{ ...S.row, marginBottom: 6 }}>
            <span style={S.label}>음성</span>
          </div>
          <select
            value={s.voiceId}
            onChange={(e) => {
              const id = e.target.value;
              update("voiceId", id);
              update("voiceName", SUPERTONE_VOICES[id] || id);
            }}
            style={S.select}
          >
            {voiceEntries.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <SliderRow
            label="속도"
            min={0.5} max={2} step={0.05}
            value={s.speed}
            onChange={(v) => update("speed", v)}
            format={(v) => `${v.toFixed(2)}x`}
          />
        </div>
      )}

      {/* Voicevox settings */}
      {s.ttsEngine === "voicevox" && (
        <div style={S.section}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
            Voicevox 설정
          </div>
          <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12 }}>
            로컬에서 Voicevox 엔진이 실행 중이어야 합니다 (http://localhost:50021)
          </div>

          <div style={S.row}>
            <span style={S.label}>스피커 ID</span>
          </div>
          <input
            type="number" min="0" max="99" step="1"
            value={s.voicevoxSpeakerId}
            onChange={(e) => update("voicevoxSpeakerId", parseInt(e.target.value))}
            style={S.input}
          />

          <SliderRow
            label="속도"
            min={0.5} max={2} step={0.05}
            value={s.voicevoxSpeed}
            onChange={(v) => update("voicevoxSpeed", v)}
            format={(v) => `${v.toFixed(2)}x`}
          />
          <SliderRow
            label="피치"
            min={-0.15} max={0.15} step={0.01}
            value={s.voicevoxPitch}
            onChange={(v) => update("voicevoxPitch", v)}
            format={(v) => v.toFixed(2)}
          />
          <SliderRow
            label="억양"
            min={0} max={2} step={0.05}
            value={s.voicevoxIntonation}
            onChange={(v) => update("voicevoxIntonation", v)}
            format={(v) => v.toFixed(2)}
          />
        </div>
      )}

      {/* Scene duration */}
      <div style={S.section}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 4 }}>씬 기본 길이</div>
        <SliderRow
          label="TTS 없을 때 기본 씬 길이"
          min={3} max={20} step={0.5}
          value={s.sceneDuration}
          onChange={(v) => update("sceneDuration", v)}
          format={(v) => `${v}초`}
        />
      </div>

      {/* Generate all button */}
      <button
        onClick={generateAll}
        disabled={generating || !scenes.length}
        style={{
          ...S.btn(),
          opacity: generating || !scenes.length ? 0.5 : 1,
          marginBottom: 12,
        }}
      >
        {generating ? "생성 중..." : `전체 TTS 생성 (${scenes.length}개 씬)`}
      </button>

      {error && (
        <div style={{
          padding: "10px 12px", background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8,
          fontSize: 12, color: "#FCA5A5", marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Per-scene TTS */}
      {scenes.length > 0 && (
        <div style={S.section}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
            씬별 TTS
          </div>
          {scenes.map((scene) => {
            const status = sceneStatus[scene.id];
            return (
              <div key={scene.id} style={S.sceneRow}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: "#0E1117", border: "1px solid #1E2430",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: "#F97316", flexShrink: 0,
                }}>
                  {scene.sceneNumber}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: "#D1D5DB", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {scene.script || "(대본 없음)"}
                  </div>
                  {status === "done" && (
                    <div style={{ fontSize: 11, color: "#34D399", marginTop: 2 }}>생성 완료</div>
                  )}
                  {status === "error" && (
                    <div style={{ fontSize: 11, color: "#F87171", marginTop: 2 }}>생성 실패</div>
                  )}
                </div>
                <button
                  onClick={() => generateOne(scene)}
                  disabled={status === "loading"}
                  style={{
                    padding: "6px 12px",
                    background: status === "done" ? "rgba(52,211,153,0.1)" : "rgba(249,115,22,0.1)",
                    border: status === "done" ? "1px solid #34D399" : "1px solid #F97316",
                    borderRadius: 7,
                    color: status === "done" ? "#34D399" : "#F97316",
                    fontSize: 11, fontWeight: 700, cursor: "pointer",
                    fontFamily: "inherit", flexShrink: 0,
                    opacity: status === "loading" ? 0.5 : 1,
                  }}
                >
                  {status === "loading" ? "..." : status === "done" ? "재생성" : "생성"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
