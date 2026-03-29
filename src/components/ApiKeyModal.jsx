// src/components/ApiKeyModal.jsx
import { useState } from "react";
import {
  saveApiKey, loadApiKey,
  saveVertexKey, loadVertexKey,
  savePexelsKey, loadPexelsKey,
  savePixabayKey, loadPixabayKey,
  saveSupertoneKey, loadSupertoneKey,
} from "../lib/storage.js";
import { initGemini, initVertex } from "../lib/gemini.js";

const GCSEARCH_KEY = "yt_scene_maker_gcsearch";
function saveGcsearchKey(k) { if (k) localStorage.setItem(GCSEARCH_KEY, k); else localStorage.removeItem(GCSEARCH_KEY); }
function loadGcsearchKey() { return localStorage.getItem(GCSEARCH_KEY) || ""; }

export default function ApiKeyModal({ onClose }) {
  const [geminiKey, setGeminiKey] = useState(loadApiKey());
  const [vertexKey, setVertexKey] = useState(loadVertexKey());
  const [pexelsKey, setPexelsKey] = useState(loadPexelsKey());
  const [pixabayKey, setPixabayKey] = useState(loadPixabayKey());
  const [supertoneKey, setSupertoneKey] = useState(loadSupertoneKey());
  const [gcsearchKey, setGcsearchKey] = useState(loadGcsearchKey());

  const [saveGemini, setSaveGemini] = useState(!!loadApiKey());
  const [saveVertex, setSaveVertex] = useState(!!loadVertexKey());
  const [error, setError] = useState("");

  const keyCount =
    (geminiKey.trim() ? 1 : 0) +
    (vertexKey.trim() ? 1 : 0) +
    (pexelsKey.trim() ? 1 : 0) +
    (pixabayKey.trim() ? 1 : 0) +
    (supertoneKey.trim() ? 1 : 0) +
    (gcsearchKey.trim() ? 1 : 0);

  function handleSave() {
    if (!geminiKey.trim()) {
      setError("Google Gemini API 키는 필수입니다.");
      return;
    }

    if (saveGemini) saveApiKey(geminiKey.trim());
    else saveApiKey(geminiKey.trim());

    if (saveVertex && vertexKey.trim()) {
      saveVertexKey(vertexKey.trim());
    } else if (!saveVertex) {
      saveVertexKey("");
    }

    savePexelsKey(pexelsKey.trim());
    savePixabayKey(pixabayKey.trim());
    saveSupertoneKey(supertoneKey.trim());
    saveGcsearchKey(gcsearchKey.trim());

    initGemini(geminiKey.trim());
    if (vertexKey.trim()) {
      initVertex(vertexKey.trim());
    } else {
      initVertex("");
    }

    onClose(geminiKey.trim());
  }

  const overlayStyle = {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 16,
  };

  const modalStyle = {
    background: "#1A1D27",
    borderRadius: 20,
    width: "100%", maxWidth: 600,
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
  };

  const sectionStyle = {
    background: "#0E1117",
    border: "1px solid #2D3748",
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  };

  const inputStyle = {
    width: "100%", background: "#1A1D27",
    border: "1px solid #2D3748", borderRadius: 10,
    padding: "12px 14px", color: "#fff",
    fontSize: 14, fontFamily: "inherit",
    marginTop: 12, boxSizing: "border-box",
  };

  const toggleStyle = (on) => ({
    width: 44, height: 24, borderRadius: 12,
    background: on ? "#F97316" : "#374151",
    position: "relative", cursor: "pointer",
    border: "none", transition: "background 0.2s",
    flexShrink: 0,
  });

  const toggleKnob = (on) => ({
    position: "absolute", top: 3, left: on ? 22 : 3,
    width: 18, height: 18, borderRadius: "50%", background: "#fff",
    transition: "left 0.2s",
  });

  const dividerLabel = (text) => (
    <div style={{ textAlign: "center", color: "#6B7280", fontSize: 12, marginBottom: 16, letterSpacing: "0.1em" }}>
      {text}
    </div>
  );

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px 0" }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>🔑 API 키 관리</h2>
            <p style={{ fontSize: 13, color: "#6B7280", marginTop: 4 }}>모든 서비스 API 키를 한곳에서 관리합니다</p>
          </div>
          <button
            onClick={() => onClose(loadApiKey())}
            style={{
              background: "#2D3748", border: "none", borderRadius: 8,
              width: 32, height: 32, cursor: "pointer", color: "#9CA3AF",
              fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: "20px 28px 28px" }}>
          {/* Image generation section */}
          {dividerLabel("이 미 지 생 성")}

          {/* Gemini Key */}
          <div style={{ ...sectionStyle, border: "1px solid #F97316" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#F97316" }}>🔑 Google Gemini API Key</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>이미지 생성, 대본 생성, 프롬프트 생성에 사용됩니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#DC2626", color: "#fff", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>필수</span>
            </div>
            <input
              type="password"
              style={inputStyle}
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              autoFocus
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div>
                <div style={{ fontSize: 13, color: "#D1D5DB", fontWeight: 600 }}>브라우저에 저장</div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>자동 입력 (공용 PC 주의)</div>
              </div>
              <button onClick={() => setSaveGemini(!saveGemini)} style={toggleStyle(saveGemini)}>
                <span style={toggleKnob(saveGemini)} />
              </button>
            </div>
          </div>

          {/* Vertex Key */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#60A5FA" }}>☁️ Vertex AI Express Key</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>입력하면 이미지 생성을 Vertex AI로 전환합니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#374151", color: "#9CA3AF", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>선택</span>
            </div>
            <input
              type="password"
              style={{ ...inputStyle, border: vertexKey ? "1px solid #60A5FA" : "1px solid #2D3748" }}
              placeholder="Vertex AI Express API Key"
              value={vertexKey}
              onChange={(e) => setVertexKey(e.target.value)}
            />
            {vertexKey.trim() && (
              <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(96,165,250,0.1)", borderRadius: 8, fontSize: 11, color: "#60A5FA" }}>
                ☁️ Vertex AI 모드 활성화 — 이미지 생성 시 Vertex AI 엔드포인트를 사용합니다.
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <div style={{ fontSize: 13, color: "#D1D5DB", fontWeight: 600 }}>브라우저에 저장</div>
              <button onClick={() => setSaveVertex(!saveVertex)} style={toggleStyle(saveVertex)}>
                <span style={toggleKnob(saveVertex)} />
              </button>
            </div>
          </div>

          {/* Stock image / video section */}
          {dividerLabel("스 톡 이 미 지 / 영 상")}

          {/* Pexels Key */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#A78BFA" }}>📷 Pexels API Key</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>무료 스톡 이미지·영상 검색에 사용됩니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#374151", color: "#9CA3AF", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>선택</span>
            </div>
            <input
              type="password"
              style={{ ...inputStyle, border: pexelsKey ? "1px solid #A78BFA" : "1px solid #2D3748" }}
              placeholder="Pexels API Key"
              value={pexelsKey}
              onChange={(e) => setPexelsKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
              <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" style={{ color: "#A78BFA" }}>
                pexels.com/api 에서 무료 발급 →
              </a>
            </p>
          </div>

          {/* Pixabay Key */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#34D399" }}>🌿 Pixabay API Key</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>무료 스톡 이미지·영상 검색에 사용됩니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#374151", color: "#9CA3AF", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>선택</span>
            </div>
            <input
              type="password"
              style={{ ...inputStyle, border: pixabayKey ? "1px solid #34D399" : "1px solid #2D3748" }}
              placeholder="Pixabay API Key"
              value={pixabayKey}
              onChange={(e) => setPixabayKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
              <a href="https://pixabay.com/api/docs/" target="_blank" rel="noopener noreferrer" style={{ color: "#34D399" }}>
                pixabay.com/api/docs 에서 무료 발급 →
              </a>
            </p>
          </div>

          {/* TTS / Audio section */}
          {dividerLabel("T T S / 음 성")}

          {/* Supertone Key */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FB923C" }}>🎙️ Supertone API Key</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>AI 음성 합성(TTS)에 사용됩니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#374151", color: "#9CA3AF", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>선택</span>
            </div>
            <input
              type="password"
              style={{ ...inputStyle, border: supertoneKey ? "1px solid #FB923C" : "1px solid #2D3748" }}
              placeholder="Supertone API Key"
              value={supertoneKey}
              onChange={(e) => setSupertoneKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
              <a href="https://supertoneapi.com" target="_blank" rel="noopener noreferrer" style={{ color: "#FB923C" }}>
                supertoneapi.com 에서 발급 →
              </a>
            </p>
          </div>

          {/* Google CSE section */}
          {dividerLabel("구 글 이 미 지 검 색")}

          {/* Google CSE Key */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "#FACC15" }}>🔍 Google CSE ID (CX)</h3>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4 }}>Google Custom Search 이미지 검색에 사용됩니다.</p>
              </div>
              <span style={{ fontSize: 11, background: "#374151", color: "#9CA3AF", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>선택</span>
            </div>
            <input
              type="text"
              style={{ ...inputStyle, border: gcsearchKey ? "1px solid #FACC15" : "1px solid #2D3748" }}
              placeholder="Google Custom Search Engine ID (CX)"
              value={gcsearchKey}
              onChange={(e) => setGcsearchKey(e.target.value)}
            />
            <p style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
              <a href="https://programmablesearchengine.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: "#FACC15" }}>
                programmablesearchengine.google.com 에서 발급 →
              </a>
            </p>
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", background: "#450A0A",
              border: "1px solid #991B1B", borderRadius: 10,
              color: "#FCA5A5", fontSize: 13, marginBottom: 16,
            }}>
              ❌ {error}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, color: "#6B7280" }}>
              {keyCount}개 키 등록됨
              {vertexKey.trim() && <span style={{ color: "#60A5FA", marginLeft: 8 }}>☁️ Vertex 활성</span>}
            </span>
            <button
              onClick={handleSave}
              style={{
                padding: "12px 32px",
                background: "linear-gradient(90deg, #F97316, #EF4444)",
                color: "#fff", fontWeight: 800, fontSize: 15,
                borderRadius: 14, border: "none", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              완료
            </button>
          </div>

          <p style={{ textAlign: "center", marginTop: 16 }}>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#F97316", fontSize: 12, textDecoration: "none" }}
            >
              Google AI Studio에서 Gemini API 키 발급 →
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
