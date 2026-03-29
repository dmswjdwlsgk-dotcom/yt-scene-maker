// src/components/KeywordMotionModal.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { FONTS, CAPTION_PRESETS } from "../lib/defaults.js";

// ─── Animation grid ────────────────────────────────────────────────────────
const ANIM_GRID = [
  { id: "pop_in",     label: "키보입" },
  { id: "fade",       label: "페이드" },
  { id: "slide_up",   label: "↑" },
  { id: "slide_down", label: "↓" },
  { id: "slide_left", label: "←" },
  { id: "slide_right",label: "→" },
  { id: "typewriter", label: "타자기" },
  { id: "zoom_blur",  label: "회대" },
  { id: "bounce_in",  label: "바운스" },
  { id: "scale_up",   label: "줄일" },
  { id: "rotate_in",  label: "회전" },
  { id: "elastic_in", label: "탄성" },
  { id: "glitch_in",  label: "글리치" },
  { id: "wave_in",    label: "웨이브" },
  { id: "drop_in",    label: "드롭" },
  { id: "spiral_in",  label: "돌" },
  { id: "stamp_in",   label: "스탬프" },
  { id: "flash_in",   label: "플래시" },
];

// ─── Position grid ─────────────────────────────────────────────────────────
const POS_ROWS = [
  [{ id: "top_left", label: "좌상단" }, { id: "top_center", label: "상단" }, { id: "top_right", label: "우상단" }],
  [{ id: "center_left", label: "좌중단" }, { id: "center", label: "중앙" }, { id: "center_right", label: "우중단" }],
  [{ id: "bottom_left", label: "좌하단" }, { id: "bottom_center", label: "하단" }, { id: "bottom_right", label: "우하단" }],
];

// ─── Text style presets ────────────────────────────────────────────────────
const TEXT_PRESETS = [
  { id: "default", label: "기본값" },
  { id: "basic",   label: "기본" },
  { id: "handwrite_yellow", label: "손글씨" },
  { id: "news_headline",    label: "뉴스 헤드라인" },
  { id: "red_band",         label: "빨간 밴드" },
];

// ─── Sound effects ─────────────────────────────────────────────────────────
const SFX_LIST = [
  { id: "none",    label: "기본값" },
  { id: "typing",  label: "타자" },
  { id: "whoosh",  label: "휘익" },
  { id: "pop",     label: "팝" },
  { id: "swoosh",  label: "슈웅" },
  { id: "impact",  label: "임팩트" },
  { id: "bounce",  label: "바운스" },
  { id: "glitch",  label: "글리치" },
];

