// src/components/TtsPanel.jsx — Gemini TTS 전용
import { useState } from "react";

export const GEMINI_VOICES = [
  { name: "Kore",           desc: "단호함",     gender: "여" },
  { name: "Aoede",          desc: "경쾌함",     gender: "여" },
  { name: "Leda",           desc: "젊고 밝음",  gender: "여" },
  { name: "Zephyr",         desc: "밝음",       gender: "여" },
  { name: "Autonoe",        desc: "밝음",       gender: "여" },
  { name: "Callirrhoe",     desc: "편안함",     gender: "여" },
  { name: "Despina",        desc: "부드러움",   gender: "여" },
  { name: "Erinome",        desc: "명확함",     gender: "여" },
  { name: "Laomedeia",      desc: "활기참",     gender: "여" },
  { name: "Achernar",       desc: "부드러움",   gender: "여" },
  { name: "Pulcherrima",    desc: "적극적",     gender: "여" },
  { name: "Vindemiatrix",   desc: "온화함",     gender: "여" },
  { name: "Sulafat",        desc: "따뜻함",     gender: "여" },
  { name: "Sadachbia",      desc: "활발함",     gender: "여" },
  { name: "Puck",           desc: "명랑함",     gender: "남" },
  { name: "Charon",         desc: "정보전달",   gender: "남" },
  { name: "Fenrir",         desc: "활발함",     gender: "남" },
  { name: "Orus",           desc: "단호함",     gender: "남" },
  { name: "Enceladus",      desc: "숨결있음",   gender: "남" },
  { name: "Iapetus",        desc: "명확함",     gender: "남" },
  { name: "Umbriel",        desc: "편안함",     gender: "남" },
  { name: "Algieba",        desc: "부드러움",   gender: "남" },
  { name: "Algenib",        desc: "거칠음",     gender: "남" },
  { name: "Rasalghul",      desc: "정보전달",   gender: "남" },
  { name: "Alnilam",        desc: "단호함",     gender: "남" },
  { name: "Schedar",        desc: "균형잡힘",   gender: "남" },
  { name: "Gacrux",         desc: "성숙함",     gender: "남" },
  { name: "Achird",         desc: "친근함",     gender: "남" },
  { name: "Zubenelgenubi",  desc: "캐주얼",     gender: "남" },
  { name: "Sadaltager",     desc: "지식적",     gender: "남" },
];

const S = {
  section: { background: "#0E1117", border: "1px solid #1E2430", borderRadius: 12, padding: 16, marginBottom: 12 },
  label: { fontSize: 13, color: "#D1D5DB" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  select: { background: "#1A1D27", border: "1px solid #1E2430", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, fontFamily: "inherit", cursor: "pointer" },
};

export default function TtsPanel({ tts, onChange }) {
  const [filter, setFilter] = useState("전체");
  const selectedVoice = tts?.voiceName || "Kore";

  const filtered = filter === "전체" ? GEMINI_VOICES : GEMINI_VOICES.filter(v => v.gender === filter);

  return (
    <div style={{ color: "#fff", fontFamily: "inherit" }}>
      {/* 헤더 */}
      <div style={S.section}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
          🔊 Gemini TTS — 음성 선택
        </div>
        <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 12, lineHeight: 1.5 }}>
          Gemini API 키로 바로 사용. 총 {GEMINI_VOICES.length}개 음성.
        </div>

        {/* 필터 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["전체", "여", "남"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 12, fontFamily: "inherit",
                background: filter === f ? "#F97316" : "#1E2430",
                color: filter === f ? "#fff" : "#9CA3AF",
                fontWeight: filter === f ? 700 : 400,
              }}
            >
              {f === "전체" ? "전체" : f === "여" ? "여성" : "남성"}
            </button>
          ))}
        </div>

        {/* 음성 그리드 */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, maxHeight: 300, overflowY: "auto" }}>
          {filtered.map(v => (
            <button
              key={v.name}
              onClick={() => onChange({ ...tts, voiceName: v.name, ttsEngine: "gemini" })}
              style={{
                padding: "8px 10px", borderRadius: 8, cursor: "pointer", textAlign: "left",
                background: selectedVoice === v.name ? "rgba(249,115,22,0.15)" : "#1A1D27",
                border: selectedVoice === v.name ? "1px solid #F97316" : "1px solid #1E2430",
                color: selectedVoice === v.name ? "#F97316" : "#D1D5DB",
                fontFamily: "inherit",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700 }}>{v.name}</div>
              <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>{v.gender}성 · {v.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, fontSize: 12 }}>
          선택된 음성: <span style={{ color: "#F97316", fontWeight: 700 }}>{selectedVoice}</span>
        </div>
      </div>
    </div>
  );
}
