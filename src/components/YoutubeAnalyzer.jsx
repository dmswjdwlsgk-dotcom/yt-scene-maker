// src/components/YoutubeAnalyzer.jsx
import { useState } from "react";
import { GoogleGenAI } from "@google/genai";

const S = {
  card: {
    background: "#1F2128",
    border: "1px solid #2D3748",
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  input: {
    background: "#0E1117",
    border: "1px solid #2D3748",
    borderRadius: 12,
    padding: "12px 16px",
    color: "#fff",
    fontSize: 14,
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
  },
  btn: (primary) => ({
    padding: "11px 22px",
    background: primary ? "linear-gradient(90deg, #F97316, #EF4444)" : "#1F2128",
    border: primary ? "none" : "1px solid #2D3748",
    borderRadius: 12,
    color: "#fff",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  section: {
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  sub: { fontSize: 11, color: "#6B7280" },
};

function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default function YoutubeAnalyzer({ apiKey, onApiKeyClick, onUseScript, language, sceneDuration }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [splitting, setSplitting] = useState(false);

  async function handleFetch() {
    const videoId = extractVideoId(url.trim());
    if (!videoId) {
      setError("올바른 YouTube URL을 입력해주세요. (예: https://youtube.com/watch?v=...)");
      return;
    }

    setLoading(true);
    setError("");
    setTranscript(null);
    setVideoInfo(null);
    setAnalysisResult(null);

    try {
      // Fetch transcript from server
      const res = await fetch(`/api/transcript/${videoId}?lang=${language === "Japanese" ? "ja" : "ko"}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `서버 오류: ${res.status}`);
      }
      const data = await res.json();
      setTranscript(data);

      // Try to fetch video info via oembed
      try {
        const infoRes = await fetch(`https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`);
        if (infoRes.ok) {
          const info = await infoRes.json();
          setVideoInfo(info);
        }
      } catch {}

    } catch (err) {
      setError(err.message || "자막 추출에 실패했습니다. 로컬 서버(npm run server)가 실행 중인지 확인하세요.");
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    if (!transcript || !apiKey) {
      if (!apiKey) onApiKeyClick?.();
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      const ai = new GoogleGenAI({ apiKey });
      const model = ai.models;

      const prompt = `다음은 YouTube 영상의 자막 텍스트입니다. 이 내용을 분석하여 유튜브 영상 대본 형식으로 재구성해주세요.

[원본 자막]
${transcript.fullText.slice(0, 8000)}

요청사항:
1. 핵심 내용을 파악하고 자연스러운 대본으로 재구성
2. 각 장면을 ${sceneDuration || 20}초 분량으로 나눌 수 있도록 적절히 구성
3. 불필요한 필러 단어 제거
4. 언어: ${language || "Korean"}

결과물 형식:
- 재구성된 대본 텍스트만 출력 (설명 없이)`;

      const response = await model.generateContent({
        model: "gemini-2.0-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const text = response.candidates?.[0]?.content?.parts?.[0]?.text || "";
      setAnalysisResult({
        script: text,
        title: videoInfo?.title || `YouTube 분석 (${extractVideoId(url)})`,
      });
    } catch (err) {
      setError(`분석 실패: ${err.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleUseScript() {
    if (!analysisResult || !onUseScript) return;
    onUseScript(analysisResult.title, analysisResult.script);
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px 48px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, lineHeight: 1.2 }}>
          YouTube <span style={{ color: "#F97316" }}>분석기</span>
        </h1>
        <p style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>
          YouTube 영상 URL을 입력하면 자막을 추출하고 AI가 대본으로 재구성합니다
        </p>
      </div>

      {/* URL input */}
      <div style={S.card}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#9CA3AF", marginBottom: 12 }}>
          📺 YouTube URL 입력
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{ ...S.input, flex: 1 }}
            placeholder="https://www.youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
          <button
            onClick={handleFetch}
            disabled={loading || !url.trim()}
            style={{
              ...S.btn(true),
              opacity: loading || !url.trim() ? 0.6 : 1,
              cursor: loading || !url.trim() ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "추출 중..." : "자막 추출"}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, padding: "10px 14px", background: "#450A0A", border: "1px solid #991B1B", borderRadius: 10, color: "#FCA5A5", fontSize: 12 }}>
            ❌ {error}
          </div>
        )}
        <p style={{ fontSize: 11, color: "#4B5563", marginTop: 10 }}>
          ※ 서버가 실행 중이어야 합니다: <code style={{ color: "#F97316" }}>npm run server</code>
        </p>
      </div>

      {/* Video info */}
      {videoInfo && (
        <div style={S.card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
            {videoInfo.title}
          </div>
          {videoInfo.author_name && (
            <div style={{ fontSize: 12, color: "#6B7280" }}>채널: {videoInfo.author_name}</div>
          )}
          {videoInfo.thumbnail_url && (
            <img
              src={videoInfo.thumbnail_url}
              alt=""
              style={{ marginTop: 12, width: "100%", maxWidth: 480, borderRadius: 12, display: "block" }}
            />
          )}
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>자막 추출 완료</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>
                {transcript.segments.length}개 세그먼트 · {transcript.wordCount.toLocaleString()}자 · 언어: {transcript.language}
              </div>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !apiKey}
              style={{
                ...S.btn(true),
                fontSize: 13,
                opacity: analyzing || !apiKey ? 0.6 : 1,
                cursor: analyzing || !apiKey ? "not-allowed" : "pointer",
              }}
            >
              {analyzing ? "AI 분석 중..." : "🤖 AI 대본 생성"}
            </button>
          </div>

          <div style={{
            background: "#0E1117", border: "1px solid #1E2430",
            borderRadius: 10, padding: 14,
            maxHeight: 240, overflowY: "auto",
            fontSize: 12, color: "#9CA3AF", lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}>
            {transcript.fullText.slice(0, 2000)}{transcript.fullText.length > 2000 ? "..." : ""}
          </div>

          {!apiKey && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "#FBBF24" }}>⚠️ AI 분석을 위해 API 키가 필요합니다</span>
              <button onClick={onApiKeyClick} style={{ ...S.btn(false), fontSize: 11, padding: "5px 12px" }}>
                설정
              </button>
            </div>
          )}
        </div>
      )}

      {/* Analysis result */}
      {analysisResult && (
        <div style={S.card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#34D399" }}>✅ AI 대본 생성 완료</div>
            <button
              onClick={handleUseScript}
              style={{ ...S.btn(true), fontSize: 13 }}
            >
              ▶ 이 대본으로 씬 생성
            </button>
          </div>
          <textarea
            value={analysisResult.script}
            onChange={(e) => setAnalysisResult((prev) => ({ ...prev, script: e.target.value }))}
            style={{
              ...S.input,
              height: 300,
              resize: "vertical",
              lineHeight: 1.7,
              fontSize: 13,
            }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: "#6B7280" }}>
            {analysisResult.script.length}자 · 직접 편집 후 씬 생성 가능
          </div>
        </div>
      )}
    </div>
  );
}
