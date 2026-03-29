// src/components/KeywordPanel.jsx
import { useState } from "react";
import { DEFAULT_KEYWORD, FONTS } from "../lib/defaults.js";

const ANIMATIONS = [
  "scale_up","slide_up","slide_down","slide_left","slide_right","zoom_blur",
  "bounce_in","drop_in","pop_in","elastic_in","glitch_in","wave_in","spiral_in",
  "shake_in","stamp_in","roll_in","flip_in","rotate_in","swing_in","flash_in",
  "split_in","typewriter",
];

const POSITIONS = [
  { id: "top_center", label: "상단 중앙" },
  { id: "center", label: "중앙" },
  { id: "bottom_center", label: "하단 중앙" },
  { id: "top_left", label: "좌상단" },
  { id: "top_right", label: "우상단" },
  { id: "bottom_left", label: "좌하단" },
  { id: "bottom_right", label: "우하단" },
];

const S = {
  panel: {
    background: "#1A1D27", border: "1px solid #1E2430",
    borderRadius: 16, padding: 20, color: "#fff", fontFamily: "inherit",
  },
  section: {
    background: "#0E1117", border: "1px solid #1E2430",
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  select: {
    background: "#1A1D27", border: "1px solid #1E2430", borderRadius: 8,
    padding: "7px 10px", color: "#fff", fontSize: 12,
    fontFamily: "inherit", cursor: "pointer", width: "100%",
  },
  input: {
    background: "#1A1D27", border: "1px solid #1E2430", borderRadius: 8,
    padding: "8px 12px", color: "#fff", fontSize: 12, fontFamily: "inherit",
    width: "100%", boxSizing: "border-box",
  },
  slider: { width: "100%", accentColor: "#F97316", cursor: "pointer", marginTop: 4 },
  divider: { border: "none", borderTop: "1px solid #1E2430", margin: "10px 0" },
  colorBox: (c) => ({
    width: 24, height: 24, borderRadius: 5, background: c,
    border: "2px solid #374151", cursor: "pointer", flexShrink: 0,
    position: "relative", overflow: "hidden",
  }),
};

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? "#F97316" : "#374151",
      border: "none", cursor: "pointer", position: "relative", flexShrink: 0,
    }}>
      <span style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </button>
  );
}

function ColorInput({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div style={S.colorBox(value)}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
      </div>
      {label && <span style={S.label}>{label}</span>}
    </label>
  );
}

function SliderRow({ label, min, max, step, value, onChange, format }) {
  return (
    <>
      <div style={{ ...S.row, marginBottom: 2 }}>
        <span style={S.label}>{label}</span>
        <span style={{ fontSize: 11, color: "#F97316", fontWeight: 700 }}>{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} style={S.slider} />
    </>
  );
}

