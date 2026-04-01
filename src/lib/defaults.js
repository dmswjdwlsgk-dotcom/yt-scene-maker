// src/lib/defaults.js

// Default subtitle settings
export const DEFAULT_SUBTITLE = {
  fontFamily: "'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
  fontWeight: 700,
  fontSize: 0.04,
  fontColor: "#ffffff",
  letterSpacing: 0,
  strokeColor: "#000000",
  strokeWidth: 3,
  bgColor: "#000000",
  bgOpacity: 0.75,
  bgPaddingX: 0.03,
  bgPaddingY: 0.015,
  position: "bottom",
  marginPercent: 0.06,
  useShadow: false,
  shadowColor: "#000000",
  shadowBlur: 8,
  bgBorderWidth: 0,
  bgBorderColor: "#ffffff",
  bgShadow: false,
  bgShadowColor: "#000000",
  bgShadowBlur: 15,
  maxSubtitleLength: 25,
};

// Default motion/Ken Burns
export const DEFAULT_MOTION = {
  enabled: false,
  effect: "zoom_in",
  applyMode: "uniform",
  intensity: 0.1,
  parallaxEnabled: false,
  parallaxIntensity: 0.5,
  parallaxDirection: "auto",
  parallaxLayers: 6,
  parallaxSpeed: 0.8,
};

// Default vignette/shake
export const DEFAULT_EFFECTS = {
  vignetteEnabled: false,
  vignetteIntensity: 0.4,
  vignetteRadius: 0.7,
  vignetteSoftness: 0.5,
  shakeEnabled: false,
  shakeIntensity: 0.3,
  shakeSpeed: 1,
};

// Default transitions
export const DEFAULT_TRANSITION = {
  enabled: false,
  defaultEffect: "fade_in",
  applyMode: "uniform",
  perSceneEffects: {},
  transitionDuration: 0.5,
};

// Default BGM
export const DEFAULT_BGM = {
  enabled: false,
  volume: 0.15,
};

// Default TTS
export const DEFAULT_TTS = {
  genre: "economy",
  voiceName: "Kore",
  speed: 1,
  sceneDuration: 7,
  ttsEngine: "gemini",
  voicevoxSpeakerId: 3,
  voicevoxSpeed: 1,
  voicevoxPitch: 0,
  voicevoxIntonation: 1,
  voicevoxVolume: 1,
  voicevoxPauseLength: 1,
  voicevoxPrePhoneme: 0.1,
  voicevoxPostPhoneme: 0.1,
};

// Default keyword/motion graphics
export const DEFAULT_KEYWORD = {
  enabled: false,
  animation: "scale_up",
  position: "center",
  layoutType: "basic",
  layoutBarHeight: 0.12,
  layoutBarColor: "#ff0033",
  layoutBarOpacity: 1,
  layoutFrameWidth: 0.06,
  layoutPadding: 0.6,
  layoutOffsetX: 0,
  layoutOffsetY: 0,
  fontSize: 0.057,
  fontFamily: "'GongGothicBold', 'Noto Sans KR', sans-serif",
  fontColor: "#ffffff",
  fontWeight: 400,
  bgEnabled: false,
  bgColor: "#000000",
  bgOpacity: 0.6,
  accentColor: "#00d4ff",
  showDuration: 0.6,
  animationDuration: 0.5,
  fadeOutDuration: 0.4,
  useGlow: false,
  glowColor: "#00d4ff",
  glowBlur: 15,
  maxKeywords: 1,
  randomApplyRate: 0.4,
  perSceneKeywords: {},
  perSceneConfig: {},
  textStyle: "default",
  letterSpacing: 6,
  textShadowEnabled: true,
  textShadowColor: "#000000",
  textShadowBlur: 12,
  textShadowOffsetX: 3,
  textShadowOffsetY: 3,
  strokeEnabled: true,
  strokeColor: "#000000",
  strokeWidth: 4,
  useGradient: false,
  gradientColor1: "#667eea",
  gradientColor2: "#764ba2",
  gradientAngle: 135,
  sfxType: "none",
  sfxVolume: 0.5,
  descEnabled: true,
  descPosition: "center",
  descFontSize: 35,
  descFontColor: "#cccccc",
  descFontWeight: 400,
  descFontFamily: "",
  descLetterSpacing: 1,
};

