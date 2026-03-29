// src/lib/tts.js

const SUPERTONE_BASE = "https://supertoneapi.com";

// Proxy list for CORS bypass
// First: Vite dev proxy (/api/supertone → https://supertoneapi.com)
// or Express server proxy (/api/supertone → https://supertoneapi.com)
const PROXIES = [
  (url) => url.replace(SUPERTONE_BASE, "/api/supertone"), // local proxy
  (url) => url, // direct (may fail due to CORS)
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchWithProxy(url, options) {
  for (let i = 0; i < PROXIES.length; i++) {
    const proxiedUrl = PROXIES[i](url);
    try {
      const res = await fetch(proxiedUrl, options);
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/html")) continue;
      if (res.ok || (res.status >= 400 && res.status < 500)) return res;
    } catch (err) {
      if (i === PROXIES.length - 1) throw err;
    }
  }
  throw new Error("모든 프록시 시도 실패");
}

export async function supertoneListVoices(apiKey) {
  const res = await fetchWithProxy(`${SUPERTONE_BASE}/v1/voices`, {
    method: "GET",
    headers: { "x-sup-api-key": apiKey },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403)
      throw new Error(`API 키가 유효하지 않습니다. (${res.status})`);
    throw new Error(`Supertone API 오류 (${res.status}): ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.items ?? [];
}

export async function supertoneGenerate(apiKey, { text, voiceId, speed = 1, style }) {
  const body = { text, language: "ko", model_version: "latest" };
  if (speed !== 1) body.pitch_shift = 0;
  if (style) body.style = style;

  const url = `${SUPERTONE_BASE}/v1/generate/${voiceId}?speed=${speed}`;
  const res = await fetchWithProxy(url, {
    method: "POST",
    headers: {
      "x-sup-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TTS 생성 실패 (${res.status}): ${text}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:audio/mpeg;base64,${base64}`;
}

export async function voicevoxGenerate(text, { speakerId = 3, speed = 1, pitch = 0, intonation = 1 }) {
  const base = "http://localhost:50021";
  // Generate audio query
  const queryRes = await fetch(
    `${base}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
    { method: "POST" }
  );
  if (!queryRes.ok) throw new Error("Voicevox audio_query 실패");
  const query = await queryRes.json();
  query.speedScale = speed;
  query.pitchScale = pitch;
  query.intonationScale = intonation;

  // Synthesize
  const synthRes = await fetch(`${base}/synthesis?speaker=${speakerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error("Voicevox synthesis 실패");
  const arrayBuffer = await synthRes.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return `data:audio/wav;base64,${base64}`;
}

export async function generateTtsForScene(scene, ttsSettings, supertoneKey) {
  const {
    ttsEngine,
    voiceId,
    speed,
    voicevoxSpeakerId,
    voicevoxSpeed,
    voicevoxPitch,
    voicevoxIntonation,
  } = ttsSettings;
  const text = scene.script;

  if (ttsEngine === "supertone") {
    if (!supertoneKey) throw new Error("Supertone API 키를 입력해주세요.");
    return await supertoneGenerate(supertoneKey, { text, voiceId, speed });
  } else if (ttsEngine === "voicevox") {
    return await voicevoxGenerate(text, {
      speakerId: voicevoxSpeakerId,
      speed: voicevoxSpeed,
      pitch: voicevoxPitch,
      intonation: voicevoxIntonation,
    });
  }
  throw new Error("지원하지 않는 TTS 엔진");
}