export default function KeywordPanel({ settings, onChange, scenes = [] }) {
  const s = { ...DEFAULT_KEYWORD, ...settings };
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedScene, setSelectedScene] = useState(null);

  function update(key, val) { onChange({ ...s, [key]: val }); }

  function addKeyword() {
    const kw = newKeyword.trim();
    if (!kw) return;
    if (selectedScene !== null) {
      const per = { ...(s.perSceneKeywords || {}) };
      const key = selectedScene;
      per[key] = [...(per[key] || []), kw];
      update("perSceneKeywords", per);
    }
    setNewKeyword("");
  }

  function removeKeyword(sceneKey, idx) {
    const per = { ...(s.perSceneKeywords || {}) };
    per[sceneKey] = (per[sceneKey] || []).filter((_, i) => i !== idx);
    if (per[sceneKey].length === 0) delete per[sceneKey];
    update("perSceneKeywords", per);
  }

  const fontCategories = [...new Set(FONTS.map((f) => f.category))];

  return (
    <div style={S.panel}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>키워드 모션 그래픽</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>씬에 텍스트 키워드를 표시합니다</div>
        </div>
        <Toggle value={s.enabled} onChange={(v) => update("enabled", v)} />
      </div>

      {s.enabled && (
        <>
          {/* Animation */}
          <div style={S.section}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>애니메이션</div>
            <select value={s.animation} onChange={(e) => update("animation", e.target.value)} style={S.select}>
              {ANIMATIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Position */}
          <div style={S.section}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>위치</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
              {POSITIONS.map((p) => (
                <button key={p.id} onClick={() => update("position", p.id)} style={{
                  padding: "6px 0",
                  background: s.position === p.id ? "rgba(249,115,22,0.15)" : "#1A1D27",
                  border: s.position === p.id ? "1px solid #F97316" : "1px solid #1E2430",
                  borderRadius: 7, cursor: "pointer",
                  color: s.position === p.id ? "#F97316" : "#9CA3AF",
                  fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font */}
          <div style={S.section}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>폰트 설정</div>
            <select value={s.fontFamily} onChange={(e) => update("fontFamily", e.target.value)} style={{ ...S.select, marginBottom: 8 }}>
              {fontCategories.map((cat) => (
                <optgroup key={cat} label={cat}>
                  {FONTS.filter((f) => f.category === cat).map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>

            <SliderRow label="폰트 크기" min={0.03} max={0.12} step={0.005}
              value={s.fontSize} onChange={(v) => update("fontSize", v)}
              format={(v) => `${Math.round(v * 1000) / 10}%`} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
              <ColorInput value={s.fontColor} onChange={(v) => update("fontColor", v)} label="색상" />
            </div>
          </div>

          {/* Stroke */}
          <div style={S.section}>
            <div style={{ ...S.row }}>
              <span style={{ ...S.label, fontWeight: 700 }}>외곽선</span>
              <Toggle value={s.strokeEnabled !== false} onChange={(v) => update("strokeEnabled", v)} />
            </div>
            {s.strokeEnabled !== false && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <ColorInput value={s.strokeColor} onChange={(v) => update("strokeColor", v)} label="색상" />
                </div>
                <SliderRow label="두께" min={0} max={10} step={0.5}
                  value={s.strokeWidth} onChange={(v) => update("strokeWidth", v)}
                  format={(v) => `${v}px`} />
              </>
            )}
          </div>

          {/* Timing */}
          <div style={S.section}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>타이밍</div>
            <SliderRow label="표시 시간" min={0.1} max={1} step={0.05}
              value={s.showDuration} onChange={(v) => update("showDuration", v)}
              format={(v) => `${v.toFixed(2)}s`} />
            <SliderRow label="등장 시간" min={0.1} max={1} step={0.05}
              value={s.animationDuration} onChange={(v) => update("animationDuration", v)}
              format={(v) => `${v.toFixed(2)}s`} />
            <SliderRow label="사라짐 시간" min={0.05} max={0.5} step={0.05}
              value={s.fadeOutDuration} onChange={(v) => update("fadeOutDuration", v)}
              format={(v) => `${v.toFixed(2)}s`} />
          </div>

          {/* Per-scene keywords */}
          <div style={S.section}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>씬별 키워드</div>

            {scenes.length > 0 && (
              <select
                value={selectedScene ?? ""}
                onChange={(e) => setSelectedScene(e.target.value || null)}
                style={{ ...S.select, marginBottom: 8 }}
              >
                <option value="">씬 선택...</option>
                {scenes.map((sc) => (
                  <option key={sc.sceneNumber} value={sc.script}>
                    씬 {sc.sceneNumber}: {sc.script?.slice(0, 20)}...
                  </option>
                ))}
              </select>
            )}

            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <input
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                placeholder="키워드 (|로 부제목 구분)"
                style={{ ...S.input, flex: 1 }}
              />
              <button onClick={addKeyword} style={{
                padding: "8px 14px", background: "rgba(249,115,22,0.15)",
                border: "1px solid #F97316", borderRadius: 8,
                color: "#F97316", fontSize: 12, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
              }}>
                추가
              </button>
            </div>

            {/* Show existing keywords */}
            {Object.entries(s.perSceneKeywords || {}).map(([sceneScript, kws]) => {
              const sc = scenes.find((s) => s.script === sceneScript);
              return (
                <div key={sceneScript} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
                    씬 {sc?.sceneNumber || "?"}: {sceneScript.slice(0, 20)}...
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {kws.map((kw, idx) => (
                      <div key={idx} style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: "rgba(249,115,22,0.1)", border: "1px solid #F97316",
                        borderRadius: 6, padding: "3px 8px",
                      }}>
                        <span style={{ fontSize: 11, color: "#F97316" }}>{kw}</span>
                        <button
                          onClick={() => removeKeyword(sceneScript, idx)}
                          style={{ background: "none", border: "none", color: "#9CA3AF", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onChange({ ...DEFAULT_KEYWORD })}
            style={{
              marginTop: 4, width: "100%", padding: "9px 0",
              background: "transparent", border: "1px solid #1E2430",
              borderRadius: 10, color: "#6B7280", fontSize: 12, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            기본값으로 초기화
          </button>
        </>
      )}
    </div>
  );
}
