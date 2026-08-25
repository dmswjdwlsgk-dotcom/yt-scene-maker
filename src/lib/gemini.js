import { GoogleGenAI } from "@google/genai";
import { getStylePrompt } from "./styles.js";

let geminiAi = null;   // Gemini API 인스턴스
let vertexAi = null;   // Vertex AI 인스턴스
let currentMode = "gemini"; // "gemini" | "vertex"

export function initGemini(apiKey) {
  geminiAi = new GoogleGenAI({ apiKey });
  currentMode = vertexAi ? "vertex" : "gemini";
}

export function initVertex(vertexKey) {
  if (!vertexKey) {
    vertexAi = null;
    currentMode = "gemini";
    return;
  }
  // Vertex AI Express - API key로 접근 (google/genai SDK의 Vertex AI Express 지원)
  // ⚠️ vertexai:true를 빼먹으면 SDK가 여전히 "일반 Gemini API" 경로 규칙(/v1beta/models/{model})으로
  //    요청을 만드는데, 그걸 Vertex 서버(aiplatform.googleapis.com)로 보내니 존재하지 않는 경로가 되어
  //    매 호출이 속 빈 404로 실패했음. vertexai:true를 켜야 SDK가 Vertex 전용 경로
  //    (publishers/google/models/{model})와 올바른 API 버전(v1beta1)을 자동으로 씀.
  vertexAi = new GoogleGenAI({
    apiKey: vertexKey,
    vertexai: true,
  });
  currentMode = "vertex";
}

function getAi() {
  if (currentMode === "vertex" && vertexAi) return vertexAi;
  if (geminiAi) return geminiAi;
  throw new Error("Gemini API가 초기화되지 않았습니다. API 키를 설정해주세요.");
}

export function getCurrentMode() {
  return currentMode;
}

// Scene splitting
// 원본 열정PD 방식: AI 없이 코드로 정확히 분할 (초당 8자 기준)
function programmaticSplitScript(script, charsPerScene = 160) {
  const numberedRe = /^(첫\s*번째|두\s*번째|세\s*번째|네\s*번째|다섯\s*번째|여섯\s*번째|일곱\s*번째|여덟\s*번째|아홉\s*번째|열\s*번째|열한\s*번째|열두\s*번째|\d+\s*번째|제?\s*\d+\s*[편장화위번]|first|second|third|fourth|fifth|number\s*\d+)/i;
  const sentences = script
    .replace(/\./g, ".|").replace(/\?/g, "?|").replace(/!/g, "!|")
    .replace(/。/g, "。|").replace(/？/g, "？|").replace(/！/g, "！|")
    .replace(/\n/g, "\n|")
    .split("|");

  const chunks = [];
  let current = "";
  for (let seg of sentences) {
    seg = seg.trim();
    if (!seg) continue;
    if (numberedRe.test(seg) && current.trim()) {
      chunks.push(current.trim());
      current = seg;
    } else if (current.length + seg.length < charsPerScene) {
      const isCJK = /[\u3000-\u9FFF\uF900-\uFAFF]/.test(seg);
      current = current ? current + (isCJK ? "" : " ") + seg : seg;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = seg;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function splitScriptIntoScenes(script, sceneDuration = 20) {
  const charsPerScene = Math.round(sceneDuration * 8);
  const chunks = programmaticSplitScript(script, charsPerScene);
  return chunks.map((text, i) => ({ sceneNumber: i + 1, script: text }));
}

// Title suggestion
export async function suggestTitles(topic, genre) {
  const ai = getAi();
  const genreLabel = genre === "economy" ? "경제" : genre === "history" ? "역사" : "정보성/지식";

  const prompt = `유튜브 영상 제목을 5개 추천해주세요.

주제: ${topic}
장르: ${genreLabel}

규칙:
1. 한국어 자연스러운 제목
2. 클릭을 유도하는 매력적인 제목
3. 15~30자 내외
4. 주제에 "몰락"이 들어가면 제목도 "몰락"으로 끝낼 것
5. JSON 배열로만 응답 (다른 텍스트 없이)

["제목1", "제목2", "제목3", "제목4", "제목5"]`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite", // ⚠️ "gemini-2.5-flash"는 단종된 모델 — 매 호출 404. cineboard의 검증된 텍스트 모델로 교체
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.9 },
  });

  const text = response.text.trim();
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("제목 추천 응답 파싱 실패");
  return JSON.parse(jsonMatch[0]);
}

