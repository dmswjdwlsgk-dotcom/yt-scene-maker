import { useState } from "react";
import { generateScript } from "../lib/gemini.js";

const GENRES = [
  { value: "economy", label: "경제", description: "슈카월드/지식한입 스타일 경제 분석", icon: "📈" },
  { value: "info",    label: "정보성/지식", description: "사피엔스/과학쿠키 스타일 지식 전달", icon: "💡" },
  { value: "history", label: "역사", description: "지식채널e/별별역사 스타일 역사 다큐", icon: "📜" },
];

const DURATIONS = [
  { value: 10, label: "10분" },
  { value: 15, label: "15분" },
  { value: 20, label: "20분" },
  { value: 25, label: "25분" },
];

export default function ScriptGenerator({ onUseScript, apiKey, onApiKeyClick }) {
  const [topic, setTopic] = useState("");
  const [refScript, setRefScript] = useState("");
  const [genre, setGenre] = useState("info");
  const [duration, setDuration] = useState(15);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // 나만의 장르
  const [showCustomGenre, setShowCustomGenre] = useState(false);
  const [customGenres, setCustomGenres] = useState(() => {
    try { return JSON.parse(localStorage.getItem("custom_genres") || "[]"); } catch { return []; }
  });
  const [newCustomName, setNewCustomName] = useState("");
  const [newCustomGuideline, setNewCustomGuideline] = useState("");
  const [selectedCustomId, setSelectedCustomId] = useState(null);

  const activeGenre = GENRES.find((g) => g.value === genre);
  const activeCustom = customGenres.find((g) => g.id === selectedCustomId);

  async function handleGenerate() {
    if (!topic.trim()) return;
    if (!apiKey) { onApiKeyClick(); return; }
    setIsGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await generateScript({
        topic: topic.trim(),
        genre: selectedCustomId ? "custom" : genre,
        duration,
        additionalNotes,
        customGenreLabel: activeCustom?.name,
        customGuideline: activeCustom?.guideline || (refScript.trim() ? undefined : undefined),
      }, setProgress);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  }

  function saveCustomGenre() {
    if (!newCustomName.trim() || !newCustomGuideline.trim()) return;
    const newGenre = { id: `custom_${Date.now()}`, name: newCustomName.trim(), icon: "📝", guideline: newCustomGuideline.trim() };
    const updated = [...customGenres, newGenre];
    setCustomGenres(updated);
    localStorage.setItem("custom_genres", JSON.stringify(updated));
    setNewCustomName("");
    setNewCustomGuideline("");
    setShowCustomGenre(false);
  }

  function deleteCustomGenre(id) {
    const updated = customGenres.filter((g) => g.id !== id);
    setCustomGenres(updated);
    localStorage.setItem("custom_genres", JSON.stringify(updated));
    if (selectedCustomId === id) setSelectedCustomId(null);
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
          AI 대본 <span style={{ color: "#F97316" }}>GENERATOR</span>
        </h1>
        <p style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>주제를 입력하면 AI가 완성도 높은 유튜브 대본을 작성합니다</p>
      </div>

      {/* Step 1: Topic */}
      <div style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={badgeStyle}>1</div>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>주제 입력</h2>
        </div>
        <input
          style={{ ...inputStyle, width: "100%" }}
          placeholder="예: 2024 한국 부동산 시장 전망, 인공지능의 미래"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </div>

      {/* Step 2: Reference Script */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={badgeStyle}>2</div>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>대본 입력</h2>
          <span style={{ fontSize: 12, color: "#6B7280" }}>(선택 — 참고할 대본이 있으면 붙여넣기)</span>
        </div>
        <textarea
          style={{ ...inputStyle, width: "100%", height: 140, resize: "vertical", fontSize: 13, lineHeight: 1.7 }}
          placeholder="참고할 대본을 붙여넣으세요. AI가 이 대본의 스타일과 구성을 참고하여 새로운 대본을 생성합니다."
          value={refScript}
          onChange={(e) => setRefScript(e.target.value)}
        />
      </div>

      {/* Step 3: Genre & Duration */}
      <div style={{ ...cardStyle, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={badgeStyle}>3</div>
          <h2 style={{ fontSize: 17, fontWeight: 700 }}>장르 & 길이</h2>
        </div>

        {/* Genre */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#D1D5DB" }}>장르</span>
          <button
            onClick={() => setShowCustomGenre(true)}
            style={{ fontSize: 12, color: "#F97316", background: "none", border: "1px solid #F97316", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}
          >
            + 나만의 장르
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {GENRES.map((g) => {
            const isSelected = !selectedCustomId && genre === g.value;
            return (
              <button
                key={g.value}
                onClick={() => { setGenre(g.value); setSelectedCustomId(null); }}
                style={{
                  background: isSelected ? "rgba(249,115,22,0.12)" : "#0E1117",
                  border: `2px solid ${isSelected ? "#F97316" : "#2D3748"}`,
                  borderRadius: 12, padding: "14px 12px", cursor: "pointer",
                  textAlign: "left", fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.label}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, lineHeight: 1.4 }}>{g.description}</div>
              </button>
            );
          })}
          {customGenres.map((g) => {
            const isSelected = selectedCustomId === g.id;
            return (
              <div key={g.id} style={{ position: "relative" }}>
                <button
                  onClick={() => setSelectedCustomId(isSelected ? null : g.id)}
                  style={{
                    width: "100%",
                    background: isSelected ? "rgba(249,115,22,0.12)" : "#0E1117",
                    border: `2px solid ${isSelected ? "#F97316" : "#2D3748"}`,
                    borderRadius: 12, padding: "14px 12px", cursor: "pointer",
                    textAlign: "left", fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{g.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4, lineHeight: 1.4 }}>나만의 장르</div>
                </button>
                <button
                  onClick={() => deleteCustomGenre(g.id)}
                  style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: "#6B7280", fontSize: 14, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>

        {/* Duration */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#D1D5DB", marginBottom: 10 }}>영상 길이</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 16 }}>
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => setDuration(d.value)}
              style={{
                padding: "12px 0", borderRadius: 12,
                background: duration === d.value ? "#F97316" : "#0E1117",
                border: `2px solid ${duration === d.value ? "#F97316" : "#2D3748"}`,
                color: duration === d.value ? "#fff" : "#9CA3AF",
                fontWeight: duration === d.value ? 700 : 400,
                fontSize: 14, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Additional Notes */}
        <div style={{ fontSize: 13, fontWeight: 600, color: "#D1D5DB", marginBottom: 8 }}>추가 지시사항 (선택)</div>
        <textarea
          style={{ ...inputStyle, width: "100%", height: 80, resize: "vertical", fontSize: 13 }}
          placeholder="예: 초보자 대상으로 쉽게 설명, 유머 포함, 통계 데이터 활용..."
          value={additionalNotes}
          onChange={(e) => setAdditionalNotes(e.target.value)}
        />
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !topic.trim()}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          width: "100%", marginTop: 16, padding: "16px 24px",
          background: isGenerating || !topic.trim() ? "#4B5563" : "linear-gradient(90deg, #7C3AED, #4F46E5)",
          color: "#fff", fontWeight: 800, fontSize: 18, borderRadius: 16,
          border: "none", cursor: isGenerating || !topic.trim() ? "not-allowed" : "pointer",
          letterSpacing: 0.5,
        }}
      >
        {isGenerating ? (
          <>
            <span style={{ display: "inline-block", width: 20, height: 20, border: "3px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            {progress || "AI 대본 생성 중..."}
          </>
        ) : "AI 대본 생성 시작"}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {error && (
        <div style={{ marginTop: 12, padding: "12px 16px", background: "#450A0A", border: "1px solid #991B1B", borderRadius: 12, color: "#FCA5A5", fontSize: 13 }}>
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{ ...cardStyle, marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{result.title}</h3>
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                {result.wordCount.toLocaleString()}자 · 예상 {result.estimatedDuration}분
              </span>
            </div>
            <button
              onClick={() => onUseScript(result.title, result.script)}
              style={{
                padding: "10px 20px",
                background: "linear-gradient(90deg, #F97316, #EF4444)",
                color: "#fff", fontWeight: 700, fontSize: 14,
                borderRadius: 12, border: "none", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              이 대본 사용하기 →
            </button>
          </div>

          {/* Outline */}
          {result.outline?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {result.outline.map((sec, i) => (
                <span key={i} style={{ fontSize: 11, padding: "3px 10px", background: "#2D3748", borderRadius: 20, color: "#9CA3AF" }}>
                  {i + 1}. {sec}
                </span>
              ))}
            </div>
          )}

          <textarea
            style={{ ...inputStyle, width: "100%", height: 400, resize: "vertical", fontSize: 13, lineHeight: 1.8 }}
            value={result.script}
            onChange={(e) => setResult((prev) => ({ ...prev, script: e.target.value }))}
          />
        </div>
      )}

      {/* Custom Genre Modal */}
      {showCustomGenre && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1A1D27", borderRadius: 20, width: "100%", maxWidth: 520, padding: 28, boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 20 }}>+ 나만의 장르 만들기</h3>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, color: "#D1D5DB", marginBottom: 6 }}>장르 이름</div>
              <input
                style={{ ...inputStyle, width: "100%" }}
                placeholder="예: 과학, 공포 이야기, 여행..."
                value={newCustomName}
                onChange={(e) => setNewCustomName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#D1D5DB", marginBottom: 6 }}>대본 작성 지침</div>
              <textarea
                style={{ ...inputStyle, width: "100%", height: 160, resize: "vertical", fontSize: 13, lineHeight: 1.6 }}
                placeholder="AI에게 어떤 스타일로 대본을 써달라고 할지 지침을 입력하세요.&#10;예: 공포 영화 해설 채널 스타일로, 긴장감 있는 어조로 서술..."
                value={newCustomGuideline}
                onChange={(e) => setNewCustomGuideline(e.target.value)}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowCustomGenre(false)} style={{ flex: 1, padding: "12px 0", background: "#2D3748", border: "none", borderRadius: 12, color: "#D1D5DB", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                취소
              </button>
              <button onClick={saveCustomGenre} style={{ flex: 1, padding: "12px 0", background: "linear-gradient(90deg, #F97316, #EF4444)", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyle = {
  background: "#1F2128",
  border: "1px solid #2D3748",
  borderRadius: 16,
  padding: 24,
};

const inputStyle = {
  background: "#0E1117",
  border: "1px solid #2D3748",
  borderRadius: 12,
  padding: "12px 16px",
  color: "#fff",
  fontSize: 14,
  fontFamily: "inherit",
};

const badgeStyle = {
  width: 32, height: 32,
  background: "#F97316",
  borderRadius: "50%",
  display: "flex", alignItems: "center", justifyContent: "center",
  color: "#fff", fontWeight: 700, fontSize: 14, flexShrink: 0,
};
