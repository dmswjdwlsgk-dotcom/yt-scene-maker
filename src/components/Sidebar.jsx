import { useState } from "react";
import StyleGallery from "./StyleGallery.jsx";
import SubtitleEditor from "./SubtitleEditor.jsx";
import EffectsPanel from "./EffectsPanel.jsx";
import TtsPanel from "./TtsPanel.jsx";
import BgmPanel from "./BgmPanel.jsx";
import KeywordPanel from "./KeywordPanel.jsx";
import { STYLES } from "../lib/styles.js";

const RATIO_OPTIONS = [
  { value: "16:9", label: "16:9", icon: "▬" },
  { value: "9:16", label: "9:16", icon: "▮" },
  { value: "1:1", label: "1:1", icon: "■" },
];

const LANGUAGE_OPTIONS = [
  { value: "Korean", label: "🇰🇷 한국어" },
  { value: "English", label: "🇺🇸 English" },
  { value: "Japanese", label: "🇯🇵 日本語" },
  { value: "Chinese", label: "🇨🇳 中文" },
  { value: "None", label: "🚫 텍스트 최소" },
];

const IMAGE_MODELS = [
  { id: "Nano1 (gemini-2.5-flash-image)", name: "나노바나나1", desc: "가장 빠르고 저렴", emoji: "🍌" },
  { id: "Fast (Gemini-2.5-pro)", name: "나노바나나2", desc: "빠르고 안정적 (추천)", emoji: "🍌", badge: "추천" },
  { id: "Nano2 Lite (gemini-3.1-flash-lite-image)", name: "나노바나나2 라이트", desc: "나노바나나2보다 더 빠르고 저렴", emoji: "🍌" },
  { id: "Premium (Gemini 3 Pro)", name: "나노바나나 프로", desc: "고화질 (시간 소요)", emoji: "🍌" },
  { id: "Ultra (Imagen 4 Ultra)", name: "Imagen 4 Ultra", desc: "최고 화질 (텍스트 전용)", emoji: "💎" },
];

const SIDEBAR_TABS = [
  { id: "settings", label: "설정", icon: "⚙️" },
  { id: "subtitle", label: "자막", icon: "💬" },
  { id: "effects", label: "효과", icon: "✨" },
  { id: "tts", label: "TTS", icon: "🎙️" },
  { id: "bgm", label: "BGM", icon: "🎵" },
  { id: "keyword", label: "키워드", icon: "🔤" },
];

