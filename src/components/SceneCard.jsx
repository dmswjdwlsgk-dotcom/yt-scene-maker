import { useState } from "react";
import ImageSearchModal from "./ImageSearchModal.jsx";
import KeywordMotionModal from "./KeywordMotionModal.jsx";

const STATUS_LABEL = { pending: "대기", generating: "생성 중...", done: "완료", error: "오류" };
const STATUS_COLOR = { pending: "#9CA3AF", generating: "#FBBF24", done: "#34D399", error: "#F87171" };

export default function SceneCard({
  scene, onRegenerate, onDelete, onScriptChange, aspectRatio,
  pexelsKey, pixabayKey, onImageSelected,
  sceneMotionSettings, onSceneMotionSave,
  onTTSGenerate,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(scene.script);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showMotionModal, setShowMotionModal] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);

  const ratioMap = { "16:9": "16/9", "9:16": "9/16", "1:1": "1/1" };
  const ar = ratioMap[aspectRatio] || "16/9";

  function handleSave() {
    onScriptChange(scene.sceneNumber, editedScript);
    setIsEditing(false);
  }

  const kwCount = sceneMotionSettings?.keywords
    ? sceneMotionSettings.keywords.split(",").filter(s => s.trim()).length
    : 0;
  const motionEnabled = sceneMotionSettings?.enabled;

  return (
    <div style={{ background: "#1F2128", borderRadius: 16, overflow: "hidden", border: "1px solid #2D3748" }}>
      {/* Image area */}
      <div style={{ position: "relative", width: "100%", aspectRatio: ar, background: "#0E1117", overflow: "hidden" }}>

        {scene.imageBase64 ? (
          <img
            src={scene.imageBase64}
            alt={`Scene ${scene.sceneNumber}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {scene.status === "generating" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, border: "4px solid #F97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                <span style={{ fontSize: 12, color: "#9CA3AF" }}>이미지 생성 중...</span>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: "#4B5563" }}>
                <span style={{ fontSize: 36 }}>🖼️</span>
                <span style={{ fontSize: 12 }}>이미지 없음</span>
              </div>
            )}
          </div>
        )}

        {/* Scene number badge */}
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8 }}>
          씬 {scene.sceneNumber}
        </div>

        {/* Status badge */}
        <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", color: STATUS_COLOR[scene.status], fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 8 }}>
          {STATUS_LABEL[scene.status] || scene.status}
        </div>

        {/* Generating overlay */}
        {scene.status === "generating" && scene.imageBase64 && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 32, height: 32, border: "4px solid #F97316", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          </div>
        )}

        {/* Error */}
        {scene.status === "error" && scene.error && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(127,29,29,0.9)", color: "#FCA5A5", fontSize: 11, padding: "6px 10px" }}>
            {scene.error}
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: 14 }}>
        {/* Script */}
        {isEditing ? (
          <div>
            <textarea
              style={{ width: "100%", background: "#0E1117", border: "1px solid #F97316", borderRadius: 10, padding: "8px 10px", color: "#fff", fontSize: 12, resize: "none", fontFamily: "inherit", lineHeight: 1.6, height: 80 }}
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              autoFocus
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button onClick={handleSave} style={{ flex: 1, background: "#F97316", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>저장</button>
              <button onClick={() => { setEditedScript(scene.script); setIsEditing(false); }} style={{ flex: 1, background: "#374151", border: "none", borderRadius: 8, color: "#fff", fontSize: 12, padding: "6px 0", cursor: "pointer", fontFamily: "inherit" }}>취소</button>
            </div>
          </div>
        ) : (
          <p
            onClick={() => setIsEditing(true)}
            title="클릭하여 편집"
            style={{ color: "#D1D5DB", fontSize: 12, lineHeight: 1.6, cursor: "pointer", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {scene.script}
          </p>
        )}

        {/* TTS audio player */}
        {scene.ttsAudio && (
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
            <audio controls src={scene.ttsAudio} style={{ flex: 1, height: 32, accentColor: "#F97316" }} />
            <button
              onClick={() => onTTSGenerate && onTTSGenerate(scene.sceneNumber)}
              disabled={ttsLoading}
              style={{ background: "none", border: "none", color: "#6B7280", fontSize: 14, cursor: "pointer", padding: 2 }}
              title="재생성"
            >🔄</button>
          </div>
        )}

        {/* Image prompt */}
        {scene.imagePrompt && (
          <div style={{ marginTop: 10 }}>
            <button onClick={() => setShowPrompt(!showPrompt)} style={{ fontSize: 11, color: "#6B7280", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
              {showPrompt ? "▲ 프롬프트 숨기기" : "▼ 이미지 프롬프트 보기"}
            </button>
            {showPrompt && (
              <p style={{ marginTop: 6, fontSize: 11, color: "#6B7280", background: "#0E1117", borderRadius: 8, padding: 10, lineHeight: 1.6 }}>
                {scene.imagePrompt}
              </p>
            )}
          </div>
        )}

        {/* Main action buttons */}
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <button
            onClick={() => onRegenerate(scene.sceneNumber)}
            disabled={scene.status === "generating"}
            style={{ flex: 1, background: "#0E1117", border: "1px solid #2D3748", borderRadius: 8, color: "#D1D5DB", fontSize: 12, padding: "7px 0", cursor: scene.status === "generating" ? "not-allowed" : "pointer", opacity: scene.status === "generating" ? 0.5 : 1, fontFamily: "inherit" }}
          >
            🔄 다시 그리기
          </button>
          <button
            onClick={() => setShowSearch(true)}
            style={{ background: "#0E1117", border: "1px solid #2D3748", borderRadius: 8, color: "#D1D5DB", fontSize: 12, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit" }}
            title="이미지 검색"
          >
            🔍
          </button>
          {scene.imageBase64 && (
            <a
              href={scene.imageBase64}
              download={`scene_${scene.sceneNumber}.png`}
              style={{ background: "#0E1117", border: "1px solid #2D3748", borderRadius: 8, color: "#D1D5DB", fontSize: 12, padding: "7px 10px", textDecoration: "none", display: "flex", alignItems: "center" }}
              title="이미지 저장"
            >
              ⬇
            </a>
          )}
          <button
            onClick={() => onDelete(scene.sceneNumber)}
            style={{ background: "#0E1117", border: "1px solid #2D3748", borderRadius: 8, color: "#D1D5DB", fontSize: 12, padding: "7px 10px", cursor: "pointer", fontFamily: "inherit" }}
            title="삭제"
          >
            🗑
          </button>
        </div>

        {/* TTS 생성 버튼 */}
        {!scene.ttsAudio && (
          <button
            onClick={async () => {
              if (!onTTSGenerate) return;
              setTtsLoading(true);
              await onTTSGenerate(scene.sceneNumber);
              setTtsLoading(false);
            }}
            disabled={ttsLoading || !scene.script}
            style={{
              width: "100%", marginTop: 6,
              background: "#0E1117", border: "1px solid #2D3748",
              borderRadius: 8, color: ttsLoading ? "#FBBF24" : "#9CA3AF",
              fontSize: 12, padding: "7px 0", cursor: ttsLoading || !scene.script ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: !scene.script ? 0.5 : 1,
            }}
          >
            {ttsLoading
              ? <><span style={{ width: 12, height: 12, border: "2px solid #FBBF24", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> TTS 생성 중...</>
              : "🔊 TTS 음성 생성"}
          </button>
        )}

        {/* Keyword motion button */}
        <button
          onClick={() => setShowMotionModal(true)}
          style={{
            width: "100%", marginTop: 6,
            background: motionEnabled && kwCount > 0 ? "rgba(249,115,22,0.1)" : "#0E1117",
            border: motionEnabled && kwCount > 0 ? "1px solid #F97316" : "1px solid #2D3748",
            borderRadius: 8, color: motionEnabled && kwCount > 0 ? "#F97316" : "#9CA3AF",
            fontSize: 12, padding: "7px 0", cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          ⌨ 키워드 모션
          {kwCount > 0 && (
            <span style={{ background: "#F97316", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>
              {kwCount}
            </span>
          )}
          {!motionEnabled && kwCount > 0 && (
            <span style={{ fontSize: 10, color: "#6B7280" }}>(꺼짐)</span>
          )}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {showSearch && (
        <ImageSearchModal
          onClose={() => setShowSearch(false)}
          onSelect={(result) => {
            if (result.type === "image" && onImageSelected) {
              onImageSelected(scene.sceneNumber, result.base64);
            }
            setShowSearch(false);
          }}
          initialQuery={scene.script?.slice(0, 50) || ""}
          pexelsKey={pexelsKey || ""}
          pixabayKey={pixabayKey || ""}
          aspectRatio={aspectRatio}
        />
      )}

      {showMotionModal && (
        <KeywordMotionModal
          scene={scene}
          settings={sceneMotionSettings}
          onSave={(settings) => onSceneMotionSave && onSceneMotionSave(scene.sceneNumber, settings)}
          onClose={() => setShowMotionModal(false)}
        />
      )}
    </div>
  );
}
