import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar.jsx";
import SceneCard from "./components/SceneCard.jsx";
import ApiKeyModal from "./components/ApiKeyModal.jsx";
import ProjectManager from "./components/ProjectManager.jsx";
import ScriptGenerator from "./components/ScriptGenerator.jsx";
import ExportModal from "./components/ExportModal.jsx";
import YoutubeAnalyzer from "./components/YoutubeAnalyzer.jsx";
import {
  loadApiKey,
  loadVertexKey,
  loadSupertoneKey,
  loadPexelsKey,
  loadPixabayKey,
  saveSettings,
  loadSettings,
  saveProject,
  generateId,
  saveSubtitleSettings, loadSubtitleSettings,
  saveMotionSettings, loadMotionSettings,
  saveEffectsSettings, loadEffectsSettings,
  saveTransitionSettings, loadTransitionSettings,
  saveBgmSettings, loadBgmSettings,
  saveTtsSettings, loadTtsSettings,
  saveKeywordSettings, loadKeywordSettings,
} from "./lib/storage.js";
import {
  DEFAULT_SUBTITLE,
  DEFAULT_MOTION,
  DEFAULT_EFFECTS,
  DEFAULT_TRANSITION,
  DEFAULT_BGM,
  DEFAULT_TTS,
  DEFAULT_KEYWORD,
} from "./lib/defaults.js";
import JSZip from "jszip";
import {
  initGemini,
  initVertex,
  splitScriptIntoScenes,
  suggestTitles,
  generateSceneImage,
  generateGrokPrompts,
} from "./lib/gemini.js";
import { generateTtsForScene } from "./lib/tts.js";