export default function Sidebar({
  settings, onChange, onApiKeyClick, apiKey,
  subtitle, onSubtitleChange,
  motion, onMotionChange,
  effects, onEffectsChange,
  transition, onTransitionChange,
  bgm, onBgmChange,
  tts, onTtsChange,
  keyword, onKeywordChange,
  bgmFile, onBgmFileChange,
  scenes, onTtsGenerated,
  referenceImage, onReferenceImageChange,
}) {
  const [showGallery, setShowGallery] = useState(false);
  const [activeTab, setActiveTab] = useState("settings");
  const selectedStyle = STYLES.find((s) => s.id === settings.styleId) || STYLES[0];

  return (
    <>
      <div style={{
        width: 280, minWidth: 280,
        background: "#1A1D27",
        borderRight: "1px solid #1E2430",
        display: "flex", flexDirection: "column",
        height: "100vh",
      }}>
        {/* Logo */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1E2430", flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>🎬 AI 씬 생성기</div>
          <div style={{ fontSize: 10, color: "#6B7280", marginTop: 2 }}>YouTube AI Scene Maker</div>
        </div>

        {/* API key */}
        <div style={{ padding: "10px 12px", borderBottom: "1px solid #1E2430", flexShrink: 0 }}>
          <button
            onClick={onApiKeyClick}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#0E1117", border: "1px solid #2D3748", borderRadius: 10,
              padding: "9px 12px", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: 12, color: "#D1D5DB" }}>🔑 API 키 관리</span>
            {apiKey ? (
              <span style={{ fontSize: 10, color: "#34D399", display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399", display: "inline-block" }} />
                연결됨
              </span>
            ) : (
              <span style={{ fontSize: 10, color: "#FBBF24" }}>미설정</span>
            )}
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: "flex", gap: 2, padding: "8px 10px",
          borderBottom: "1px solid #1E2430", flexShrink: 0,
          background: "#0E1117",
        }}>
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              style={{
                flex: 1, padding: "7px 4px",
                borderRadius: 8,
                background: activeTab === tab.id ? "rgba(249,115,22,0.15)" : "transparent",
                border: activeTab === tab.id ? "1px solid rgba(249,115,22,0.4)" : "1px solid transparent",
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              }}
            >
              <span style={{ fontSize: 14 }}>{tab.icon}</span>
              <span style={{ fontSize: 9, color: activeTab === tab.id ? "#F97316" : "#6B7280", fontWeight: activeTab === tab.id ? 700 : 400 }}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* SETTINGS tab */}
          {activeTab === "settings" && (
            <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", gap: 18 }}>

              {/* Image models */}
              <section>
                <div style={sectionLabelStyle}>🖼️ 이미지 생성 모델</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {IMAGE_MODELS.map((m) => {
                    const isSelected = settings.imageModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => onChange({ imageModel: m.id })}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "9px 10px",
                          background: isSelected ? "rgba(249,115,22,0.1)" : "#0E1117",
                          border: `1px solid ${isSelected ? "#F97316" : "#2D3748"}`,
                          borderRadius: 10, cursor: "pointer", textAlign: "left",
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: 18 }}>{m.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: 6 }}>
                            {m.name}
                            {m.badge && (
                              <span style={{ fontSize: 9, background: "rgba(249,115,22,0.2)", color: "#F97316", padding: "1px 5px", borderRadius: 5 }}>
                                {m.badge}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 10, color: "#6B7280" }}>{m.desc}</div>
                        </div>
                        {isSelected && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#F97316", flexShrink: 0 }} />}
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Aspect ratio */}
              <section>
                <div style={sectionLabelStyle}>📐 화면 비율</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {RATIO_OPTIONS.map((r) => {
                    const isSelected = settings.aspectRatio === r.value;
                    return (
                      <button
                        key={r.value}
                        onClick={() => onChange({ aspectRatio: r.value })}
                        style={{
                          flex: 1, padding: "9px 4px", borderRadius: 10, cursor: "pointer",
                          background: isSelected ? "rgba(249,115,22,0.1)" : "#0E1117",
                          border: `2px solid ${isSelected ? "#F97316" : "#2D3748"}`,
                          color: isSelected ? "#F97316" : "#9CA3AF",
                          fontFamily: "inherit", fontWeight: 700,
                        }}
                      >
                        <div style={{ fontSize: 14 }}>{r.icon}</div>
                        <div style={{ fontSize: 10, marginTop: 3 }}>{r.label}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* Scene duration */}
              <section>
                <div style={sectionLabelStyle}>⏱️ 장면 분할 설정</div>
                <div style={{ background: "#0E1117", border: "1px solid #2D3748", borderRadius: 10, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: "#9CA3AF" }}>씬당 예상 지속 시간 (초)</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{settings.sceneDuration}</span>
                  </div>
                  <input
                    type="range" min={5} max={60} step={5}
                    value={settings.sceneDuration}
                    onChange={(e) => onChange({ sceneDuration: Number(e.target.value) })}
                    style={{ width: "100%", accentColor: "#F97316" }}
                  />
                  <p style={{ fontSize: 10, color: "#FBBF24", marginTop: 6 }}>
                    💡 {settings.sceneDuration}초 = 약 {Math.round(settings.sceneDuration * 8)}자 단위
                  </p>
                </div>
              </section>

              {/* Style */}
              <section>
                <div style={sectionLabelStyle}>🎨 영상 장르(Mood) 설정</div>
                <button
                  onClick={() => setShowGallery(true)}
                  style={{
                    width: "100%", textAlign: "left", padding: 12,
                    background: "#0E1117",
                    border: "2px solid #F97316",
                    borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{selectedStyle.emoji}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{selectedStyle.label}</div>
                  <div style={{ fontSize: 10, color: "#6B7280", marginTop: 3, lineHeight: 1.4 }}>{selectedStyle.description}</div>
                  <div style={{ fontSize: 10, color: "#F97316", marginTop: 6 }}>스타일 갤러리 열기 →</div>
                </button>

                {settings.styleId === "custom" && (
                  <textarea
                    style={{
                      marginTop: 8, width: "100%", background: "#0E1117",
                      border: "1px solid #F97316", borderRadius: 10,
                      padding: "10px 12px", color: "#fff", fontSize: 11,
                      resize: "none", fontFamily: "inherit", height: 80,
                      boxSizing: "border-box",
                    }}
                    placeholder="직접 스타일 프롬프트 입력..."
                    value={settings.customPrompt || ""}
                    onChange={(e) => onChange({ customPrompt: e.target.value })}
                  />
                )}
              </section>

              {/* Reference image */}
              <section>
                <div style={{ ...sectionLabelStyle, display: "flex", alignItems: "center", gap: 6 }}>
                  🖼️ 참조 이미지 (선택)
                  <span style={{ fontSize: 9, background: "#F97316", color: "#fff", borderRadius: 4, padding: "1px 5px", fontWeight: 700, letterSpacing: 0 }}>NEW</span>
                </div>
                <div style={{ fontSize: 10, color: "#6B7280", marginBottom: 8, lineHeight: 1.5 }}>
                  캐릭터/배경 일관성 유지용. 업로드 시 모든 씬에 동일한 인물·스타일이 반영됩니다.
                </div>
                {referenceImage ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={referenceImage}
                      alt="참조 이미지"
                      style={{ width: "100%", borderRadius: 10, display: "block", maxHeight: 160, objectFit: "cover", border: "2px solid #F97316" }}
                    />
                    <button
                      onClick={() => onReferenceImageChange(null)}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(0,0,0,0.7)", border: "none",
                        color: "#fff", fontSize: 14, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >×</button>
                    <div style={{ fontSize: 10, color: "#34D399", marginTop: 6, textAlign: "center" }}>✅ 참조 이미지 설정됨 — 모든 씬에 적용</div>
                  </div>
                ) : (
                  <label style={{
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 8, padding: "20px 0", cursor: "pointer",
                    border: "2px dashed #2D3748", borderRadius: 10,
                    background: "#0E1117", transition: "border-color 0.2s",
                  }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "#F97316"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "#2D3748"}
                  >
                    <span style={{ fontSize: 28, opacity: 0.4 }}>🖼</span>
                    <span style={{ fontSize: 11, color: "#6B7280" }}>클릭하여 이미지 로드</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!file.type.startsWith("image/")) { alert("이미지 파일만 업로드할 수 있습니다."); return; }
                        const reader = new FileReader();
                        reader.onload = (ev) => onReferenceImageChange(ev.target.result);
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </section>

              {/* Language */}
              <section>
                <div style={sectionLabelStyle}>🌐 텍스트 언어</div>
                <select
                  value={settings.language}
                  onChange={(e) => onChange({ language: e.target.value })}
                  style={{
                    width: "100%", background: "#0E1117", border: "1px solid #2D3748",
                    borderRadius: 10, padding: "9px 12px", color: "#fff",
                    fontSize: 12, fontFamily: "inherit",
                  }}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </section>

            </div>
          )}

          {/* SUBTITLE tab */}
          {activeTab === "subtitle" && (
            <div style={{ padding: "12px" }}>
              <SubtitleEditor settings={subtitle} onChange={onSubtitleChange} />
            </div>
          )}

          {/* EFFECTS tab */}
          {activeTab === "effects" && (
            <div style={{ padding: "12px" }}>
              <EffectsPanel
                motion={motion}
                effects={effects}
                transition={transition}
                onMotionChange={onMotionChange}
                onEffectsChange={onEffectsChange}
                onTransitionChange={onTransitionChange}
              />
            </div>
          )}

          {/* TTS tab */}
          {activeTab === "tts" && (
            <div style={{ padding: "12px" }}>
              <TtsPanel
                tts={tts}
                onChange={onTtsChange}
              />
            </div>
          )}

          {/* BGM tab */}
          {activeTab === "bgm" && (
            <div style={{ padding: "12px" }}>
              <BgmPanel
                settings={bgm}
                onSettingsChange={onBgmChange}
                bgmFile={bgmFile}
                onBgmFileChange={onBgmFileChange}
              />
            </div>
          )}

          {/* Keyword tab */}
          {activeTab === "keyword" && (
            <div style={{ padding: "12px" }}>
              <KeywordPanel
                settings={keyword}
                onChange={onKeywordChange}
                scenes={scenes}
              />
            </div>
          )}

        </div>
      </div>

      {showGallery && (
        <StyleGallery
          selected={settings.styleId}
          onSelect={(id) => onChange({ styleId: id })}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}

const sectionLabelStyle = {
  fontSize: 10,
  fontWeight: 600,
  color: "#6B7280",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  marginBottom: 8,
};
