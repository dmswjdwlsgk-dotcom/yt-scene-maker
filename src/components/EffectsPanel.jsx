// src/components/EffectsPanel.jsx
import { DEFAULT_MOTION, DEFAULT_EFFECTS, DEFAULT_TRANSITION, MOTION_EFFECTS, TRANSITION_EFFECTS } from "../lib/defaults.js";

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
  sectionHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 14, fontWeight: 700, color: "#fff",
  },
  sectionSub: {
    fontSize: 11, color: "#6B7280", marginTop: 2,
  },
  row: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: 12,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  valueLabel: { fontSize: 12, color: "#F97316", fontWeight: 700 },
  slider: { width: "100%", accentColor: "#F97316", cursor: "pointer", marginTop: 6 },
  select: {
    background: "#1A1D27",
    border: "1px solid #1E2430",
    borderRadius: 8,
    padding: "7px 10px",
    color: "#fff",
    fontSize: 13,
    fontFamily: "inherit",
    cursor: "pointer",
    width: "100%",
  },
  divider: { border: "none", borderTop: "1px solid #1E2430", margin: "12px 0" },
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
  const display = format ? format(value) : value;
  return (
    <>
      <div style={S.row}>
        <span style={S.label}>{label}</span>
        <span style={S.valueLabel}>{display}</span>
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

export default function EffectsPanel({ motion, effects, transition, onMotionChange, onEffectsChange, onTransitionChange }) {
  const m = { ...DEFAULT_MOTION, ...motion };
  const e = { ...DEFAULT_EFFECTS, ...effects };
  const t = { ...DEFAULT_TRANSITION, ...transition };

  function updateMotion(key, val) { onMotionChange({ ...m, [key]: val }); }
  function updateEffects(key, val) { onEffectsChange({ ...e, [key]: val }); }
  function updateTransition(key, val) { onTransitionChange({ ...t, [key]: val }); }

  return (
    <div style={S.panel}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 16 }}>
        시각 효과 설정
      </div>

      {/* Ken Burns / Motion */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <div>
            <div style={S.sectionTitle}>Ken Burns 모션</div>
            <div style={S.sectionSub}>이미지에 자연스러운 움직임 효과를 추가합니다</div>
          </div>
          <Toggle value={m.enabled} onChange={(v) => updateMotion("enabled", v)} />
        </div>

        {m.enabled && (
          <>
            <hr style={S.divider} />
            <div style={{ ...S.row, marginTop: 0 }}>
              <span style={S.label}>효과</span>
            </div>
            <select
              value={m.effect}
              onChange={(e) => updateMotion("effect", e.target.value)}
              style={{ ...S.select, marginTop: 6 }}
            >
              {MOTION_EFFECTS.map((ef) => (
                <option key={ef.id} value={ef.id}>
                  {ef.icon} {ef.label}
                </option>
              ))}
            </select>

            <div style={{ ...S.row, marginTop: 12 }}>
              <span style={S.label}>적용 방식</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[
                { id: "uniform", label: "일괄 적용" },
                { id: "random", label: "랜덤" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateMotion("applyMode", opt.id)}
                  style={{
                    flex: 1, padding: "7px 0",
                    background: m.applyMode === opt.id ? "rgba(249,115,22,0.15)" : "#1A1D27",
                    border: m.applyMode === opt.id ? "1px solid #F97316" : "1px solid #1E2430",
                    borderRadius: 8, cursor: "pointer",
                    color: m.applyMode === opt.id ? "#F97316" : "#9CA3AF",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <SliderRow
              label="강도"
              min={0.02} max={0.3} step={0.01}
              value={m.intensity}
              onChange={(v) => updateMotion("intensity", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </>
        )}
      </div>

      {/* Vignette */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <div>
            <div style={S.sectionTitle}>비네팅 (주변부 어둡게)</div>
            <div style={S.sectionSub}>화면 가장자리를 어둡게 처리합니다</div>
          </div>
          <Toggle value={e.vignetteEnabled} onChange={(v) => updateEffects("vignetteEnabled", v)} />
        </div>

        {e.vignetteEnabled && (
          <>
            <hr style={S.divider} />
            <SliderRow
              label="강도"
              min={0} max={1} step={0.05}
              value={e.vignetteIntensity}
              onChange={(v) => updateEffects("vignetteIntensity", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="반경"
              min={0.3} max={1} step={0.05}
              value={e.vignetteRadius}
              onChange={(v) => updateEffects("vignetteRadius", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="부드럽기"
              min={0} max={1} step={0.05}
              value={e.vignetteSoftness}
              onChange={(v) => updateEffects("vignetteSoftness", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
          </>
        )}
      </div>

      {/* Camera Shake */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <div>
            <div style={S.sectionTitle}>카메라 흔들림</div>
            <div style={S.sectionSub}>손으로 촬영한 듯한 흔들림 효과</div>
          </div>
          <Toggle value={e.shakeEnabled} onChange={(v) => updateEffects("shakeEnabled", v)} />
        </div>

        {e.shakeEnabled && (
          <>
            <hr style={S.divider} />
            <SliderRow
              label="강도"
              min={0.05} max={1} step={0.05}
              value={e.shakeIntensity}
              onChange={(v) => updateEffects("shakeIntensity", v)}
              format={(v) => `${Math.round(v * 100)}%`}
            />
            <SliderRow
              label="속도"
              min={0.5} max={3} step={0.1}
              value={e.shakeSpeed}
              onChange={(v) => updateEffects("shakeSpeed", v)}
              format={(v) => `${v.toFixed(1)}x`}
            />
          </>
        )}
      </div>

      {/* Screen Transition */}
      <div style={S.section}>
        <div style={S.sectionHeader}>
          <div>
            <div style={S.sectionTitle}>화면 전환 효과</div>
            <div style={S.sectionSub}>씬 간 전환 애니메이션</div>
          </div>
          <Toggle value={t.enabled} onChange={(v) => updateTransition("enabled", v)} />
        </div>

        {t.enabled && (
          <>
            <hr style={S.divider} />
            <div style={{ ...S.row, marginTop: 0 }}>
              <span style={S.label}>기본 효과</span>
            </div>
            <select
              value={t.defaultEffect ?? ""}
              onChange={(e) => updateTransition("defaultEffect", e.target.value || undefined)}
              style={{ ...S.select, marginTop: 6 }}
            >
              {TRANSITION_EFFECTS.map((ef) => (
                <option key={ef.id ?? "__default__"} value={ef.id ?? ""}>
                  {ef.icon} {ef.label}
                </option>
              ))}
            </select>

            <div style={{ ...S.row, marginTop: 12 }}>
              <span style={S.label}>적용 방식</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              {[
                { id: "uniform", label: "일괄 적용" },
                { id: "random", label: "랜덤" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateTransition("applyMode", opt.id)}
                  style={{
                    flex: 1, padding: "7px 0",
                    background: t.applyMode === opt.id ? "rgba(249,115,22,0.15)" : "#1A1D27",
                    border: t.applyMode === opt.id ? "1px solid #F97316" : "1px solid #1E2430",
                    borderRadius: 8, cursor: "pointer",
                    color: t.applyMode === opt.id ? "#F97316" : "#9CA3AF",
                    fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <SliderRow
              label="전환 시간"
              min={0.1} max={2} step={0.05}
              value={t.transitionDuration}
              onChange={(v) => updateTransition("transitionDuration", v)}
              format={(v) => `${v.toFixed(2)}초`}
            />
          </>
        )}
      </div>

      {/* Reset all */}
      <button
        onClick={() => {
          onMotionChange({ ...DEFAULT_MOTION });
          onEffectsChange({ ...DEFAULT_EFFECTS });
          onTransitionChange({ ...DEFAULT_TRANSITION });
        }}
        style={{
          marginTop: 4, width: "100%", padding: "10px 0",
          background: "transparent", border: "1px solid #1E2430",
          borderRadius: 10, color: "#6B7280", fontSize: 13, cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        기본값으로 초기화
      </button>
    </div>
  );
}
