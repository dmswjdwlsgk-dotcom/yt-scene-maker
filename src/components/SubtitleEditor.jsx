// src/components/SubtitleEditor.jsx
import { useState } from "react";
import { DEFAULT_SUBTITLE, FONTS, CAPTION_PRESETS } from "../lib/defaults.js";

const S = {
  panel: {
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 16,
    padding: 20,
    color: "#fff",
    fontFamily: "inherit",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 12,
    marginTop: 20,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  sublabel: { fontSize: 11, color: "#6B7280" },
  input: {
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    width: "100%",
  },
  select: {
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 8,
    padding: "8px 10px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
  },
  slider: { width: "100%", accentColor: "#F97316", cursor: "pointer" },
  divider: { border: "none", borderTop: "1px solid #1E2430", margin: "16px 0" },
  presetBtn: (active) => ({
    background: active ? "rgba(249,115,22,0.15)" : "#0E1117",
    border: active ? "1px solid #F97316" : "1px solid #1E2430",
    borderRadius: 10,
    padding: "10px 8px",
    cursor: "pointer",
    textAlign: "center",
    flex: 1,
    transition: "all 0.15s",
  }),
  colorSwatch: (color) => ({
    width: 28,
    height: 28,
    borderRadius: 6,
    background: color,
    border: "2px solid #374151",
    cursor: "pointer",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  }),
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

function ColorInput({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
      <div style={{ ...S.colorSwatch(value) }}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute", inset: 0, opacity: 0,
            width: "100%", height: "100%", cursor: "pointer",
          }}
        />
      </div>
      {label && <span style={S.label}>{label}</span>}
    </label>
  );
}