// ─── Default per-scene settings ────────────────────────────────────────────
export const DEFAULT_SCENE_MOTION = {
  enabled: true,
  keywords: "",
  animation: "pop_in",
  position: "center",
  soundEffect: "none",
  style: {
    preset: "default",
    mainFont: "'GongGothicBold', 'Noto Sans KR', sans-serif",
    mainSize: 100,
    mainWeight: 900,
    mainColor: "#ffffff",
    mainLetterSpacing: 4,
    subFont: "",
    subSize: 34,
    subWeight: 600,
    subColor: "#cccccc",
    subLetterSpacing: 1,
    shadow: { enabled: true, color: "#000000", blur: 12, x: 3, y: 3 },
    stroke: { enabled: true, color: "#000000", width: 4 },
    glow: false,
    gradient: false,
    bgBox: false,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function elasticOut(t) {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const p = 0.4;
  return Math.pow(2, -10 * t) * Math.sin(((t - p / 4) * (2 * Math.PI)) / p) + 1;
}

function getPosXY(pos, W, H) {
  const px = 0.12, py = 0.12;
  const map = {
    top_left:     [W * px,       H * py],
    top_center:   [W * 0.5,      H * py],
    top_right:    [W * (1 - px), H * py],
    center_left:  [W * px,       H * 0.5],
    center:       [W * 0.5,      H * 0.5],
    center_right: [W * (1 - px), H * 0.5],
    bottom_left:  [W * px,       H * (1 - py)],
    bottom_center:[W * 0.5,      H * (1 - py)],
    bottom_right: [W * (1 - px), H * (1 - py)],
  };
  return map[pos] || [W * 0.5, H * 0.5];
}

function drawPreviewKeyword(ctx, W, H, t, settings) {
  const { animation, position, style } = settings;
  const kws = (settings.keywords || "").split(",").map(s => s.trim()).filter(Boolean);
  if (kws.length === 0) return;
  const raw = kws[0];
  const parts = raw.split("|");
  const mainText = parts[0] || "";
  const subText = parts[1] || "";
  if (!mainText) return;

  // Animation phases: 0→0.4 in, 0.4→0.75 hold, 0.75→1 fade-out
  const animR = Math.min(1, t / 0.4);
  const Z = elasticOut(animR);
  const fadeR = t > 0.75 ? (t - 0.75) / 0.25 : 0;
  let alpha = 1 - fadeR;
  let tx = 0, ty = 0, sc = 1, rot = 0;

  switch (animation) {
    case "slide_up":    ty = (1 - Z) * H * 0.12; break;
    case "slide_down":  ty = -(1 - Z) * H * 0.12; break;
    case "slide_left":  tx = (1 - Z) * W * 0.12; break;
    case "slide_right": tx = -(1 - Z) * W * 0.12; break;
    case "scale_up":    sc = 0.2 + Z * 0.8; break;
    case "bounce_in":   sc = 0.2 + Z * 0.8; ty = (1 - Z) * H * 0.08; break;
    case "pop_in":      sc = 0.1 + Z * 0.9; break;
    case "elastic_in":  sc = 0.1 + Z * 0.9; break;
    case "zoom_blur":   sc = 0.5 + animR * 0.5; alpha *= animR; break;
    case "drop_in":     ty = -(1 - Z) * H * 0.15; sc = 0.3 + Z * 0.7; break;
    case "rotate_in":   rot = (1 - animR) * Math.PI * 0.5; sc = 0.3 + Z * 0.7; break;
    case "stamp_in":    sc = animR < 0.5 ? 1 + (1 - animR * 2) * 0.8 : 1; break;
    case "flash_in":    alpha *= animR < 0.3 ? (animR / 0.3) % 1 : 1; alpha *= (1 - fadeR); break;
    case "fade":        alpha = animR * (1 - fadeR); break;
    case "wave_in":     tx = Math.sin(t * Math.PI * 4) * W * 0.01 * (1 - animR); sc = 0.3 + Z * 0.7; break;
    case "glitch_in":   tx = animR < 0.7 ? (Math.random() - 0.5) * 10 : 0; sc = 0.5 + Z * 0.5; break;
    case "spiral_in":   rot = (1 - animR) * Math.PI * 2; sc = 0.1 + animR * 0.9; break;
    case "typewriter":  break; // handled below
    default: sc = 0.3 + Z * 0.7; break;
  }

  const [cx, cy] = getPosXY(position, W, H);
  const mainSize = Math.round((style.mainSize || 100) * H / 1080);
  const subSize  = Math.round((style.subSize  || 34)  * H / 1080);
  const mainFont = style.mainFont || "'GongGothicBold', 'Noto Sans KR', sans-serif";
  const subFont  = style.subFont  || mainFont;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.translate(cx + tx, cy + ty);
  ctx.scale(sc, sc);
  if (rot) ctx.rotate(rot);

  // Typewriter special case
  let displayMain = mainText;
  if (animation === "typewriter") {
    const chars = Math.floor(animR * mainText.length);
    displayMain = mainText.slice(0, chars);
  }

  // Shadow
  if (style.shadow?.enabled) {
    ctx.shadowColor = style.shadow.color || "#000";
    ctx.shadowBlur = (style.shadow.blur || 12) * H / 1080;
    ctx.shadowOffsetX = (style.shadow.x || 3) * H / 1080;
    ctx.shadowOffsetY = (style.shadow.y || 3) * H / 1080;
  }

  const drawText = (text, size, font, weight, color, stroke, letterSpacing, yOff) => {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = `${letterSpacing || 0}px`;

    if (style.stroke?.enabled && stroke) {
      ctx.strokeStyle = style.stroke.color || "#000";
      ctx.lineWidth = (style.stroke.width || 4) * H / 1080 * 2;
      ctx.lineJoin = "round";
      ctx.strokeText(text, 0, yOff);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, 0, yOff);
  };

  const subYOff = subText ? mainSize * 0.6 + subSize * 0.7 : 0;
  if (subText) {
    drawText(subText, subSize, subFont, style.subWeight || 600, style.subColor || "#cccccc", false, style.subLetterSpacing, subYOff);
  }
  drawText(displayMain, mainSize, mainFont, style.mainWeight || 900, style.mainColor || "#fff", true, style.mainLetterSpacing, subText ? -subSize * 0.6 : 0);

  ctx.restore();
}

// ─── Mini components ───────────────────────────────────────────────────────
function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? "#3B82F6" : "#374151",
      border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s",
    }}>
      <span style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
    </button>
  );
}