// Generate image prompt
export async function generateImagePrompt(scene, options) {
  const ai = getAi();

  const prompt = getStylePrompt(options.styleId, {
    topic: options.topic,
    script: scene.script,
    country: options.country,
    language: options.language,
    customPrompt: options.customPrompt,
    characterRef: options.characterRef,
    aspectRatio: options.aspectRatio,
    subMode: options.subMode,
  });

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite", // ⚠️ "gemini-2.5-flash"는 단종된 모델 — 매 호출 404. cineboard의 검증된 텍스트 모델로 교체
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { temperature: 0.7 },
  });

  return response.text.trim();
}

// Generate image from prompt
export async function generateImage(imagePrompt, aspectRatio = "16:9", imageModel = "Fast (Gemini-2.5-pro)", referenceImage = null) {
  const ai = getAi();

  const ratioMap = {
    "16:9": "LANDSCAPE_16_9",
    "9:16": "PORTRAIT_9_16",
    "1:1": "SQUARE",
  };
  const ratio = ratioMap[aspectRatio] || "LANDSCAPE_16_9";

  // 원본 앱과 동일한 모델 선택 로직
  // ⚠️ "-preview" 접미사가 붙은 모델 ID는 이미 정식 승격되며 사라진 이름 —
  //    존재하지 않는 모델이라 매번 생성 실패로 이어졌음. 자매 프로젝트 cineboard의
  //    검증된 모델 ID(-preview 없음)로 교체.
  const modelId = imageModel.includes("Imagen 4")
    ? "imagen-4.0-ultra-generate-001"
    : imageModel.includes("Gemini 3 Pro")
    ? "gemini-3-pro-image"
    : imageModel.includes("Nano1")
    ? "gemini-2.5-flash-image"         // 나노바나나1
    : "gemini-3.1-flash-image";        // 나노바나나2 (Fast, 기본값)

  // Imagen 4 Ultra: generateImages API 사용
  if (modelId.includes("imagen")) {
    const imagenModel = currentMode === "vertex"
      ? `publishers/google/models/${modelId}`
      : modelId;
    const response = await ai.models.generateImages({
      model: imagenModel,
      prompt: imagePrompt,
      config: { numberOfImages: 1, aspectRatio: ratio },
    });
    const img = response.generatedImages?.[0];
    if (img?.image?.imageBytes) {
      return `data:image/png;base64,${img.image.imageBytes}`;
    }
    throw new Error("이미지 생성 결과 없음");
  }

  const isVertex = currentMode === "vertex";
  const maxAttempts = isVertex ? 20 : 12;

  // 원본 앱 그대로: AI Studio vs Vertex 설정 분기
  const vertexConfig = {
    responseModalities: ["IMAGE", "TEXT"],
    temperature: 1,
    topP: 0.95,
    maxOutputTokens: 32768,
    imageConfig: { aspectRatio, outputMimeType: "image/png", imageSize: "1K" },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };

  const aiStudioConfig = {
    responseModalities: ["IMAGE", "TEXT"],
    imageConfig: { aspectRatio },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  const config = isVertex ? vertexConfig : aiStudioConfig;
  const startTime = Date.now();

  // 원본 앱과 동일: 참조 이미지가 있으면 프롬프트 강화 + inlineData 추가
  let finalPrompt = imagePrompt;
  const parts = [];

  if (referenceImage) {
    finalPrompt = imagePrompt + `

[🛑 CRITICAL INSTRUCTION: CHARACTER REFERENCE 🛑]
The user has provided an image to define the **Main Character's Appearance**.
You MUST generate the new scene using **THIS EXACT CHARACTER DESIGN**.

**MANDATORY CONSISTENCY CHECK:**
1. **Face/Hair:** Keep the same hair color, hair style, and facial features.
2. **Outfit:** Keep the same clothes (color, type, accessories).
3. **Style Adaptation:**
   - If the target style is 2D/Stickman, convert this character into that style but **KEEP** their signature features (e.g., Red Scarf, Blue Hat, Long Blonde Hair).
   - If the target style is Realistic, look exactly like the reference person.

**DO NOT** generate a random person.
**DO NOT** change the outfit colors.
**USE THE REFERENCE IMAGE AS THE GROUND TRUTH.**`;

    const mimeType = referenceImage.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";
    const data = referenceImage.includes("base64,") ? referenceImage.split("base64,")[1] : referenceImage;
    parts.push({ text: finalPrompt });
    parts.push({ inlineData: { mimeType, data } });
  } else {
    parts.push({ text: finalPrompt });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: modelId,
        contents: [{ role: "user", parts }],
        config,
      });
      const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part?.inlineData?.data) {
        return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
      }
      throw new Error("No image data in response");
    } catch (err) {
      const msg = String(err?.message || err);
      console.warn(`Attempt ${attempt} failed: ${msg}`);

      let waitSec = 5;
      if (msg.includes("429") || msg.includes("ResourceExhausted") || msg.includes("RESOURCE_EXHAUSTED")) {
        waitSec = isVertex ? Math.min(2 + attempt * 1.5 + Math.random() * 2, 15) : Math.min(attempt * 8 + Math.random() * 5, 60);
      } else if (msg.includes("500") || msg.includes("Internal error")) {
        waitSec = isVertex ? 3 + Math.random() * 2 : 2 + Math.random() * 2;
      } else if (msg.includes("503") || msg.includes("Unavailable") || msg.includes("UNAVAILABLE")) {
        waitSec = isVertex ? Math.min(2 + attempt * 2.5 + Math.random() * 3, 20) : 3 + Math.random() * 2;
      } else if (msg.includes("safety") || msg.includes("blocked") || msg.includes("SAFETY")) {
        waitSec = 1 + Math.random();
      } else if (msg.includes("Timeout")) {
        waitSec = isVertex ? 2 + Math.random() * 2 : 1 + Math.random();
      } else {
        waitSec = 2 + Math.random() * 2;
      }

      if (attempt === maxAttempts) {
        throw new Error(`이미지를 생성하지 못했습니다. (${maxAttempts}회 시도, 마지막 원인: ${msg.slice(0, 60)})`);
      }
      console.warn(`[Retry ${attempt}/${maxAttempts}] ${Math.round(waitSec)}초 후 재시도...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
    }
  }
}

// PCM → WAV 변환 (Gemini TTS는 raw PCM 반환)
function pcmToWav(pcmBase64, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const pcmBytes = Uint8Array.from(atob(pcmBase64), c => c.charCodeAt(0));
  const byteRate = sampleRate * channels * (bitDepth / 8);
  const blockAlign = channels * (bitDepth / 8);
  const dataSize = pcmBytes.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)); };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer, 44).set(pcmBytes);
  const wavBytes = new Uint8Array(buffer);
  let b64 = "";
  const chunk = 8192;
  for (let i = 0; i < wavBytes.length; i += chunk) {
    b64 += String.fromCharCode(...wavBytes.subarray(i, i + chunk));
  }
  return `data:audio/wav;base64,${btoa(b64)}`;
}

// TTS 음성 생성 (Gemini TTS)
export async function generateTTS(text, voiceName = "Kore") {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ role: "user", parts: [{ text }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName } },
      },
    },
  });
  const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part?.inlineData?.data) throw new Error("TTS 응답에 오디오 데이터 없음");
  return pcmToWav(part.inlineData.data, 24000, 1, 16);
}

// Generate prompt + image
export async function generateSceneImage(scene, options) {
  const imagePrompt = await generateImagePrompt(scene, options);
  const imageBase64 = await generateImage(imagePrompt, options.aspectRatio, options.imageModel, options.referenceImage || null);
  return { imagePrompt, imageBase64 };
}

// ── Script (대본) generation ──────────────────────────────────────────────────

const CHARS_PER_MIN = 400;

const GENRE_GUIDELINES = {
  economy: `[장르: 경제 콘텐츠 대본 작성 지침]

당신은 경제 전문 유튜브 채널의 대본 작가입니다. 시청자는 경제에 관심 있는 일반인입니다.

[톤 & 스타일]
- 슈카월드, 삼프로TV, 지식한입 스타일의 친근하면서도 전문적인 어조
- 복잡한 경제 개념을 쉬운 비유와 일상적 예시로 풀어서 설명
- "~인데요", "~거든요", "~잖아요" 등 구어체 활용하여 친근하게
- 핵심 수치와 데이터를 반드시 포함 (구체적인 숫자가 설득력을 높임)

[구성 규칙]
1. 후킹 도입 (전체의 5%): 충격적인 수치나 질문으로 시작
   - 예: "여러분, 올해 한국의 가계부채가 1,900조를 돌파했다는 거 아시나요?"
2. 배경 설명 (전체의 20%): 왜 이 주제가 중요한지, 역사적 맥락
3. 핵심 분석 (전체의 50%): 원인→현상→영향 순으로 논리적 전개
   - 각 포인트마다 구체적 수치/사례 필수
   - "첫째~", "둘째~", "셋째~" 등 구조화
4. 미래 전망 (전체의 15%): 전문가 견해, 시나리오 분석
5. 마무리 (전체의 10%): 시청자에게 주는 교훈/인사이트

[필수 포함 요소]
- 구체적인 수치 (GDP, 금리, 환율, 주가 등)
- 실생활 비유 ("이건 마치 ~와 같습니다")
- 원인과 결과의 논리적 연결
- 글로벌 맥락과 한국 경제의 연결고리

[금지 사항]
- 투자 권유성 발언 ("~에 투자하세요")
- 지나치게 학술적인 용어 나열
- 근거 없는 전망이나 추측`,

  info: `[장르: 정보성/지식 콘텐츠 대본 작성 지침]

당신은 정보성 유튜브 채널의 대본 작가입니다. 시청자의 호기심을 자극하고 유익한 지식을 전달합니다.

[톤 & 스타일]
- 사피엔스 스튜디오, 지식한입, 과학쿠키 스타일
- 호기심을 자극하는 질문형 전개
- 어려운 개념은 일상적 비유로 쉽게 풀어서 설명
- "~인데요", "~했습니다", "~라고 합니다" 등 혼용하여 지루하지 않게

[구성 규칙]
1. 강력한 훅 (전체의 5%): 의외의 사실이나 충격적인 질문으로 시작
   - 예: "사실 우리가 매일 마시는 물에는 놀라운 비밀이 숨어있습니다"
2. 문제 제기 (전체의 15%): "왜?", "어떻게?" 질문을 던지며 궁금증 유발
3. 핵심 설명 (전체의 55%): 주제를 3~5개 핵심 포인트로 나누어 설명
   - 각 포인트는 "사실 → 설명 → 예시/비유"의 3단 구조
   - 전환부마다 "그런데 여기서 놀라운 사실이 있는데요" 등의 브릿지
4. 반전/심화 (전체의 15%): 예상 못한 사실, 논쟁, 미해결 문제
5. 마무리 (전체의 10%): 핵심 요약 + 여운을 남기는 마무리

[필수 포함 요소]
- 출처가 명확한 사실과 데이터
- 직관적인 비유와 예시
- "알고 계셨나요?" 같은 참여 유도 표현
- 섹션 간 자연스러운 전환 문장

[금지 사항]
- 검증되지 않은 정보
- 지나치게 학술적인 논문 스타일
- 한 가지 관점에만 치우친 서술`,

  history: `[장르: 역사 콘텐츠 대본 작성 지침]

당신은 역사 다큐멘터리 채널의 대본 작가입니다. 역사적 사건을 생동감 있게 전달합니다.

[톤 & 스타일]
- 지식채널e, 별별역사, 히스토리킹 스타일
- 서사적이고 몰입감 있는 스토리텔링
- 현재형 서술("~합니다", "~하게 됩니다")로 생동감 부여
- 인물의 감정, 결단의 순간을 극적으로 묘사

[구성 규칙]
1. 극적 도입 (전체의 8%): 역사의 결정적 순간을 현장감 있게 묘사
   - 예: "1592년 4월 13일 새벽, 700척의 왜선이 부산포를 향해 다가오고 있었습니다"
2. 시대 배경 (전체의 15%): 왜 이 사건이 일어나게 되었는지 맥락 설명
3. 핵심 전개 (전체의 50%): 시간순으로 사건 전개
   - 핵심 인물의 결단과 행동
   - 전환점(Turning Point) 강조
   - "바로 이 순간", "그런데" 등으로 긴장감 유지
4. 절정/결과 (전체의 15%): 사건의 클라이맥스와 직접적 결과
5. 역사적 의의 (전체의 12%): 이 사건이 남긴 영향, 현대와의 연결고리

[필수 포함 요소]
- 정확한 날짜, 장소, 인물명
- 역사적 맥락 (국제 정세, 시대 상황)
- 핵심 인물의 발언이나 기록 인용
- "만약 ~했다면?" 같은 가정법으로 중요성 강조

[금지 사항]
- 역사적 사실 왜곡
- 특정 민족/국가 비하
- 지나치게 잔인한 묘사 (은유적으로 순화)
- 확인되지 않은 야사를 정사처럼 서술`,
};

async function callTextModel(prompt) {
  const ai = getAi();
  const model = currentMode === "vertex" ? "gemini-3-flash-preview" : "gemini-2.5-pro";
  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  return response.text || "";
}

// Generate Grok/Runway video prompts from image prompts
export async function generateGrokPrompts(scenes) {
  const ai = getAi();
  const model = currentMode === "vertex" ? "gemini-3-flash-preview" : "gemini-2.5-pro";

  const prompt = `You are an expert AI Video Prompt Engineer.
Convert the following list of Image Prompts into high-quality Video Generation Prompts (e.g., for Grok, Runway, Luma).

[Input Image Prompts]:
${scenes.map((s, i) => `[Scene ${i + 1}]: ${s.imagePrompt}`).join("\n")}

[Instructions]:
1. Output exactly one video prompt per scene.
2. Format: Just the prompt text, one line per scene. Do NOT include numbers (1., 2.) yet.
3. Language: Korean only.
4. Focus on: Camera movement (zoom in, pan, static), subject motion (waving, talking, walking), and atmosphere.
5. Keep it concise (under 30 words).
6. Ensure the number of output lines matches the number of input scenes exactly.`;

  const response = await ai.models.generateContent({
    model,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const lines = (response.text || "").split("\n").filter((l) => l.trim() !== "");
  return lines.map((l, i) => `${i + 1}. ${l.replace(/^\d+[\.\)]\s*/, "").trim()}`).join("\n\n");
}

export async function generateScript({ topic, genre, duration, additionalNotes = "", customGenreLabel, customGuideline }, onProgress) {
  const totalChars = duration * CHARS_PER_MIN;
  const guideline = customGuideline || GENRE_GUIDELINES[genre] || GENRE_GUIDELINES.info;
  const genreLabel = customGenreLabel || (genre === "economy" ? "경제" : genre === "info" ? "정보성/지식" : genre === "history" ? "역사" : genre);

  // Step 1: Generate outline
  onProgress?.("목차 생성 중...");
  const outlinePrompt = `당신은 ${genreLabel} 유튜브 영상 전문 기획자입니다.

[주제]: "${topic}"
[장르]: ${genreLabel}
[목표 영상 길이]: ${duration}분
[언어]: Korean
${additionalNotes ? `[추가 지시사항]: ${additionalNotes}` : ""}

${guideline}

위 지침에 따라, 이 주제에 대한 영상 목차(개요)를 작성하세요.
각 섹션의 제목과 핵심 내용을 간단히 기술합니다.

[출력 형식 - JSON만, 마크다운 없이]:
{
  "title": "영상 제목 (시청자의 클릭을 유도하는 매력적인 제목)",
  "sections": [
    {"title": "섹션 제목", "summary": "이 섹션에서 다룰 핵심 내용 요약 (1-2문장)", "duration_ratio": 0.15},
    ...
  ]
}

섹션은 5~8개로 구성하고, duration_ratio의 합이 1.0이 되도록 하세요.
Output:`;

  const outlineText = await callTextModel(outlinePrompt);
  let title = `${topic} - ${genreLabel} 분석`;
  let sections = [];

  try {
    const match = outlineText.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      title = parsed.title || title;
      sections = parsed.sections || [];
    }
  } catch {
    sections = [
      { title: "도입", summary: `${topic}에 대한 흥미로운 도입`, duration_ratio: 0.1 },
      { title: "배경", summary: `${topic}의 배경과 맥락`, duration_ratio: 0.2 },
      { title: "핵심 내용 1", summary: `${topic}의 첫 번째 핵심 포인트`, duration_ratio: 0.2 },
      { title: "핵심 내용 2", summary: `${topic}의 두 번째 핵심 포인트`, duration_ratio: 0.2 },
      { title: "핵심 내용 3", summary: `${topic}의 세 번째 핵심 포인트`, duration_ratio: 0.15 },
      { title: "마무리", summary: "정리 및 인사이트", duration_ratio: 0.15 },
    ];
  }

  // Step 2: Generate script section by section
  onProgress?.("대본 작성 중...");
  const sectionScripts = [];

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const targetChars = Math.round(totalChars * sec.duration_ratio);
    onProgress?.(`대본 작성 중... (${i + 1}/${sections.length}: ${sec.title})`);

    const sectionPrompt = `당신은 ${genreLabel} 유튜브 영상 전문 대본 작가입니다.

[영상 제목]: "${title}"
[주제]: "${topic}"
[현재 작성할 섹션]: ${sec.title}
[섹션 내용]: ${sec.summary}
[이 섹션의 목표 글자 수]: 약 ${targetChars}자
[전체 목차 구성]:
${sections.map((s, idx) => `  ${idx + 1}. ${s.title}: ${s.summary}`).join("\n")}
[현재 섹션 번호]: ${i + 1}/${sections.length}
${i > 0 ? `[이전 섹션까지의 대본 요약]: ${sectionScripts.map((s, idx) => `섹션${idx + 1}: ${s.slice(0, 100)}...`).join(" | ")}` : ""}
[언어]: Korean
${additionalNotes ? `[추가 지시사항]: ${additionalNotes}` : ""}

${guideline}

[중요 규칙]:
1. 반드시 약 ${targetChars}자 분량으로 작성 (±10% 허용)
2. 이 섹션은 "${sec.title}"에 해당하는 부분만 작성
3. ${i === 0 ? "영상의 시작이므로 시청자의 관심을 사로잡는 강력한 도입부로 시작" : "이전 섹션과 자연스럽게 이어지도록 전환"}
4. ${i === sections.length - 1 ? "영상의 마지막이므로 여운을 남기는 마무리. '좋아요와 구독' 같은 유도 문구 금지" : "다음 섹션으로 자연스럽게 이어질 수 있는 브릿지 포함"}
5. 나레이션 대본만 작성 (지문, 편집 지시, 카메라 지시 등 불필요한 메타 정보 금지)
6. 자연스러운 구어체로 작성 (TTS로 읽었을 때 자연스러워야 함)

대본만 출력하세요 (제목, 섹션 번호, 부연 설명 등 불필요):`;

    const text = (await callTextModel(sectionPrompt))
      .replace(/^(#{1,3}\s|섹션\s*\d+|---).*/gm, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\*\*/g, "")
      .trim();
    sectionScripts.push(text);
  }

  onProgress?.("대본 최종 정리 중...");
  const fullScript = sectionScripts.join("\n\n");
  const estimatedDuration = Math.round(fullScript.length / CHARS_PER_MIN);

  return { title, script: fullScript, outline: sections.map((s) => s.title), estimatedDuration, genre, wordCount: fullScript.length };
}