// Caption style presets
export const CAPTION_PRESETS = [
  {
    id: "default", label: "기본", icon: "▣",
    description: "흰 텍스트 + 검정 외곽선 — 어디서든 잘 보임",
    overrides: {
      fontSize: 0.057, fontWeight: 900, fontColor: "#ffffff",
      fontFamily: "'GongGothicBold', 'Noto Sans KR', sans-serif",
      strokeEnabled: true, strokeColor: "#000000", strokeWidth: 4,
      textShadowEnabled: true, textShadowColor: "#000000", textShadowBlur: 12,
      textShadowOffsetX: 3, textShadowOffsetY: 3,
      bgEnabled: false, useGlow: false, letterSpacing: 2,
      animation: "scale_up", descEnabled: true,
      descFontColor: "#dddddd", descFontSize: 34, descFontWeight: 600,
    },
  },
  {
    id: "handwrite_yellow", label: "손글씨", icon: "✍️",
    description: "노란 손글씨 느낌 — 감성적, 드라마틱한 연출",
    overrides: {
      fontSize: 110, fontWeight: 700, fontColor: "#e8d44d",
      fontFamily: "'NanumPenScript', 'Gaegu', 'Nanum Pen Script', cursive",
      strokeEnabled: false, strokeColor: "#000000", strokeWidth: 0,
      textShadowEnabled: true, textShadowColor: "#000000", textShadowBlur: 20,
      textShadowOffsetX: 4, textShadowOffsetY: 4,
      bgEnabled: false, useGlow: false, useGradient: false, letterSpacing: 3,
      animation: "slide_up", descEnabled: true,
      descFontColor: "#cccc44", descFontSize: 40, descFontWeight: 400,
      descFontFamily: "'NanumPenScript', 'Gaegu', cursive",
    },
  },
  {
    id: "news_headline", label: "뉴스 헤드라인", icon: "📰",
    description: "흰 배경 + 검은 텍스트 — 뉴스/보도 자막 스타일",
    overrides: {
      fontSize: 80, fontWeight: 900, fontColor: "#111111",
      fontFamily: "'Noto Sans KR', 'Malgun Gothic', sans-serif",
      strokeEnabled: false, strokeColor: "#000000", strokeWidth: 0,
      textShadowEnabled: false, textShadowColor: "#000000", textShadowBlur: 0,
      textShadowOffsetX: 0, textShadowOffsetY: 0,
      bgEnabled: true, bgColor: "#ffffff", bgOpacity: 0.95,
      useGlow: false, useGradient: false, letterSpacing: 1,
      animation: "slide_left", descEnabled: true,
      descFontColor: "#333333", descFontSize: 36, descFontWeight: 600,
    },
  },
  {
    id: "red_band", label: "빨간 밴드", icon: "🔴",
    description: "빨간 반투명 배경 + 흰 굵은 텍스트 — 임팩트 강조",
    overrides: {
      fontSize: 100, fontWeight: 900, fontColor: "#ffffff",
      fontFamily: "'GongGothicBold', 'Noto Sans KR', sans-serif",
      strokeEnabled: false, strokeColor: "#000000", strokeWidth: 0,
      textShadowEnabled: true, textShadowColor: "#000000", textShadowBlur: 8,
      textShadowOffsetX: 2, textShadowOffsetY: 2,
      bgEnabled: true, bgColor: "#cc1111", bgOpacity: 0.75,
      useGlow: false, useGradient: false, letterSpacing: 4,
      animation: "scale_up", descEnabled: true,
      descFontColor: "#ffcccc", descFontSize: 38, descFontWeight: 600,
    },
  },
];