function ColorInput({ value, onChange }) {
  return (
    <label style={{ position: "relative", width: 28, height: 28, borderRadius: 6, border: "2px solid #4B5563", background: value, cursor: "pointer", display: "block", flexShrink: 0 }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", height: "100%", cursor: "pointer" }} />
    </label>
  );
}

function SliderRow({ label, right, min, max, step, value, onChange, unit = "" }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: "#9CA3AF" }}>{label}</span>
        <span style={{ fontSize: 11, color: "#F97316", fontWeight: 700 }}>{right || `${value}${unit}`}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "#F97316", cursor: "pointer" }} />
    </div>
  );
}

function SectionHeader({ icon, label, toggle, onToggle }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#D1D5DB" }}>{icon} {label}</span>
      {onToggle !== undefined && <Toggle value={toggle} onChange={onToggle} />}
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────
export default function KeywordMotionModal({ scene, settings: initSettings, onSave, onClose }) {
  const [s, setS] = useState(() => ({ ...DEFAULT_SCENE_MOTION, ...initSettings }));
  const [style, setStyle] = useState(() => ({ ...DEFAULT_SCENE_MOTION.style, ...(initSettings?.style || {}) }));

  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const rafRef    = useRef(null);
  const t0Ref     = useRef(null);

  // Load scene image
  useEffect(() => {
    if (!scene?.imageBase64) return;
    const img = new Image();
    img.onload = () => { imgRef.current = img; };
    img.src = scene.imageBase64;
  }, [scene?.imageBase64]);

  // Preview animation loop
  const draw = useCallback((now) => {
    if (!t0Ref.current) t0Ref.current = now;
    const elapsed = (now - t0Ref.current) / 1000;
    const loopDur = 2.2;
    const t = (elapsed % loopDur) / loopDur;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, W, H);
    } else {
      ctx.fillStyle = "#0a0d14";
      ctx.fillRect(0, 0, W, H);
    }

    if (s.enabled) {
      drawPreviewKeyword(ctx, W, H, t, { ...s, style });
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [s, style]);

  useEffect(() => {
    t0Ref.current = null;
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  function upd(key, val) { setS((prev) => ({ ...prev, [key]: val })); }
  function updStyle(key, val) { setStyle((prev) => ({ ...prev, [key]: val })); }
  function updShadow(key, val) { setStyle((prev) => ({ ...prev, shadow: { ...prev.shadow, [key]: val } })); }
  function updStroke(key, val) { setStyle((prev) => ({ ...prev, stroke: { ...prev.stroke, [key]: val } })); }

  function applyPreset(presetId) {
    updStyle("preset", presetId);
    const cap = CAPTION_PRESETS.find((p) => p.id === presetId);
    if (!cap) return;
    const ov = cap.overrides || {};
    setStyle((prev) => ({
      ...prev,
      preset: presetId,
      mainFont:   ov.fontFamily    || prev.mainFont,
      mainSize:   ov.fontSize      != null ? Math.round(ov.fontSize > 1 ? ov.fontSize : ov.fontSize * 1000) : prev.mainSize,
      mainWeight: ov.fontWeight    || prev.mainWeight,
      mainColor:  ov.fontColor     || prev.mainColor,
      mainLetterSpacing: ov.letterSpacing != null ? ov.letterSpacing : prev.mainLetterSpacing,
      shadow: {
        enabled: ov.textShadowEnabled !== undefined ? ov.textShadowEnabled : prev.shadow?.enabled,
        color: ov.textShadowColor || prev.shadow?.color,
        blur:  ov.textShadowBlur  != null ? ov.textShadowBlur : prev.shadow?.blur,
        x: ov.textShadowOffsetX != null ? ov.textShadowOffsetX : prev.shadow?.x,
        y: ov.textShadowOffsetY != null ? ov.textShadowOffsetY : prev.shadow?.y,
      },
      stroke: {
        enabled: ov.strokeEnabled !== undefined ? ov.strokeEnabled : prev.stroke?.enabled,
        color: ov.strokeColor || prev.stroke?.color,
        width: ov.strokeWidth  != null ? ov.strokeWidth : prev.stroke?.width,
      },
      bgBox: ov.bgEnabled !== undefined ? ov.bgEnabled : prev.bgBox,
    }));
    if (ov.animation) upd("animation", ov.animation);
  }

  function handleSave() {
    onSave({ ...s, style });
    onClose();
  }

  // Aspect ratio
  const ratioMap = { "16:9": 16/9, "9:16": 9/16, "1:1": 1 };
  const ar = ratioMap["16:9"]; // default for preview; ideally pass aspectRatio prop

  const PW = 360, PH = Math.round(PW / ar);

  const fontCategories = [...new Set(FONTS.map((f) => f.category))];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center",
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "#12151f", border: "1px solid #2D3748", borderRadius: 16,
        width: 900, maxWidth: "96vw", maxHeight: "94vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "14px 20px", borderBottom: "1px solid #1E2430", flexShrink: 0,
        }}>
          <span style={{ fontSize: 16 }}>⌨</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>씬 {scene?.sceneNumber} 키워드 모션 설정</span>
          <div style={{ flex: 1 }} />
          <button style={{
            background: "rgba(124,58,237,0.2)", border: "1px solid #7C3AED",
            borderRadius: 8, color: "#A78BFA", fontSize: 12, padding: "6px 12px",
            cursor: "pointer", fontFamily: "inherit",
          }}>
            ✨ AI 스타일
          </button>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 8, background: "#1E2430", border: "none",
            color: "#9CA3AF", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ─── LEFT PANEL ─── */}
          <div style={{
            width: 400, minWidth: 400, borderRight: "1px solid #1E2430",
            display: "flex", flexDirection: "column", overflowY: "auto",
          }}>
            {/* Preview */}
            <div style={{ position: "relative", background: "#000", flexShrink: 0 }}>
              <canvas
                ref={canvasRef}
                width={PW} height={PH}
                style={{ display: "block", width: "100%", height: "auto" }}
              />
              <div style={{
                position: "absolute", bottom: 8, left: 8,
                background: "rgba(0,0,0,0.6)", borderRadius: 6,
                fontSize: 10, color: "#9CA3AF", padding: "3px 8px",
              }}>씬 미리보기</div>
            </div>

            <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Enable toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#D1D5DB" }}>이 씬에서 키워드 모션 적용</span>
                <Toggle value={s.enabled} onChange={(v) => upd("enabled", v)} />
              </div>

              {/* Keyword input */}
              <div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 5 }}>키워드 (쉼표 구분)</div>
                <input
                  value={s.keywords}
                  onChange={(e) => upd("keywords", e.target.value)}
                  placeholder="안녕하세요, 반갑습니다..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "#1A1D27", border: "1px solid #374151",
                    borderRadius: 8, padding: "9px 12px", color: "#fff",
                    fontSize: 12, fontFamily: "inherit",
                  }}
                />
                <div style={{ fontSize: 10, color: "#6B7280", marginTop: 4 }}>비어있으면 AI가 자동 추천합니다</div>
              </div>

              {/* Animation grid */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>등장 애니메이션</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 5 }}>
                  {ANIM_GRID.map((a) => {
                    const sel = s.animation === a.id;
                    return (
                      <button key={a.id} onClick={() => upd("animation", a.id)} style={{
                        padding: "7px 4px", borderRadius: 7, cursor: "pointer",
                        background: sel ? "rgba(249,115,22,0.15)" : "#1A1D27",
                        border: sel ? "1px solid #F97316" : "1px solid #2D3748",
                        color: sel ? "#F97316" : "#9CA3AF",
                        fontSize: 11, fontFamily: "inherit", fontWeight: sel ? 700 : 400,
                        transition: "all 0.15s",
                      }}>
                        {a.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Position grid */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>표시 위치</div>
                {/* Default */}
                <button onClick={() => upd("position", "center")} style={{
                  width: "100%", marginBottom: 5, padding: "7px 0", borderRadius: 7, cursor: "pointer",
                  background: s.position === "center" ? "rgba(52,211,153,0.15)" : "#1A1D27",
                  border: s.position === "center" ? "1px solid #34D399" : "1px solid #2D3748",
                  color: s.position === "center" ? "#34D399" : "#9CA3AF",
                  fontSize: 11, fontFamily: "inherit",
                }}>기본값 (중앙)</button>
                {POS_ROWS.map((row, ri) => (
                  <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, marginBottom: 4 }}>
                    {row.map((p) => {
                      const sel = s.position === p.id;
                      return (
                        <button key={p.id} onClick={() => upd("position", p.id)} style={{
                          padding: "6px 4px", borderRadius: 6, cursor: "pointer",
                          background: sel ? "rgba(52,211,153,0.15)" : "#1A1D27",
                          border: sel ? "1px solid #34D399" : "1px solid #2D3748",
                          color: sel ? "#34D399" : "#9CA3AF",
                          fontSize: 10, fontFamily: "inherit", fontWeight: sel ? 700 : 400,
                        }}>
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Sound effects */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>효과음</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {SFX_LIST.map((sfx) => {
                    const sel = s.soundEffect === sfx.id;
                    return (
                      <button key={sfx.id} onClick={() => upd("soundEffect", sfx.id)} style={{
                        padding: "5px 10px", borderRadius: 6, cursor: "pointer",
                        background: sel ? "rgba(249,115,22,0.15)" : "#1A1D27",
                        border: sel ? "1px solid #F97316" : "1px solid #2D3748",
                        color: sel ? "#F97316" : "#9CA3AF",
                        fontSize: 11, fontFamily: "inherit",
                      }}>{sfx.label}</button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ─── RIGHT PANEL ─── */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Text style presets */}
            <div>
              <div style={secLabel}>텍스트 스타일 프리셋</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TEXT_PRESETS.map((p) => {
                  const sel = style.preset === p.id;
                  return (
                    <button key={p.id} onClick={() => applyPreset(p.id)} style={{
                      padding: "7px 12px", borderRadius: 8, cursor: "pointer",
                      background: sel ? "rgba(249,115,22,0.15)" : "#1A1D27",
                      border: sel ? "1px solid #F97316" : "1px solid #2D3748",
                      color: sel ? "#F97316" : "#9CA3AF",
                      fontSize: 11, fontFamily: "inherit", fontWeight: sel ? 700 : 400,
                    }}>{p.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Main keyword style */}
            <div style={card}>
              <SectionHeader icon="Aa" label="메인 키워드" />
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>폰트/크기</div>
              <select value={style.mainFont} onChange={(e) => updStyle("mainFont", e.target.value)}
                style={{ ...selectStyle, marginBottom: 10 }}>
                {fontCategories.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {FONTS.filter((f) => f.category === cat).map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SliderRow label="크기" min={20} max={300} step={1} value={style.mainSize} onChange={(v) => updStyle("mainSize", v)} unit="px" />
                <SliderRow label="굵기" min={100} max={900} step={100} value={style.mainWeight} onChange={(v) => updStyle("mainWeight", v)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>텍스트 색상</span>
                <ColorInput value={style.mainColor} onChange={(v) => updStyle("mainColor", v)} />
              </div>
              <SliderRow label="자간" min={-5} max={20} step={1} value={style.mainLetterSpacing} onChange={(v) => updStyle("mainLetterSpacing", v)} unit="px" />
            </div>

            {/* Sub text style */}
            <div style={card}>
              <SectionHeader icon="Tt" label="서브 텍스트" />
              <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 5 }}>폰트/크기</div>
              <select value={style.subFont || ""} onChange={(e) => updStyle("subFont", e.target.value)}
                style={{ ...selectStyle, marginBottom: 10 }}>
                <option value="">메인과 동일</option>
                {fontCategories.map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {FONTS.filter((f) => f.category === cat).map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <SliderRow label="크기(px)" min={10} max={100} step={1} value={style.subSize} onChange={(v) => updStyle("subSize", v)} unit="px" />
                <SliderRow label="굵기" min={100} max={900} step={100} value={style.subWeight} onChange={(v) => updStyle("subWeight", v)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>색상</span>
                <ColorInput value={style.subColor} onChange={(v) => updStyle("subColor", v)} />
              </div>
              <SliderRow label="자간" min={-5} max={20} step={1} value={style.subLetterSpacing} onChange={(v) => updStyle("subLetterSpacing", v)} unit="px" />
            </div>

            {/* Shadow */}
            <div style={card}>
              <SectionHeader icon="◈" label="그림자" toggle={style.shadow?.enabled} onToggle={(v) => updShadow("enabled", v)} />
              {style.shadow?.enabled && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>색상</span>
                    <ColorInput value={style.shadow?.color || "#000"} onChange={(v) => updShadow("color", v)} />
                    <div style={{ flex: 1, marginLeft: 8 }}>
                      <SliderRow label="블러" min={0} max={40} step={1} value={style.shadow?.blur ?? 12} onChange={(v) => updShadow("blur", v)} unit="px" />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <SliderRow label="X" min={-20} max={20} step={1} value={style.shadow?.x ?? 3} onChange={(v) => updShadow("x", v)} unit="px" />
                    <SliderRow label="Y" min={-20} max={20} step={1} value={style.shadow?.y ?? 3} onChange={(v) => updShadow("y", v)} unit="px" />
                  </div>
                </>
              )}
            </div>

            {/* Stroke */}
            <div style={card}>
              <SectionHeader icon="■" label="Stroke" toggle={style.stroke?.enabled} onToggle={(v) => updStroke("enabled", v)} />
              {style.stroke?.enabled && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: "#9CA3AF" }}>색상</span>
                  <ColorInput value={style.stroke?.color || "#000"} onChange={(v) => updStroke("color", v)} />
                  <div style={{ flex: 1, marginLeft: 8 }}>
                    <SliderRow label="두께" min={0} max={20} step={0.5} value={style.stroke?.width ?? 4} onChange={(v) => updStroke("width", v)} unit="px" />
                  </div>
                </div>
              )}
            </div>

            {/* Glow */}
            <div style={card}>
              <SectionHeader icon="✦" label="글로우" toggle={style.glow} onToggle={(v) => updStyle("glow", v)} />
            </div>

            {/* Gradient */}
            <div style={card}>
              <SectionHeader icon="🎨" label="그라데이션" toggle={style.gradient} onToggle={(v) => updStyle("gradient", v)} />
            </div>

            {/* BG Box */}
            <div style={card}>
              <SectionHeader icon="▣" label="배경 박스" toggle={style.bgBox} onToggle={(v) => updStyle("bgBox", v)} />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", gap: 10, padding: "12px 20px",
          borderTop: "1px solid #1E2430", flexShrink: 0, justifyContent: "flex-end",
        }}>
          <button onClick={onClose} style={{
            padding: "9px 20px", background: "#1A1D27", border: "1px solid #374151",
            borderRadius: 8, color: "#9CA3AF", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}>취소</button>
          <button onClick={handleSave} style={{
            padding: "9px 24px", background: "#F97316", border: "none",
            borderRadius: 8, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          }}>저장</button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────────────────────────────
const secLabel = {
  fontSize: 10, fontWeight: 600, color: "#6B7280",
  textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10,
};

const card = {
  background: "#1A1D27", border: "1px solid #1E2430",
  borderRadius: 10, padding: 12,
};

const selectStyle = {
  width: "100%", background: "#0E1117", border: "1px solid #2D3748",
  borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12,
  fontFamily: "inherit", cursor: "pointer",
};
