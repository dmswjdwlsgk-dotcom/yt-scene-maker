// Local storage management for projects

const PROJECTS_KEY = "yt_scene_maker_projects";
const SETTINGS_KEY = "yt_scene_maker_settings";
const API_KEY_KEY = "yt_scene_maker_apikey";
const VERTEX_KEY_KEY = "yt_scene_maker_vertexkey";

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_KEY, key);
}

export function loadApiKey() {
  return localStorage.getItem(API_KEY_KEY) || "";
}

export function saveVertexKey(key) {
  if (key) {
    localStorage.setItem(VERTEX_KEY_KEY, key);
  } else {
    localStorage.removeItem(VERTEX_KEY_KEY);
  }
}

export function loadVertexKey() {
  return localStorage.getItem(VERTEX_KEY_KEY) || "";
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSettings() {
  try {
    const s = localStorage.getItem(SETTINGS_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

export function saveProject(project) {
  try {
    // base64 이미지는 용량이 너무 커서 localStorage에 저장하지 않음
    const stripped = {
      ...project,
      scenes: (project.scenes || []).map((s) => ({
        ...s,
        imageBase64: null, // 이미지 데이터 제외
      })),
    };
    const projects = loadProjects();
    const idx = projects.findIndex((p) => p.id === stripped.id);
    if (idx >= 0) {
      projects[idx] = { ...stripped, updatedAt: Date.now() };
    } else {
      projects.unshift({ ...stripped, createdAt: Date.now(), updatedAt: Date.now() });
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    return projects;
  } catch (e) {
    console.warn("프로젝트 저장 실패:", e);
    return loadProjects();
  }
}

export function loadProjects() {
  try {
    const p = localStorage.getItem(PROJECTS_KEY);
    return p ? JSON.parse(p) : [];
  } catch {
    return [];
  }
}

export function deleteProject(id) {
  const projects = loadProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  return projects;
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// --- Additional settings keys ---
const SUBTITLE_KEY = "yt_scene_maker_subtitle";
const EFFECTS_KEY = "yt_scene_maker_effects";
const TTS_KEY = "yt_scene_maker_tts";
const KEYWORD_KEY = "yt_scene_maker_keyword";
const BGM_KEY = "yt_scene_maker_bgm";
const MOTION_KEY = "yt_scene_maker_motion";
const TRANSITION_KEY = "yt_scene_maker_transition";
const PEXELS_KEY = "yt_scene_maker_pexels";
const PIXABAY_KEY = "yt_scene_maker_pixabay";
const SUPERTONE_KEY = "yt_scene_maker_supertone";

export function saveSubtitleSettings(s) { localStorage.setItem(SUBTITLE_KEY, JSON.stringify(s)); }
export function loadSubtitleSettings() { try { const s = localStorage.getItem(SUBTITLE_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveEffectsSettings(s) { localStorage.setItem(EFFECTS_KEY, JSON.stringify(s)); }
export function loadEffectsSettings() { try { const s = localStorage.getItem(EFFECTS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveTtsSettings(s) { localStorage.setItem(TTS_KEY, JSON.stringify(s)); }
export function loadTtsSettings() { try { const s = localStorage.getItem(TTS_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveKeywordSettings(s) { localStorage.setItem(KEYWORD_KEY, JSON.stringify(s)); }
export function loadKeywordSettings() { try { const s = localStorage.getItem(KEYWORD_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveBgmSettings(s) { localStorage.setItem(BGM_KEY, JSON.stringify(s)); }
export function loadBgmSettings() { try { const s = localStorage.getItem(BGM_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveMotionSettings(s) { localStorage.setItem(MOTION_KEY, JSON.stringify(s)); }
export function loadMotionSettings() { try { const s = localStorage.getItem(MOTION_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function saveTransitionSettings(s) { localStorage.setItem(TRANSITION_KEY, JSON.stringify(s)); }
export function loadTransitionSettings() { try { const s = localStorage.getItem(TRANSITION_KEY); return s ? JSON.parse(s) : null; } catch { return null; } }

export function savePexelsKey(k) { if (k) localStorage.setItem(PEXELS_KEY, k); else localStorage.removeItem(PEXELS_KEY); }
export function loadPexelsKey() { return localStorage.getItem(PEXELS_KEY) || ""; }

export function savePixabayKey(k) { if (k) localStorage.setItem(PIXABAY_KEY, k); else localStorage.removeItem(PIXABAY_KEY); }
export function loadPixabayKey() { return localStorage.getItem(PIXABAY_KEY) || ""; }

export function saveSupertoneKey(k) { if (k) localStorage.setItem(SUPERTONE_KEY, k); else localStorage.removeItem(SUPERTONE_KEY); }
export function loadSupertoneKey() { return localStorage.getItem(SUPERTONE_KEY) || ""; }

// Export scenes as ZIP (images + script)
export async function exportAsZip(project, JSZip) {
  const zip = new JSZip();
  const folder = zip.folder(project.title || "scenes");

  // Add script text
  const scriptText = project.scenes
    .map((s) => `[씬 ${s.sceneNumber}]\n${s.script}`)
    .join("\n\n---\n\n");
  folder.file("script.txt", scriptText);

  // Add images
  for (const scene of project.scenes) {
    if (scene.imageBase64) {
      const base64Data = scene.imageBase64.split(",")[1];
      const ext = scene.imageBase64.includes("jpeg") ? "jpg" : "png";
      folder.file(`scene_${String(scene.sceneNumber).padStart(3, "0")}.${ext}`, base64Data, {
        base64: true,
      });
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.title || "scenes"}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
