// src/components/ExportModal.jsx
import { useState, useEffect, useRef } from "react";
import { checkServer, exportVideo, downloadMp4 } from "../lib/renderer.js";

const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 300, padding: 16,
  },
  modal: {
    background: "#1A1D27",
    borderRadius: 20,
    width: "100%", maxWidth: 560,
    maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: "1px solid #1E2430",
  },
  body: {
    flex: 1, overflowY: "auto",
    padding: "20px 24px",
  },
  footer: {
    padding: "14px 24px",
    borderTop: "1px solid #1E2430",
    display: "flex", gap: 10,
  },
  section: {
    background: "#0E1117",
    border: "1px solid #1E2430",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  label: { fontSize: 13, color: "#D1D5DB" },
  sub: { fontSize: 11, color: "#6B7280", marginTop: 3 },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  select: {
    background: "#1A1D27", border: "1px solid #1E2430",
    borderRadius: 8, padding: "8px 10px",
    color: "#fff", fontSize: 13, fontFamily: "inherit",
    cursor: "pointer",
  },
};

export default function ExportModal({
  onClose,
  scenes,
  settings,
  motion,
  effects,
  subtitle,
  transition,
  keyword,
  bgm,
  bgmFile,
  title,
}) {
  const [serverStatus, setServerStatus] = useState(null);
  const [fps, setFps] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const abortRef = useRef(false);

  useEffect(() => {
    checkServer().then(setServerStatus);
  }, []);

  const doneScenes = scenes.filter((s) => s.imageBase64);

  async function handleExport() {
    if (!doneScenes.length) return;
    setExporting(true);
    setError("");
    setDone(false);
    abortRef.current = false;

    try {
      const result = await exportVideo({
        scenes: doneScenes,
        settings,
        motion,
        effects,
        subtitle,
        transition,
        keyword,
        bgm,
        bgmFile,
        fps,
        onProgress: (p) => setProgress(p),
        onSceneProgress: (p) => setProgress({ ...p, phase: `씬 ${p.sceneIndex + 1} 렌더링` }),
      });

      downloadMp4(result.mp4, `${title || "video"}.mp4`);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  function getProgressText() {
    if (!progress) return "";
    const { phase, current, total, sceneIndex } = progress;
    if (phase === "scene") return `씬 ${sceneIndex + 1}/${total} 렌더링 시작...`;
    if (phase === "frames") return `프레임 렌더링 ${current}/${total}`;
    if (phase === "encode") return `인코딩 ${current}/${total}`;
    if (phase === "mux") return "오디오 합성 중...";
    if (phase === "concat") return "영상 합치는 중...";
    if (phase === "ffmpeg_wasm") return `FFmpeg WASM 인코딩 ${current}/${total}`;
    return phase || "처리 중...";
  }

  function getProgressPercent() {
    if (!progress) return 0;
    const { current, total } = progress;
    if (current != null && total) return Math.round((current / total) * 100);
    return 50;
  }

  return (
    <div style={S.overlay} onClick={(e) => !exporting && e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>🎬 영상 내보내기</h2>
              <p style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>
                {doneScenes.length}개 씬을 MP4 영상으로 렌더링합니다
              </p>
            </div>
            <button
              onClick={onClose}
              disabled={exporting}
              style={{
                background: "#2D3748", border: "none", borderRadius: 8,
                width: 32, height: 32, cursor: exporting ? "not-allowed" : "pointer",
                color: "#9CA3AF", fontSize: 18,
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              ×
            </button>
          </div>
        </div>

        <div style={S.body}>
          {/* Server status */}
          <div style={S.section}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>
              렌더 서버 상태
            </div>
            {serverStatus === null ? (
              <div style={{ fontSize: 13, color: "#6B7280" }}>서버 확인 중...</div>
            ) : serverStatus.available ? (
              <div style={{ fontSize: 13, color: "#34D399", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#34D399", display: "inline-block" }} />
                로컬 서버 연결됨 (FFmpeg 사용 가능)
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#FBBF24", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FBBF24", display: "inline-block" }} />
                  로컬 서버 미연결 — FFmpeg WASM 폴백 사용
                </div>
                <div style={{ fontSize: 11, color: "#6B7280", marginTop: 6 }}>
                  서버 실행 명령: <code style={{ background: "#1E2430", padding: "2px 6px", borderRadius: 4, color: "#F97316" }}>node server/index.js</code>
                </div>
              </div>
            )}
          </div>

          {/* Export settings */}
          <div style={S.section}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 12 }}>내보내기 설정</div>

            <div style={S.row}>
              <span style={S.label}>해상도</span>
              <span style={{ fontSize: 13, color: "#F97316", fontWeight: 700 }}>
                {settings.aspectRatio === "9:16" ? "1080 × 1920" : settings.aspectRatio === "1:1" ? "1080 × 1080" : "1920 × 1080"}
              </span>
            </div>

            <div style={S.row}>
              <span style={S.label}>프레임레이트</span>
              <select value={fps} onChange={(e) => setFps(Number(e.target.value))} style={S.select}>
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>

            <div style={S.row}>
              <span style={S.label}>씬 수</span>
              <span style={{ fontSize: 13, color: "#D1D5DB" }}>{doneScenes.length}개</span>
            </div>

            <div style={{ ...S.row, marginBottom: 0 }}>
              <span style={S.label}>예상 길이</span>
              <span style={{ fontSize: 13, color: "#D1D5DB" }}>
                약 {Math.round(doneScenes.length * (settings.sceneDuration || 7))}초
              </span>
            </div>
          </div>

          {/* Progress */}
          {exporting && (
            <div style={S.section}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>렌더링 진행 중...</div>
              <div style={{ fontSize: 13, color: "#D1D5DB", marginBottom: 10 }}>{getProgressText()}</div>
              <div style={{ background: "#1E2430", borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div style={{
                  height: "100%", borderRadius: 8,
                  background: "linear-gradient(90deg, #F97316, #EF4444)",
                  width: `${getProgressPercent()}%`,
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          )}

          {/* Done */}
          {done && (
            <div style={{ ...S.section, border: "1px solid #34D399" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#34D399", marginBottom: 4 }}>
                ✅ 내보내기 완료!
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>
                MP4 파일이 다운로드되었습니다.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ ...S.section, border: "1px solid rgba(239,68,68,0.4)" }}>
              <div style={{ fontSize: 13, color: "#FCA5A5" }}>❌ {error}</div>
            </div>
          )}

          {/* Info */}
          {!exporting && !done && (
            <div style={{ padding: "10px 14px", background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, fontSize: 11, color: "#93C5FD", lineHeight: 1.6 }}>
              💡 WebCodecs를 지원하는 브라우저(Chrome, Edge)에서 GPU 가속 인코딩이 가능합니다.
            </div>
          )}
        </div>

        <div style={S.footer}>
          <button
            onClick={onClose}
            disabled={exporting}
            style={{
              flex: 1, padding: "12px 0",
              background: "transparent", border: "1px solid #1E2430",
              borderRadius: 12, color: "#9CA3AF", fontSize: 14,
              cursor: exporting ? "not-allowed" : "pointer",
              fontFamily: "inherit", opacity: exporting ? 0.5 : 1,
            }}
          >
            닫기
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || doneScenes.length === 0}
            style={{
              flex: 2, padding: "12px 0",
              background: exporting || doneScenes.length === 0
                ? "#374151"
                : "linear-gradient(90deg, #F97316, #EF4444)",
              border: "none", borderRadius: 12,
              color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: exporting || doneScenes.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {exporting ? "렌더링 중..." : "🎬 내보내기 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}
