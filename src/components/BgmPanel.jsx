// src/components/BgmPanel.jsx
import { useRef } from "react";
import { DEFAULT_BGM } from "../lib/defaults.js";

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
  slider: { width: "100%", accentColor: "#F97316", cursor: "pointer", marginTop: 6 },
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

export default function BgmPanel({ settings, onSettingsChange, bgmFile, onBgmFileChange }) {
  const s = { ...DEFAULT_BGM, ...settings };
  const fileInputRef = useRef(null);

  function update(key, val) {
    onSettingsChange({ ...s, [key]: val });
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      alert("오디오 파일만 업로드할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (onBgmFileChange) {
        onBgmFileChange({ name: file.name, dataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleRemove() {
    if (onBgmFileChange) onBgmFileChange(null);
  }

  return (
    <div style={S.panel}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
        배경 음악 (BGM)
      </div>
      <div style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
        영상 전체에 재생될 배경 음악을 설정합니다
      </div>

      {/* Enable toggle */}
      <div style={S.section}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>BGM 활성화</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
              영상 렌더링 시 배경 음악을 합성합니다
            </div>
          </div>
          <Toggle value={s.enabled} onChange={(v) => update("enabled", v)} />
        </div>

        {s.enabled && (
          <>
            <hr style={S.divider} />
            {/* Volume */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={S.label}>볼륨</span>
              <span style={S.valueLabel}>{Math.round(s.volume * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.01}
              value={s.volume}
              onChange={(e) => update("volume", parseFloat(e.target.value))}
              style={S.slider}
            />
          </>
        )}
      </div>

      {/* File upload */}
      <div style={S.section}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
          BGM 파일
        </div>

        {bgmFile ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "12px 14px",
            background: "rgba(249,115,22,0.08)",
            border: "1px solid rgba(249,115,22,0.3)",
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 20 }}>🎵</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: "#F97316",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {bgmFile.name}
              </div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>업로드됨</div>
            </div>
            <button
              onClick={handleRemove}
              style={{
                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 7, padding: "5px 10px", color: "#F87171",
                fontSize: 12, cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              제거
            </button>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: "2px dashed #1E2430",
              borderRadius: 10, padding: "24px 16px",
              textAlign: "center", cursor: "pointer",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#F97316")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1E2430")}
          >
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎵</div>
            <div style={{ fontSize: 13, color: "#D1D5DB", fontWeight: 600 }}>
              MP3 파일 업로드
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginTop: 4 }}>
              클릭하여 파일 선택
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: "none" }}
        />

        <div style={{ marginTop: 10, fontSize: 11, color: "#4B5563" }}>
          지원 형식: MP3, WAV, AAC, OGG
        </div>
      </div>

      {/* Info */}
      <div style={{
        padding: "10px 14px",
        background: "rgba(96,165,250,0.05)",
        border: "1px solid rgba(96,165,250,0.15)",
        borderRadius: 10,
        fontSize: 11, color: "#93C5FD",
        lineHeight: 1.6,
      }}>
        BGM은 영상 길이에 맞게 반복 또는 페이드아웃 처리됩니다.
        볼륨은 TTS 음성보다 낮게 설정하는 것을 권장합니다.
      </div>
    </div>
  );
}