// Transition effects list
export const TRANSITION_EFFECTS = [
  { id: undefined, label: "기본값", icon: "↩" },
  { id: "fade_in", label: "페이드", icon: "▣" },
  { id: "slide_up", label: "↑슬라이드", icon: "△" },
  { id: "slide_down", label: "↓슬라이드", icon: "▽" },
  { id: "slide_left", label: "←슬라이드", icon: "◁" },
  { id: "slide_right", label: "→슬라이드", icon: "▷" },
  { id: "scale_up", label: "확대", icon: "⊕" },
  { id: "zoom_in", label: "줌인", icon: "🔍" },
  { id: "zoom_out", label: "줌아웃", icon: "🔎" },
  { id: "blur_in", label: "블러", icon: "◌" },
  { id: "cut", label: "컷", icon: "✂" },
];

// Motion effects list
export const MOTION_EFFECTS = [
  { id: "zoom_in", label: "줌인", icon: "🔍" },
  { id: "zoom_out", label: "줌아웃", icon: "🔎" },
  { id: "pan_left", label: "←패닝", icon: "◁" },
  { id: "pan_right", label: "→패닝", icon: "▷" },
  { id: "pan_up", label: "↑패닝", icon: "△" },
  { id: "pan_down", label: "↓패닝", icon: "▽" },
  { id: "random", label: "랜덤", icon: "🎲" },
];

// Font list
export const FONTS = [
  { value: "'Noto Sans KR', 'Malgun Gothic', sans-serif", label: "Noto Sans KR", category: "기본" },
  { value: "'Pretendard', 'Noto Sans KR', sans-serif", label: "Pretendard", category: "기본" },
  { value: "'NanumGothic', 'Noto Sans KR', sans-serif", label: "나눔고딕", category: "기본" },
  { value: "'NanumBarunGothic', 'Noto Sans KR', sans-serif", label: "나눔바른고딕", category: "기본" },
  { value: "'Malgun Gothic', 'Noto Sans KR', sans-serif", label: "맑은 고딕", category: "기본" },
  { value: "'GongGothicBold', 'Noto Sans KR', sans-serif", label: "이사만루체 Bold", category: "임팩트" },
  { value: "'GongGothicMedium', 'Noto Sans KR', sans-serif", label: "이사만루체 Medium", category: "임팩트" },
  { value: "'BlackHanSans', 'Noto Sans KR', sans-serif", label: "블랙한산스", category: "임팩트" },
  { value: "'GmarketSans', 'Noto Sans KR', sans-serif", label: "지마켓 산스", category: "임팩트" },
  { value: "Impact, 'Noto Sans KR', sans-serif", label: "Impact", category: "임팩트" },
  { value: "'NanumMyeongjo', 'Noto Sans KR', serif", label: "나눔명조", category: "역사/다큐" },
  { value: "Georgia, 'Noto Sans KR', serif", label: "Georgia", category: "역사/다큐" },
  { value: "'Times New Roman', 'Noto Sans KR', serif", label: "Times New Roman", category: "역사/다큐" },
  { value: "'NanumSquareRound', 'Noto Sans KR', sans-serif", label: "나눔스퀘어라운드", category: "정보성" },
  { value: "Arial, 'Noto Sans KR', sans-serif", label: "Arial", category: "정보성" },
];

// Supertone voice map
export const SUPERTONE_VOICES = {
  "763d5f200a9f5808056733": "Shibuya",
  "ff700760946618e1dcf7bd": "Garret",
  "7f8873011eeba6f11b750f": "Ken",
  "o2TEJAxRYtAh4KXWHfsnoT": "정보성",
  "hRFqEhtmv57hqaLoPHqsCy": "정보성-여성",
  "6MPXF1ti96i4zj7v1GLF9G": "정보성-여성2",
  "sgA9NNXZHLdCWKtMqmZttn": "지식",
  "3es76ou2FESvYdL3CRykpw": "지식해적단",
  "wuc39jLKJuW33RPpHMecyg": "지식오리지널",
  "8Y481nBmVzWCUrDsphX7nu": "스토리",
};