export default function SubtitleEditor({ settings, onChange }) {
  const s = { ...DEFAULT_SUBTITLE, ...settings };
  const [enabled, setEnabled] = useState(true);

  function update(key, val) {
    onChange({ ...s, [key]: val });
  }

  function applyPreset(preset) {
    onChange({ ...s, ...preset.overrides });
  }

  // Group fonts by category
  const fontCategories = [...new Set(FONTS.map((f) => f.category))];

  return (
    <div style={S.panel}>
      {/* Header toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>자막 설정</div>
          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>영상에 표시될 자막 스타일을 설정합니다</div>
        </div>
        <Toggle value={enabled} onChange={setEnabled} />
      </div>

      {!enabled && (
        <div style={{ padding: "12px 0", color: "#6B7280", fontSize: 13, textAlign: "center" }}>
          자막이 비활성화되었습니다
        </div>
      )}

      {enabled && (
        <>
          {/* Caption Presets */}
          <div style={{ ...S.sectionTitle, marginTop: 16 }}>빠른 프리셋</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {CAPTION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                title={preset.description}
                style={S.presetBtn(false)}
              >
                <div style={{ fontSize: 18 }}>{preset.icon}</div>
                <div style={{ fontSize: 11, color: "#D1D5DB", marginTop: 4, fontWeight: 600 }}>
                  {preset.label}
                </div>
              </button>
            ))}
          </div>

          <hr style={S.divider} />

          {/* Font Family */}
          <div style={S.sectionTitle}>폰트</div>
          <select
            value={s.fontFamily}
            onChange={(e) => update("fontFamily", e.target.value)}
            style={{ ...S.select, width: "100%", marginBottom: 10 }}
          >
            {fontCategories.map((cat) => (
              <optgroup key={cat} label={cat}>
                {FONTS.filter((f) => f.category === cat).map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Font Size */}
          <div style={S.row}>
            <span style={S.label}>폰트 크기</span>
            <span style={{ ...S.label, color: "#F97316", fontSize: 12, fontWeight: 700 }}>
              {Math.round(s.fontSize * 1000) / 10}%
            </span>
          </div>
          <input
            type="range" min="0.02" max="0.1" step="0.002"
            value={s.fontSize}
            onChange={(e) => update("fontSize", parseFloat(e.target.value))}
            style={{ ...S.slider, marginBottom: 12 }}
          />

          {/* Font Weight + Color */}
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ ...S.label, marginBottom: 6 }}>굵기</div>
              <select
                value={s.fontWeight}
                onChange={(e) => update("fontWeight", Number(e.target.value))}
                style={{ ...S.select, width: "100%" }}
              >
                <option value={400}>보통</option>
                <option value={700}>굵게</option>
                <option value={900}>매우 굵게</option>
              </select>
            </div>
            <div>
              <div style={{ ...S.label, marginBottom: 6 }}>색상</div>
              <ColorInput value={s.fontColor} onChange={(v) => update("fontColor", v)} />
            </div>
          </div>

          <hr style={S.divider} />

          {/* Stroke (outline) */}
          <div style={S.sectionTitle}>외곽선</div>
          <div style={{ ...S.row, marginBottom: 10 }}>
            <span style={S.label}>외곽선 활성화</span>
            <Toggle
              value={!!s.strokeEnabled}
              onChange={(v) => update("strokeEnabled", v)}
            />
          </div>
          {s.strokeEnabled && (
            <div style={{ paddingLeft: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <ColorInput value={s.strokeColor} onChange={(v) => update("strokeColor", v)} label="색상" />
              </div>
              <div style={S.row}>
                <span style={S.label}>두께</span>
                <span style={{ ...S.label, color: "#F97316", fontSize: 12 }}>{s.strokeWidth}px</span>
              </div>
              <input
                type="range" min="0" max="10" step="0.5"
                value={s.strokeWidth}
                onChange={(e) => update("strokeWidth", parseFloat(e.target.value))}
                style={{ ...S.slider, marginBottom: 10 }}
              />
            </div>
          )}

          <hr style={S.divider} />

          {/* Background */}
          <div style={S.sectionTitle}>배경</div>
          <div style={{ ...S.row, marginBottom: 10 }}>
            <span style={S.label}>배경 활성화</span>
            <Toggle
              value={!!s.bgEnabled}
              onChange={(v) => update("bgEnabled", v)}
            />
          </div>
          {s.bgEnabled && (
            <div style={{ paddingLeft: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <ColorInput value={s.bgColor} onChange={(v) => update("bgColor", v)} label="배경색" />
              </div>
              <div style={S.row}>
                <span style={S.label}>불투명도</span>
                <span style={{ ...S.label, color: "#F97316", fontSize: 12 }}>
                  {Math.round(s.bgOpacity * 100)}%
                </span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05"
                value={s.bgOpacity}
                onChange={(e) => update("bgOpacity", parseFloat(e.target.value))}
                style={{ ...S.slider, marginBottom: 10 }}
              />
            </div>
          )}

          <hr style={S.divider} />

          {/* Position */}
          <div style={S.sectionTitle}>위치</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["top", "center", "bottom"].map((pos) => (
              <button
                key={pos}
                onClick={() => update("position", pos)}
                style={{
                  flex: 1, padding: "8px 0",
                  background: s.position === pos ? "rgba(249,115,22,0.15)" : "#0E1117",
                  border: s.position === pos ? "1px solid #F97316" : "1px solid #1E2430",
                  borderRadius: 8, cursor: "pointer",
                  color: s.position === pos ? "#F97316" : "#9CA3AF",
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {{ top: "상단", center: "가운데", bottom: "하단" }[pos]}
              </button>
            ))}
          </div>

          <hr style={S.divider} />

          {/* Max subtitle length */}
          <div style={S.sectionTitle}>최대 자막 길이</div>
          <div style={S.row}>
            <span style={S.label}>한 줄 최대 글자 수</span>
            <span style={{ ...S.label, color: "#F97316", fontSize: 12, fontWeight: 700 }}>
              {s.maxSubtitleLength}자
            </span>
          </div>
          <input
            type="range" min="10" max="50" step="1"
            value={s.maxSubtitleLength}
            onChange={(e) => update("maxSubtitleLength", parseInt(e.target.value))}
            style={{ ...S.slider, marginBottom: 4 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#6B7280" }}>
            <span>10자</span><span>50자</span>
          </div>

          {/* Reset */}
          <button
            onClick={() => onChange({ ...DEFAULT_SUBTITLE })}
            style={{
              marginTop: 20, width: "100%", padding: "10px 0",
              background: "transparent", border: "1px solid #1E2430",
              borderRadius: 10, color: "#6B7280", fontSize: 13, cursor: "pointer",
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