const DEFAULT_SETTINGS = {
  styleId: "auto",
  aspectRatio: "16:9",
  sceneDuration: 20,
  language: "Korean",
  imageModel: "Fast (Gemini-2.5-pro)",
  customPrompt: "",
};

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings() || DEFAULT_SETTINGS);
  const [apiKey, setApiKey] = useState(() => loadApiKey());
  const [supertoneKey, setSupertoneKey] = useState(() => loadSupertoneKey());
  const [pexelsKey, setPexelsKey] = useState(() => loadPexelsKey());
  const [pixabayKey, setPixabayKey] = useState(() => loadPixabayKey());
  const [showApiModal, setShowApiModal] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [activeTab, setActiveTab] = useState("scene");

  const [subtitle, setSubtitle] = useState(() => ({ ...DEFAULT_SUBTITLE, ...loadSubtitleSettings() }));
  const [motion, setMotion] = useState(() => ({ ...DEFAULT_MOTION, ...loadMotionSettings() }));
  const [effects, setEffects] = useState(() => ({ ...DEFAULT_EFFECTS, ...loadEffectsSettings() }));
  const [transition, setTransition] = useState(() => ({ ...DEFAULT_TRANSITION, ...loadTransitionSettings() }));
  const [bgm, setBgm] = useState(() => ({ ...DEFAULT_BGM, ...loadBgmSettings() }));
  const [tts, setTts] = useState(() => ({ ...DEFAULT_TTS, ...loadTtsSettings() }));
  const [keyword, setKeyword] = useState(() => ({ ...DEFAULT_KEYWORD, ...loadKeywordSettings() }));
  const [bgmFile, setBgmFile] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sceneMotionSettings, setSceneMotionSettings] = useState({});

  const [projectId] = useState(() => generateId());
  const [title, setTitle] = useState("");
  const [country, setCountry] = useState("");
  const [script, setScript] = useState("");
  const [scenes, setScenes] = useState([]);

  const [isSplitting, setIsSplitting] = useState(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [isSuggestingTitles, setIsSuggestingTitles] = useState(false);
  const [isTtsAll, setIsTtsAll] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [splitError, setSplitError] = useState("");
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [grokPrompts, setGrokPrompts] = useState("");
  const [isGrokGenerating, setIsGrokGenerating] = useState(false);
  const [showGrokModal, setShowGrokModal] = useState(false);
  const abortRef = useRef(false);
  const scenesRef = useRef(scenes);
  const batchFileRef = useRef(null);

  useEffect(() => { scenesRef.current = scenes; }, [scenes]);
  useEffect(() => {
    if (apiKey) {
      initGemini(apiKey);
      const vertexKey = loadVertexKey();
      if (vertexKey) initVertex(vertexKey);
    }
  }, [apiKey]);
  useEffect(() => { saveSettings(settings); }, [settings]);
  useEffect(() => { saveSubtitleSettings(subtitle); }, [subtitle]);
  useEffect(() => { saveMotionSettings(motion); }, [motion]);
  useEffect(() => { saveEffectsSettings(effects); }, [effects]);
  useEffect(() => { saveTransitionSettings(transition); }, [transition]);
  useEffect(() => { saveBgmSettings(bgm); }, [bgm]);
  useEffect(() => { saveTtsSettings(tts); }, [tts]);
  useEffect(() => { saveKeywordSettings(keyword); }, [keyword]);
  useEffect(() => {
    if (scenes.length > 0) {
      try {
        saveProject({ id: projectId, title: title || "제목 없음", script, country, scenes, settings });
      } catch (e) {
        console.warn("자동 저장 실패:", e);
      }
    }
  }, [scenes, title]);

  function updateSettings(partial) {
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  function handleApiKeySet(key) {
    setApiKey(key);
    setSupertoneKey(loadSupertoneKey());
    setPexelsKey(loadPexelsKey());
    setPixabayKey(loadPixabayKey());
    setShowApiModal(false);
  }

  function handleLoadProject(project) {
    setTitle(project.title || "");
    setScript(project.script || "");
    setScenes(project.scenes || []);
    if (project.settings) setSettings(project.settings);
    if (project.country) setCountry(project.country);
  }

  // 프롬프트만: 씬 분할만 (이미지 생성 없음)
  async function handlePromptsOnly() {
    if (!script.trim()) return;
    if (!apiKey) { setShowApiModal(true); return; }
    setIsSplitting(true);
    setSplitError("");
    try {
      const rawScenes = await splitScriptIntoScenes(script, settings.sceneDuration);
      setScenes(rawScenes.map((s) => ({ ...s, id: generateId(), status: "pending", imageBase64: null, imagePrompt: null, error: null })));
    } catch (err) {
      setSplitError(err.message);
    } finally {
      setIsSplitting(false);
    }
  }

  // 이미지 생성 옵션 (공통)
  function getImageOptions() {
    return { topic: title, styleId: settings.styleId, aspectRatio: settings.aspectRatio, language: settings.language, country, customPrompt: settings.customPrompt, imageModel: settings.imageModel };
  }

  // SCENE 생성: 씬 분할 + 이미지 병렬 자동 생성 (3개 동시)
  async function handleSplitAndGenerate() {
    if (!script.trim()) return;
    if (!apiKey) { setShowApiModal(true); return; }
    setIsSplitting(true);
    setSplitError("");
    let newScenes;
    try {
      const rawScenes = await splitScriptIntoScenes(script, settings.sceneDuration);
      newScenes = rawScenes.map((s) => ({ ...s, id: generateId(), status: "pending", imageBase64: null, imagePrompt: null, error: null }));
      setScenes(newScenes);
    } catch (err) {
      setSplitError(err.message);
      setIsSplitting(false);
      return;
    }
    setIsSplitting(false);

    abortRef.current = false;
    setIsGeneratingAll(true);
    setGenerationProgress({ current: 0, total: newScenes.length });

    const CONCURRENCY = 3;
    const queue = [...newScenes];
    let completed = 0;
    const opts = getImageOptions();

    const worker = async () => {
      while (queue.length > 0 && !abortRef.current) {
        const scene = queue.shift();
        if (!scene) break;
        setScenes((prev) => prev.map((s) => s.sceneNumber === scene.sceneNumber ? { ...s, status: "generating", error: null } : s));
        try {
          const { imagePrompt, imageBase64 } = await generateSceneImage(scene, opts);
          setScenes((prev) => prev.map((s) => s.sceneNumber === scene.sceneNumber ? { ...s, status: "done", imageBase64, imagePrompt, error: null } : s));
        } catch (err) {
          setScenes((prev) => prev.map((s) => s.sceneNumber === scene.sceneNumber ? { ...s, status: "error", error: err.message } : s));
        }
        completed++;
        setGenerationProgress({ current: completed, total: newScenes.length });
      }
    };

    await Promise.all(Array(Math.min(CONCURRENCY, newScenes.length)).fill(null).map(() => worker()));
    setIsGeneratingAll(false);
  }

  async function generateSingleScene(sceneNumber) {
    if (!apiKey) { setShowApiModal(true); return; }
    setScenes((prev) => prev.map((s) => s.sceneNumber === sceneNumber ? { ...s, status: "generating", error: null } : s));
    try {
      const scene = scenesRef.current.find((s) => s.sceneNumber === sceneNumber);
      if (!scene) return;
      const { imagePrompt, imageBase64 } = await generateSceneImage(scene, {
        topic: title, styleId: settings.styleId, aspectRatio: settings.aspectRatio,
        language: settings.language, country, customPrompt: settings.customPrompt,
        imageModel: settings.imageModel,
      });
      setScenes((prev) => prev.map((s) => s.sceneNumber === sceneNumber ? { ...s, status: "done", imageBase64, imagePrompt, error: null } : s));
    } catch (err) {
      setScenes((prev) => prev.map((s) => s.sceneNumber === sceneNumber ? { ...s, status: "error", error: err.message } : s));
    }
  }

  async function handleGenerateAll() {
    if (!apiKey) { setShowApiModal(true); return; }
    if (scenes.length === 0) return;
    abortRef.current = false;
    setIsGeneratingAll(true);
    const pendingScenes = scenesRef.current.filter((s) => s.status !== "done");
    setGenerationProgress({ current: 0, total: pendingScenes.length });
    let completed = 0;
    const queue = [...pendingScenes];
    const CONCURRENCY = 3;
    const worker = async () => {
      while (queue.length > 0 && !abortRef.current) {
        const scene = queue.shift();
        if (!scene) break;
        await generateSingleScene(scene.sceneNumber);
        completed++;
        setGenerationProgress({ current: completed, total: pendingScenes.length });
      }
    };
    await Promise.all(Array(Math.min(CONCURRENCY, pendingScenes.length)).fill(null).map(() => worker()));
    setIsGeneratingAll(false);
  }

  function handleStopGeneration() {
    abortRef.current = true;
    setIsGeneratingAll(false);
  }

  async function handleDownloadZip() {
    const doneScenes = scenes.filter((s) => s.imageBase64);
    if (doneScenes.length === 0) { alert("다운로드할 이미지가 없습니다."); return; }
    const zip = new JSZip();
    doneScenes.forEach((s) => {
      const base64 = s.imageBase64.split(",")[1];
      zip.file(`scene_${s.sceneNumber}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "all_images.zip";
    a.click();
  }

  function handleDownloadPromptsTxt() {
    const lines = scenes.map((s) =>
      `[씬 ${s.sceneNumber}]\n대본: ${s.script}${s.imagePrompt ? `\n프롬프트: ${s.imagePrompt}` : ""}`
    ).join("\n\n---\n\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${title || "prompts"}_prompts.txt`;
    a.click();
  }

  async function handleBatchFileUpload(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const updates = [];
    for (let i = 0; i < Math.min(files.length, scenes.length); i++) {
      const file = files[i];
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target.result);
        reader.readAsDataURL(file);
      });
      updates.push({ sceneNumber: scenes[i].sceneNumber, base64 });
    }
    setScenes((prev) => prev.map((s) => {
      const u = updates.find((u) => u.sceneNumber === s.sceneNumber);
      return u ? { ...s, imageBase64: u.base64, status: "done" } : s;
    }));
    e.target.value = "";
  }

  async function handleTtsAll() {
    if (!tts || (!tts.voiceId && tts.ttsEngine === "supertone")) {
      alert("사이드바 TTS 탭에서 음성을 선택해주세요.");
      return;
    }
    if (tts.ttsEngine === "supertone" && !supertoneKey) {
      setShowApiModal(true);
      return;
    }
    const pending = scenes.filter((s) => s.script && !s.ttsAudio);
    if (!pending.length) { alert("생성할 TTS가 없습니다."); return; }
    setIsTtsAll(true);
    for (const scene of pending) {
      try {
        const audio = await generateTtsForScene(scene, tts, supertoneKey);
        setScenes((prev) => prev.map((s) => s.id === scene.id ? { ...s, ttsAudio: audio } : s));
      } catch (err) {
        console.error(`씬 ${scene.sceneNumber} TTS 실패:`, err.message);
      }
    }
    setIsTtsAll(false);
  }

  async function handleGrokPrompts() {
    if (!apiKey) { setShowApiModal(true); return; }
    const withPrompts = scenes.filter((s) => s.imagePrompt);
    if (withPrompts.length === 0) { alert("먼저 이미지 프롬프트를 생성해주세요."); return; }
    setIsGrokGenerating(true);
    try {
      const result = await generateGrokPrompts(withPrompts);
      setGrokPrompts(result);
      setShowGrokModal(true);
    } catch (err) {
      alert("프롬프트 생성 중 오류: " + err.message);
    } finally {
      setIsGrokGenerating(false);
    }
  }

  function handleDownloadGrokTxt() {
    const text = `[SCENE SCRIPTS]\n\n${scenes.map((s, i) => `${i + 1}. ${s.script}`).join("\n\n")}\n\n------------------------------------------------\n\n[VIDEO PROMPTS]\n\n${grokPrompts}`;
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "video_prompts.txt";
    a.click();
  }

  function handleDeleteScene(sceneNumber) {
    setScenes((prev) => prev.filter((s) => s.sceneNumber !== sceneNumber).map((s, i) => ({ ...s, sceneNumber: i + 1 })));
  }

  function handleScriptChange(sceneNumber, newScript) {
    setScenes((prev) => prev.map((s) => s.sceneNumber === sceneNumber ? { ...s, script: newScript, status: "pending", imageBase64: null, imagePrompt: null } : s));
  }

  async function handleSuggestTitles() {
    if (!apiKey) { setShowApiModal(true); return; }
    if (!title && !script) return;
    setIsSuggestingTitles(true);
    try {
      const suggestions = await suggestTitles(title || script.slice(0, 100), "info");
      setTitleSuggestions(suggestions);
    } catch (err) {
      console.error("제목 추천 실패:", err);
    } finally {
      setIsSuggestingTitles(false);
    }
  }

  function handleTtsGenerated(sceneId, dataUrl) {
    setScenes((prev) => prev.map((s) => s.id === sceneId ? { ...s, ttsAudio: dataUrl } : s));
  }

  function handleImageSelected(sceneNumber, base64) {
    setScenes((prev) => prev.map((s) => s.sceneNumber === sceneNumber ? { ...s, imageBase64: base64, status: "done" } : s));
  }

  function handleSceneMotionSave(sceneNumber, settings) {
    setSceneMotionSettings((prev) => ({ ...prev, [sceneNumber]: settings }));
  }

  const doneCount = scenes.filter((s) => s.status === "done").length;
  const estimatedScenes = script.length > 0 ? Math.max(1, Math.ceil(script.length / (settings.sceneDuration * 7))) : 0;
  const isWorking = isSplitting || isGeneratingAll;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0E1117", color: "#fff", overflow: "hidden" }}>
      <Sidebar
        settings={settings}
        onChange={updateSettings}
        onApiKeyClick={() => setShowApiModal(true)}
        apiKey={apiKey}
        subtitle={subtitle}
        onSubtitleChange={setSubtitle}
        motion={motion}
        onMotionChange={setMotion}
        effects={effects}
        onEffectsChange={setEffects}
        transition={transition}
        onTransitionChange={setTransition}
        bgm={bgm}
        onBgmChange={setBgm}
        tts={tts}
        onTtsChange={setTts}
        keyword={keyword}
        onKeywordChange={setKeyword}
        bgmFile={bgmFile}
        onBgmFileChange={setBgmFile}
        scenes={scenes}
        supertoneKey={supertoneKey}
        onTtsGenerated={handleTtsGenerated}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 24px", borderBottom: "1px solid #1E2430", background: "#0E1117" }}>
          <button onClick={() => setShowProjectManager(true)} style={btnStyle}>
            📁 프로젝트 관리
          </button>

          <div style={{ display: "flex", gap: 4, background: "#1F2128", borderRadius: 12, padding: 4 }}>
            {[
              { id: "scene", label: "SCENE 생성기" },
              { id: "script", label: "대본 생성기" },
              { id: "youtube", label: "YouTube 분석" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "7px 16px", borderRadius: 9,
                  background: activeTab === tab.id ? "#F97316" : "transparent",
                  color: activeTab === tab.id ? "#fff" : "#9CA3AF",
                  fontWeight: activeTab === tab.id ? 700 : 400,
                  fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {!apiKey ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#FBBF24", fontSize: 13 }}>
                ⚠️ API 키 필요
                <button onClick={() => setShowApiModal(true)} style={{ ...btnStyle, fontSize: 11, padding: "4px 10px", color: "#FBBF24", borderColor: "#FBBF24" }}>
                  설정
                </button>
              </div>
            ) : (
              <span style={{ fontSize: 12, color: "#6B7280" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#34D399", marginRight: 6 }} />
                Gemini 연결됨
              </span>
            )}
          </div>
        </div>

        {/* 대본 생성기 탭 */}
        {activeTab === "script" && (
          <ScriptGenerator
            apiKey={apiKey}
            onApiKeyClick={() => setShowApiModal(true)}
            onUseScript={(newTitle, newScript) => {
              setTitle(newTitle);
              setScript(newScript);
              setActiveTab("scene");
            }}
          />
        )}

        {/* YouTube 분석 탭 */}
        {activeTab === "youtube" && (
          <YoutubeAnalyzer
            apiKey={apiKey}
            onApiKeyClick={() => setShowApiModal(true)}
            language={settings.language}
            sceneDuration={settings.sceneDuration}
            onUseScript={(newTitle, newScript) => {
              setTitle(newTitle);
              setScript(newScript);
              setActiveTab("scene");
            }}
          />
        )}

        {/* SCENE 생성기 탭 */}
        {activeTab === "scene" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px 48px" }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1 }}>
                AI SCENE <span style={{ color: "#F97316" }}>GENERATOR</span>
              </h1>
              <p style={{ color: "#6B7280", fontSize: 13, marginTop: 6 }}>유튜브 씬 메이커 크리에이티브 스튜디오</p>
            </div>

            {/* Step 1: Topic */}
            <div style={cardStyle}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={badgeStyle}>1</div>
                <h2 style={{ fontSize: 17, fontWeight: 700 }}>영상 주제 (제목)</h2>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="예: 부자들의 5가지 습관, 강남 아파트의 몰락"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <button
                  onClick={handleSuggestTitles}
                  disabled={isSuggestingTitles}
                  style={{ ...btnStyle, color: "#F97316", borderColor: "#F97316", whiteSpace: "nowrap" }}
                >
                  {isSuggestingTitles ? "생성 중..." : "✨ 제목 추천"}
                </button>
              </div>
              {titleSuggestions.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {titleSuggestions.map((t, i) => (
                    <button key={i} onClick={() => { setTitle(t); setTitleSuggestions([]); }} style={{ ...inputStyle, textAlign: "left", cursor: "pointer", padding: "10px 14px", fontSize: 13 }}>
                      {t}
                    </button>
                  ))}
                  <button onClick={() => setTitleSuggestions([])} style={{ color: "#6B7280", fontSize: 11, background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>닫기</button>
                </div>
              )}
            </div>

            {/* Country */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 18 }}>🌍</span>
                <h2 style={{ fontSize: 15, fontWeight: 700 }}>국가 설정 (Country Setting)</h2>
              </div>
              <input
                style={{ ...inputStyle, width: "100%" }}
                placeholder="예: 일본, 태국, 프랑스, USA..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
              <p style={{ color: "#6B7280", fontSize: 11, marginTop: 8 }}>
                이미지에서 거리 간판, 포지션 배경 등이 해당 국가의 언어로 표현됩니다.
              </p>
            </div>

            {/* Step 2: Script */}
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={badgeStyle}>2</div>
                  <h2 style={{ fontSize: 17, fontWeight: 700 }}>대본 입력</h2>
                </div>
                {script && (
                  <button onClick={() => setScript("")} style={{ color: "#6B7280", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}>
                    지우기
                  </button>
                )}
              </div>
              <textarea
                style={{ ...inputStyle, width: "100%", height: 220, resize: "vertical", fontSize: 13, lineHeight: 1.7 }}
                placeholder="대본을 붙여넣으세요. (자동으로 장면이 분할됩니다)"
                value={script}
                onChange={(e) => setScript(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: "#6B7280", fontSize: 11 }}>{script.length}자</span>
                {script.length > 0 && (
                  <span style={{ color: "#6B7280", fontSize: 11 }}>
                    예상 씬 수: ~{estimatedScenes}개
                  </span>
                )}
              </div>
            </div>

            {/* Action button row */}
            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "stretch" }}>
              {/* SCENE 생성 */}
              <button
                onClick={handleSplitAndGenerate}
                disabled={isWorking || !script.trim()}
                style={{
                  flex: 3, minWidth: 200, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "16px 20px",
                  background: isWorking || !script.trim() ? "#4B5563" : "linear-gradient(90deg, #F97316, #EF4444)",
                  color: "#fff", fontWeight: 800, fontSize: 16, borderRadius: 16,
                  border: "none", cursor: isWorking || !script.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                {isSplitting ? (
                  <><Spinner /> 장면 분할 중...</>
                ) : isGeneratingAll ? (
                  <><Spinner /> 생성 중... {generationProgress.current}/{generationProgress.total}</>
                ) : (
                  "▶ SCENE 생성"
                )}
              </button>

              {/* 프롬프트만 */}
              <button
                onClick={handlePromptsOnly}
                disabled={isWorking || !script.trim()}
                style={{
                  padding: "16px 20px",
                  background: isWorking || !script.trim() ? "#374151" : "#7C3AED",
                  color: "#fff", fontWeight: 700, fontSize: 14, borderRadius: 16,
                  border: "none", cursor: isWorking || !script.trim() ? "not-allowed" : "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                {isSplitting ? <Spinner /> : "📝 프롬프트만"}
              </button>

              {/* After scenes exist */}
              {scenes.length > 0 && (
                <>
                  <button
                    onClick={handleDownloadPromptsTxt}
                    style={{
                      padding: "16px 16px", background: "#065F46", border: "none",
                      color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 16,
                      cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", lineHeight: 1.4,
                    }}
                  >
                    📄 프롬프트 TXT 다운로드<br />
                    <span style={{ fontSize: 11, opacity: 0.8 }}>({scenes.length}개)</span>
                  </button>

                  <label style={{
                    padding: "16px 16px", background: "#1E40AF", border: "none",
                    color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 16,
                    cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                    lineHeight: 1.4, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  }}>
                    📁 파일 일괄불러오기<br />
                    <span style={{ fontSize: 11, opacity: 0.8 }}>이미지+영상</span>
                    <input
                      ref={batchFileRef}
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      onChange={handleBatchFileUpload}
                      style={{ display: "none" }}
                    />
                  </label>

                  {(pexelsKey || pixabayKey) && (
                    <button
                      onClick={() => alert("스톡 영상 일괄 검색은 각 씬 카드의 🔍 버튼을 이용해주세요.")}
                      style={{
                        padding: "16px 16px", background: "#064E3B", border: "none",
                        color: "#fff", fontWeight: 700, fontSize: 12, borderRadius: 16,
                        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", lineHeight: 1.4,
                      }}
                    >
                      🎬 스톡 영상 일괄<br />
                      <span style={{ fontSize: 11, opacity: 0.8 }}>Pexels+Pixabay</span>
                    </button>
                  )}
                </>
              )}

              {/* Scene count */}
              {estimatedScenes > 0 && (
                <div style={{
                  padding: "12px 20px", background: "#1F2128", border: "1px solid #2D3748",
                  borderRadius: 16, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", minWidth: 100,
                }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>예상 생성 갯수</span>
                  <div>
                    <span style={{ fontSize: 26, fontWeight: 900, color: "#F97316" }}>{estimatedScenes}</span>
                    <span style={{ fontSize: 11, color: "#9CA3AF", marginLeft: 4 }}>장면(Scene)</span>
                  </div>
                </div>
              )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {splitError && (
              <div style={{ marginTop: 12, padding: "12px 16px", background: "#450A0A", border: "1px solid #991B1B", borderRadius: 12, color: "#FCA5A5", fontSize: 13 }}>
                ❌ {splitError}
              </div>
            )}

            {/* Scenes */}
            {scenes.length > 0 && (
              <div style={{ marginTop: 32 }}>
                {/* Section header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 28, background: "#F97316", borderRadius: 4 }} />
                  <h2 style={{ fontSize: 17, fontWeight: 700 }}>
                    생성 결과 <span style={{ color: "#6B7280", fontWeight: 400 }}>({scenes.length} Scenes)</span>
                  </h2>
                  {doneCount > 0 && (
                    <span style={{ color: "#34D399", fontSize: 13 }}>✅ {doneCount}/{scenes.length}</span>
                  )}
                </div>

                {/* Scene action bar */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <button
                    onClick={handleTtsAll}
                    disabled={isTtsAll}
                    style={{ ...actionBtnStyle, background: "#1E3A5F", opacity: isTtsAll ? 0.7 : 1 }}
                  >
                    {isTtsAll ? <><Spinner sm /> TTS 생성 중...</> : "🎙 TTS 일괄 생성"}
                  </button>
                  <button
                    onClick={handleGrokPrompts}
                    disabled={isGrokGenerating}
                    style={{ ...actionBtnStyle, background: "#312E81", opacity: isGrokGenerating ? 0.7 : 1 }}
                  >
                    {isGrokGenerating ? <><Spinner sm /> 생성 중...</> : "🎥 그록 프롬프트"}
                  </button>
                  <button
                    onClick={handleDownloadZip}
                    style={{ ...actionBtnStyle, background: "#065F46" }}
                  >
                    💾 전체 다운 (ZIP)
                  </button>
                  {isGeneratingAll ? (
                    <button
                      onClick={handleStopGeneration}
                      style={{ ...actionBtnStyle, background: "#DC2626" }}
                    >
                      ⏹ 중지 ({generationProgress.current}/{generationProgress.total})
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateAll}
                      style={{ ...actionBtnStyle, background: "linear-gradient(90deg, #F97316, #EF4444)" }}
                    >
                      🖼 전체 이미지 생성
                    </button>
                  )}
                  {doneCount > 0 && (
                    <button
                      onClick={() => setShowExportModal(true)}
                      style={{ ...actionBtnStyle, background: "linear-gradient(90deg, #7C3AED, #4338CA)" }}
                    >
                      🎬 영상 내보내기
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {scenes.map((scene) => (
                    <SceneCard
                      key={scene.sceneNumber}
                      scene={scene}
                      aspectRatio={settings.aspectRatio}
                      onRegenerate={generateSingleScene}
                      onDelete={handleDeleteScene}
                      onScriptChange={handleScriptChange}
                      pexelsKey={pexelsKey}
                      pixabayKey={pixabayKey}
                      onImageSelected={handleImageSelected}
                      sceneMotionSettings={sceneMotionSettings[scene.sceneNumber] || null}
                      onSceneMotionSave={handleSceneMotionSave}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showApiModal && <ApiKeyModal onClose={handleApiKeySet} />}
      {showProjectManager && <ProjectManager onLoad={handleLoadProject} onClose={() => setShowProjectManager(false)} />}
      {showExportModal && (
        <ExportModal
          onClose={() => setShowExportModal(false)}
          scenes={scenes}
          settings={settings}
          motion={motion}
          effects={effects}
          subtitle={subtitle}
          transition={transition}
          keyword={keyword}
          bgm={bgm}
          bgmFile={bgmFile}
          title={title}
        />
      )}

      {/* Grok Prompt Modal */}
      {showGrokModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#1A1D27", borderRadius: 20, width: "100%", maxWidth: 680, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid #2D3748" }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>🎥 그록 비디오 프롬프트</h2>
                <p style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>Grok, Runway, Luma 등에 사용할 수 있는 영상 프롬프트</p>
              </div>
              <button onClick={() => setShowGrokModal(false)} style={{ background: "#2D3748", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#9CA3AF", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <textarea
              style={{ flex: 1, margin: 20, background: "#0E1117", border: "1px solid #2D3748", borderRadius: 12, padding: 16, color: "#D1D5DB", fontSize: 13, lineHeight: 1.8, resize: "none", fontFamily: "inherit" }}
              value={grokPrompts}
              onChange={(e) => setGrokPrompts(e.target.value)}
            />
            <div style={{ display: "flex", gap: 10, padding: "0 20px 20px" }}>
              <button
                onClick={() => { navigator.clipboard.writeText(grokPrompts); alert("복사됨!"); }}
                style={{ flex: 1, padding: "12px 0", background: "#4338CA", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
              >
                📋 복사
              </button>
              <button
                onClick={handleDownloadGrokTxt}
                style={{ flex: 1, padding: "12px 0", background: "#065F46", border: "none", borderRadius: 12, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}
              >
                💾 TXT 다운로드
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner({ sm }) {
  const size = sm ? 12 : 18;
  return (
    <span style={{
      display: "inline-block", width: size, height: size,
      border: `${sm ? 2 : 3}px solid #fff`, borderTopColor: "transparent",
      borderRadius: "50%", animation: "spin 0.8s linear infinite",
    }} />
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

const btnStyle = {
  background: "#1F2128",
  border: "1px solid #2D3748",
  borderRadius: 12,
  padding: "8px 14px",
  color: "#D1D5DB",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};

const actionBtnStyle = {
  padding: "8px 14px",
  border: "none",
  borderRadius: 10,
  color: "#fff",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
  display: "flex",
  alignItems: "center",
  gap: 6,
};
