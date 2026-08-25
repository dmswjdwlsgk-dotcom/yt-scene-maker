// src/lib/renderer.js
// Canvas-based video renderer — Ken Burns, subtitles, keyword MG (22 animations), transitions (11 types), BGM

const SERVER_URL = "http://localhost:3099";

// ── Server health check ──────────────────────────────────────────────────────
let _serverStatus = null;
export async function checkServer(force = false) {
  if (_serverStatus && !force) return _serverStatus;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    const r = await fetch(`${SERVER_URL}/health`, { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    _serverStatus = { available: j.status === "ok" && j.ffmpeg === true, ...j };
  } catch {
    _serverStatus = { available: false };
  }
  return _serverStatus;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ── Ken Burns ─────────────────────────────────────────────────────────────────
function kenBurnsRect(effect, intensity, progress, imgW, imgH, canvasW, canvasH) {
  const baseScale = Math.max(canvasW / imgW, canvasH / imgH);
  const bw = imgW * baseScale;
  const bh = imgH * baseScale;
  const bx = (canvasW - bw) / 2;
  const by = (canvasH - bh) / 2;
  const extra = intensity * Math.min(bw, bh);
  const t = progress;
  let sx = bx, sy = by, sw = bw, sh = bh;
  switch (effect) {
    case "zoom_in":  sw = bw - extra * t; sh = bh - extra * t; sx = bx + (extra * t) / 2; sy = by + (extra * t) / 2; break;
    case "zoom_out": sw = bw - extra * (1 - t); sh = bh - extra * (1 - t); sx = bx + (extra * (1 - t)) / 2; sy = by + (extra * (1 - t)) / 2; break;
    case "pan_left":  sx = bx + extra * t; break;
    case "pan_right": sx = bx - extra * t; break;
    case "pan_up":   sy = by + extra * t; break;
    case "pan_down": sy = by - extra * t; break;
  }
  return { sx: -sx / baseScale, sy: -sy / baseScale, sw: sw / baseScale, sh: sh / baseScale };
}

function drawKenBurns(ctx, img, effect, intensity, progress, w, h) {
  const { sx, sy, sw, sh } = kenBurnsRect(effect, intensity, progress, img.naturalWidth, img.naturalHeight, w, h);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function drawCover(ctx, img, w, h) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

// ── Subtitle ──────────────────────────────────────────────────────────────────
function drawSubtitle(ctx, text, subtitle, w, h) {
  if (!text || !text.trim()) return;
  const {
    fontFamily = "'Noto Sans KR', sans-serif", fontWeight = 700, fontSize = 0.04,
    fontColor = "#ffffff", strokeColor = "#000000", strokeWidth = 3, strokeEnabled = true,
    bgEnabled = false, bgColor = "#000000", bgOpacity = 0.75,
    position = "bottom", marginPercent = 0.06,
    textShadowEnabled = false, textShadowColor = "#000000", textShadowBlur = 8,
    textShadowOffsetX = 3, textShadowOffsetY = 3,
    maxSubtitleLength = 25,
  } = subtitle;

  const pxSize = Math.round(fontSize * h);
  ctx.font = `${fontWeight} ${pxSize}px ${fontFamily}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const chunks = [];
  for (let i = 0; i < text.length; i += maxSubtitleLength) chunks.push(text.slice(i, i + maxSubtitleLength));
  const lineText = chunks.join("\n").split("\n");
  const lineHeight = pxSize * 1.4;
  const totalH = lineHeight * lineText.length;
  const margin = h * marginPercent;

  let baseY;
  if (position === "top") baseY = margin + totalH / 2;
  else if (position === "center") baseY = h / 2;
  else baseY = h - margin - totalH / 2;

  for (let li = 0; li < lineText.length; li++) {
    const line = lineText[li];
    if (!line.trim()) continue;
    const y = baseY + (li - (lineText.length - 1) / 2) * lineHeight;
    const textW = ctx.measureText(line).width;
    const padX = w * 0.02, padY = pxSize * 0.3;

    if (bgEnabled) {
      ctx.save(); ctx.globalAlpha = bgOpacity; ctx.fillStyle = bgColor;
      ctx.roundRect ? ctx.roundRect(w/2 - textW/2 - padX, y - pxSize/2 - padY, textW + padX*2, pxSize + padY*2, 4) : ctx.rect(w/2 - textW/2 - padX, y - pxSize/2 - padY, textW + padX*2, pxSize + padY*2);
      ctx.fill(); ctx.restore();
    }
    if (textShadowEnabled) { ctx.save(); ctx.shadowColor = textShadowColor; ctx.shadowBlur = textShadowBlur; ctx.shadowOffsetX = textShadowOffsetX; ctx.shadowOffsetY = textShadowOffsetY; }
    if (strokeEnabled && strokeWidth > 0) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth * 2; ctx.lineJoin = "round"; ctx.strokeText(line, w / 2, y); }
    ctx.fillStyle = fontColor;
    ctx.fillText(line, w / 2, y);
    if (textShadowEnabled) ctx.restore();
  }
}

// ── Vignette ──────────────────────────────────────────────────────────────────
function drawVignette(ctx, w, h, intensity, radius, softness) {
  const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.min(w, h) * radius);
  grad.addColorStop(Math.max(0, 1 - softness), "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${intensity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

// ── Transitions ───────────────────────────────────────────────────────────────
// Returns {alpha, tx, ty, blur, scale} for a given transition type and progress
function getTransitionParams(type, progress, isIn, width, height) {
  const o = isIn ? progress : 1 - progress; // o = 0→1 as scene appears
  switch (type) {
    case "fade_in":   return { alpha: o, tx: 0, ty: 0, blur: 0, scale: 1 };
    case "fade_out":  return { alpha: isIn ? 1 : 1 - progress, tx: 0, ty: 0, blur: 0, scale: 1 };
    case "slide_left":  return { alpha: 1, tx: (1 - o) * -width * 0.15, ty: 0, blur: 0, scale: 1 };
    case "slide_right": return { alpha: 1, tx: (1 - o) * width * 0.15, ty: 0, blur: 0, scale: 1 };
    case "slide_up":    return { alpha: 1, tx: 0, ty: (1 - o) * -height * 0.1, blur: 0, scale: 1 };
    case "slide_down":  return { alpha: 1, tx: 0, ty: (1 - o) * height * 0.1, blur: 0, scale: 1 };
    case "blur_in":     return { alpha: 1, tx: 0, ty: 0, blur: (1 - o) * 10, scale: 1 };
    case "zoom_in":     return { alpha: o, tx: 0, ty: 0, blur: 0, scale: 0.85 + o * 0.15 };
    case "zoom_out":    return { alpha: o, tx: 0, ty: 0, blur: 0, scale: 1.15 - o * 0.15 };
    case "scale_up":    return { alpha: o, tx: 0, ty: 0, blur: 0, scale: 0.9 + o * 0.1 };
    case "ink_spread":  return { alpha: Math.min(1, o * 1.5), tx: 0, ty: 0, blur: (1 - o) * 6, scale: 1 };
    case "cut":         return { alpha: 1, tx: 0, ty: 0, blur: 0, scale: 1 };
    default:            return { alpha: o, tx: 0, ty: 0, blur: 0, scale: 1 };
  }
}

// ── Keyword Motion Graphics ───────────────────────────────────────────────────
// Ports original Nu() function with all 22 animation types
function drawKeywords(ctx, w, h, { keywords, progress, settings: a }) {
  if (!keywords || !keywords.length) return;

  // Easing functions
  const easeOut  = (b) => 1 - Math.pow(1 - b, 4);
  const easeInOut = (b) => b < 0.5 ? 4*b*b*b : 1 - Math.pow(-2*b+2, 3)/2;
  const elasticOut = (b) => {
    if (b === 0 || b === 1) return b;
    return Math.pow(2, -10*b) * Math.sin((b*10 - 0.75) * (2*Math.PI) / 3) + 1;
  };
  const bounceOut = (b) => {
    if (b < 1/2.75) return 7.5625*b*b;
    if (b < 2/2.75)  return 7.5625*(b -= 1.5/2.75)*b + 0.75;
    if (b < 2.5/2.75) return 7.5625*(b -= 2.25/2.75)*b + 0.9375;
    return 7.5625*(b -= 2.625/2.75)*b + 0.984375;
  };

  const start = 0.05;
  const end = start + (a.showDuration || 0.6);
  if (progress < start || progress > end + 0.1) return;

  const animDur  = Math.min(0.35, (a.animationDuration || 0.5) / 3);
  const fadeOutDur = Math.min(0.3, (a.fadeOutDuration || 0.4) / 3);

  for (let kwIdx = 0; kwIdx < keywords.length; kwIdx++) {
    const kw = keywords[kwIdx];
    const kwStart = start + kwIdx * 0.05;
    if (progress < kwStart || progress > end + 0.1) continue;

    // S = normalized progress 0→1 over the full display window
    const S = Math.min(1, Math.max(0, (progress - kwStart) / Math.max(0.01, end - kwStart)));

    // Fade in/out alpha
    let alpha = 1;
    if (S < animDur) alpha = easeOut(S / animDur);
    else if (S > 1 - fadeOutDur) alpha = easeInOut((1 - S) / fadeOutDur);
    alpha = clamp(alpha, 0, 1);

    // Animation in progress (0→1 over animDur portion)
    const R = Math.min(1, Math.max(0, S / Math.max(0.01, animDur)));
    const eR  = easeOut(R);
    const Z   = Math.min(1, elasticOut(Math.min(1, R)));

    let offsetX = 0, offsetY = 0, scale = 1, alphaOverride = null;

    switch (a.animation || "scale_up") {
      case "slide_up":   offsetY = (1 - S) * h * 0.04; break;
      case "slide_down": offsetY = -(1 - S) * h * 0.04; break;
      case "slide_left": offsetX = (1 - S) * w * 0.06; break;
      case "slide_right": offsetX = -(1 - S) * w * 0.06; break;
      case "scale_up": scale = 0.6 + Z * 0.4; break;
      case "zoom_blur": scale = 0.3 + S * 0.7; break;
      case "bounce_in": {
        scale = bounceOut(Math.min(1, R));
        offsetY = (1 - bounceOut(Math.min(1, R))) * h * -0.03;
        break;
      }
      case "drop_in": {
        const me = easeOut(Math.min(1, R));
        offsetY = -(1 - me) * h * 0.08;
        scale = 0.5 + me * 0.5;
        break;
      }
      case "pop_in": {
        scale = Z;
        alphaOverride = Math.min(1, R * 3);
        break;
      }
      case "elastic_in": {
        const me = Math.min(1, R);
        scale = me === 0 ? 0 : me === 1 ? 1 : Math.pow(2, -10*me) * Math.sin((me*10 - 0.75) * (2*Math.PI)/3) + 1;
        break;
      }
      case "flip_in": {
        scale = Math.abs(Math.cos((1 - S) * Math.PI / 2));
        if (scale < 0.01) scale = 0.01;
        break;
      }
      case "rotate_in": {
        scale = S;
        alphaOverride = S;
        break;
      }
      case "swing_in": {
        offsetX = Math.sin((1 - S) * Math.PI * 3) * (1 - S) * w * 0.02;
        scale = 0.8 + S * 0.2;
        break;
      }
      case "glitch_in": {
        if (S < 0.7) {
          offsetX = Math.sin(R * 50) * (1 - S) * w * 0.01;
          alphaOverride = S > 0.3 ? 1 : S / 0.3;
        }
        break;
      }
      case "wave_in": {
        offsetY = Math.sin(R * Math.PI * 4) * (1 - S) * h * 0.015;
        alphaOverride = S;
        break;
      }
      case "split_in": {
        offsetX = (1 - S) * w * 0.03 * (kwIdx % 2 === 0 ? -1 : 1);
        alphaOverride = S;
        break;
      }
      case "shake_in": {
        if (S < 0.8) {
          offsetX = Math.sin(R * 40) * (1 - S) * w * 0.008;
          offsetY = Math.cos(R * 35) * (1 - S) * h * 0.005;
        }
        scale = 0.8 + S * 0.2;
        break;
      }
      case "spiral_in": {
        const ze = (1 - S) * Math.PI * 4;
        offsetX = Math.cos(ze) * (1 - S) * w * 0.03;
        offsetY = Math.sin(ze) * (1 - S) * h * 0.03;
        scale = S;
        break;
      }
      case "flash_in": {
        alphaOverride = S < 0.3 ? (Math.sin(R * 30) > 0 ? 1 : 0.2) : 1;
        scale = 0.9 + S * 0.1;
        break;
      }
      case "stamp_in": {
        scale = S < 0.5 ? 2 - S * 2 : 1;
        break;
      }
      case "roll_in": {
        offsetX = -(1 - S) * w * 0.1;
        scale = 0.8 + Math.abs(Math.sin((1 - S) * Math.PI * 2)) * 0.2 * (1 - S) + S * 0.2;
        break;
      }
      case "blur_in":
      case "typewriter":
      default: break;
    }

    // Final alpha: multiply override into computed alpha
    const finalAlpha = alphaOverride !== null ? alpha * alphaOverride : alpha;
    if (finalAlpha <= 0) continue;

    // Parse main text and description
    const pipeIdx = kw.indexOf("|");
    const mainText = pipeIdx >= 0 ? kw.substring(0, pipeIdx).trim() : kw;
    const descText = pipeIdx >= 0 ? kw.substring(pipeIdx + 1).trim() : "";

    const fSize = a.fontSize > 1 ? Math.round(a.fontSize * (h / 1080)) : Math.round(h * (a.fontSize || 0.057));
    ctx.font = `${a.fontWeight || 700} ${fSize}px ${a.fontFamily || "'Noto Sans KR', sans-serif"}`;
    ctx.textBaseline = "middle";

    const textW = ctx.measureText(mainText).width;
    const lineH  = fSize * 1.4;
    const descSize = a.descFontSize > 1 ? Math.round(a.descFontSize * (h/1080)) : Math.round(fSize * (a.descFontSize || 0.55));
    const descH  = descText ? descSize * 1.3 : 0;
    const totalH = lineH + descH + (descText ? fSize * 0.15 : 0);
    const padX = fSize * 0.6, padY = fSize * 0.3;
    const margin = h * 0.06;

    // Position
    let cx, cy;
    const posW = w * 0.3;
    switch (a.position || "center") {
      case "top_center":    cx = w / 2; cy = margin + padY + lineH / 2 + kwIdx * (totalH + padY * 2); break;
      case "bottom_center": cx = w / 2; cy = h - margin * 3 - padY - totalH / 2 - (keywords.length - 1 - kwIdx) * (totalH + padY * 2 + fSize * 0.3); break;
      case "top_left":      cx = posW; cy = margin + padY + lineH / 2 + kwIdx * (totalH + padY * 2); break;
      case "top_right":     cx = w - posW; cy = margin + padY + lineH / 2 + kwIdx * (totalH + padY * 2); break;
      case "bottom_left":   cx = posW; cy = h - margin * 3 - padY - totalH / 2 - (keywords.length - 1 - kwIdx) * (totalH + padY * 2); break;
      case "bottom_right":  cx = w - posW; cy = h - margin * 3 - padY - totalH / 2 - (keywords.length - 1 - kwIdx) * (totalH + padY * 2); break;
      case "center": default: cx = w / 2; cy = h / 2 - (keywords.length - 1) * (totalH + padY) / 2 + kwIdx * (totalH + padY) - (descText ? descH / 2 : 0); break;
    }
    cx += offsetX; cy += offsetY;

    ctx.save();
    ctx.globalAlpha = clamp(finalAlpha, 0, 1);

    if (scale !== 1) {
      ctx.translate(cx, cy);
      ctx.scale(scale, scale);
      ctx.translate(-cx, -cy);
    }

    // Background box
    if (a.bgEnabled && (a.bgOpacity || 0) > 0) {
      const hex = (a.bgColor || "#000000").replace("#", "");
      const r = parseInt(hex.slice(0,2), 16), g = parseInt(hex.slice(2,4), 16), bv = parseInt(hex.slice(4,6), 16);
      ctx.fillStyle = `rgba(${r},${g},${bv},${a.bgOpacity * finalAlpha})`;
      const bx = cx - textW / 2 - padX, by = cy - lineH / 2 - padY;
      ctx.roundRect ? ctx.roundRect(bx, by, textW + padX*2, totalH + padY*2, fSize*0.2) : ctx.rect(bx, by, textW + padX*2, totalH + padY*2);
      ctx.fill();
    }

    // Glow / shadow
    if (a.useGlow) { ctx.shadowColor = a.glowColor || "#00d4ff"; ctx.shadowBlur = a.glowBlur || 15; }
    else if (a.textShadowEnabled) { ctx.shadowColor = a.textShadowColor || "#000000"; ctx.shadowBlur = a.textShadowBlur || 12; ctx.shadowOffsetX = a.textShadowOffsetX || 3; ctx.shadowOffsetY = a.textShadowOffsetY || 3; }

    ctx.textAlign = "center";
    if (a.letterSpacing) ctx.letterSpacing = `${a.letterSpacing}px`;

    // Stroke
    if (a.strokeEnabled !== false && (a.strokeWidth || 0) > 0) {
      ctx.strokeStyle = a.strokeColor || "#000000";
      ctx.lineWidth = a.strokeWidth * (fSize / 40);
      ctx.lineJoin = "round";
      ctx.strokeText(mainText, cx, cy);
    }

    // Main text
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    if (a.textShadowEnabled) { ctx.shadowColor = a.textShadowColor || "#000000"; ctx.shadowBlur = a.textShadowBlur || 12; ctx.shadowOffsetX = a.textShadowOffsetX || 3; ctx.shadowOffsetY = a.textShadowOffsetY || 3; }
    if (a.useGlow) { ctx.shadowColor = a.glowColor || "#00d4ff"; ctx.shadowBlur = a.glowBlur || 15; }
    ctx.fillStyle = a.fontColor || "#ffffff";
    ctx.fillText(mainText, cx, cy);

    // Description text
    if (descText) {
      const dy = cy + lineH / 2 + fSize * 0.15 + descSize * 0.5;
      ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      ctx.font = `${a.descFontWeight || 400} ${descSize}px ${a.descFontFamily || a.fontFamily || "'Noto Sans KR', sans-serif"}`;
      ctx.fillStyle = a.descFontColor || "#cccccc";
      ctx.letterSpacing = `${a.descLetterSpacing ?? Math.max(0, (a.letterSpacing || 0) - 1)}px`;
      ctx.fillText(descText, cx, dy);
    }

    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    if (a.letterSpacing) ctx.letterSpacing = "0px";
    ctx.restore();
  }
}

// ── Per-scene frame renderer ──────────────────────────────────────────────────
export async function renderSceneToFrames({
  imageBase64, script, duration, fps = 30, width = 1920, height = 1080,
  motion, effects, subtitle, transition, keyword, ttsAudio, onProgress,
}) {
  const img = await loadImage(imageBase64);
  const totalFrames = Math.round(duration * fps);
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");

  const m = motion || {};
  const e = effects || {};
  const s = subtitle || {};
  const t = transition || {};
  const k = keyword || {};

  const transInDur  = t.enabled ? Math.min(t.transitionDuration || 0.5, duration * 0.3) : 0;
  const transOutDur = t.enabled ? Math.min(t.transitionDuration || 0.5, duration * 0.3) : 0;
  const transType   = t.defaultEffect || "fade_in";

  const frames = [];

  for (let fi = 0; fi < totalFrames; fi++) {
    const timeSec  = fi / fps;
    const progress = fi / Math.max(1, totalFrames - 1);

    ctx.clearRect(0, 0, width, height);

    // ── Compute transition params ──────────────────────────────────────────
    let tr = { alpha: 1, tx: 0, ty: 0, blur: 0, scale: 1 };
    if (t.enabled) {
      if (transInDur > 0 && timeSec < transInDur) {
        tr = getTransitionParams(transType, timeSec / transInDur, true, width, height);
      } else if (transOutDur > 0 && timeSec > duration - transOutDur) {
        tr = getTransitionParams(transType, (timeSec - (duration - transOutDur)) / transOutDur, false, width, height);
      }
    }

    // ── Apply transition transforms to image drawing ───────────────────────
    if (tr.blur > 0) ctx.filter = `blur(${tr.blur}px)`;
    if (tr.tx !== 0 || tr.ty !== 0) ctx.translate(tr.tx, tr.ty);
    if (tr.scale !== 1) {
      ctx.translate(width / 2, height / 2);
      ctx.scale(tr.scale, tr.scale);
      ctx.translate(-width / 2, -height / 2);
    }

    // ── Draw image ────────────────────────────────────────────────────────
    if (m.enabled && m.effect) {
      const effect = m.applyMode === "random"
        ? ["zoom_in","zoom_out","pan_left","pan_right","pan_up","pan_down"][Math.floor(progress * 3) % 6]
        : (m.effect || "zoom_in");
      drawKenBurns(ctx, img, effect, m.intensity || 0.1, progress, width, height);
    } else {
      drawCover(ctx, img, width, height);
    }

    // ── Reset transition transforms ───────────────────────────────────────
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (tr.blur > 0) ctx.filter = "none";

    // ── Camera shake ──────────────────────────────────────────────────────
    if (e.shakeEnabled) {
      const shakeAmp  = (e.shakeIntensity || 0.3) * width * 0.005;
      const shakeFreq = (e.shakeSpeed || 1) * 2 * Math.PI;
      ctx.translate(
        Math.sin(timeSec * shakeFreq * 1.3 + 0.5) * shakeAmp,
        Math.cos(timeSec * shakeFreq * 0.7 + 1.2) * shakeAmp
      );
    }

    // ── Vignette ──────────────────────────────────────────────────────────
    if (e.vignetteEnabled) {
      drawVignette(ctx, width, height, e.vignetteIntensity || 0.4, e.vignetteRadius || 0.7, e.vignetteSoftness || 0.5);
    }

    // ── Subtitles ─────────────────────────────────────────────────────────
    if (script && s) drawSubtitle(ctx, script, s, width, height);

    // ── Keyword motion graphics ───────────────────────────────────────────
    if (k.enabled && k.perSceneKeywords) {
      const kwForScene = k.perSceneKeywords[script] || [];
      if (kwForScene.length > 0) {
        drawKeywords(ctx, width, height, { keywords: kwForScene, progress, settings: k });
      }
    }

    // ── Reset shake transform ─────────────────────────────────────────────
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // ── Transition fade overlay (for alpha-based transitions) ─────────────
    if (tr.alpha < 0.99) {
      ctx.fillStyle = `rgba(0,0,0,${1 - tr.alpha})`;
      ctx.fillRect(0, 0, width, height);
    }

    frames.push(ctx.getImageData(0, 0, width, height));
    if (onProgress) onProgress(fi + 1, totalFrames);
  }

  return frames;
}

// ── WebCodecs H264 encoder ────────────────────────────────────────────────────
async function encodeFramesToH264(frames, fps, width, height, onProgress) {
  if (typeof VideoEncoder === "undefined") return null;

  // 지원 코덱 순서대로 확인
  const CODECS = ["avc1.42E01F", "avc1.4D001F", "avc1.640028", "avc1.42001E"];
  let supportedCodec = null;
  for (const codec of CODECS) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 8_000_000, framerate: fps });
      if (r.supported) { supportedCodec = codec; break; }
    } catch {}
  }
  if (!supportedCodec) { console.warn("[VideoEncoder] 지원 코덱 없음, WASM으로 폴백"); return null; }

  const chunks = [];
  let encoderError = null;

  const encoder = new VideoEncoder({
    output: (chunk) => { const buf = new Uint8Array(chunk.byteLength); chunk.copyTo(buf); chunks.push(buf); },
    error: (e) => { encoderError = e; console.error("[VideoEncoder] error:", e); },
  });

  try {
    encoder.configure({ codec: supportedCodec, width, height, bitrate: 8_000_000, framerate: fps, latencyMode: "quality" });
  } catch (e) {
    console.warn("[VideoEncoder] configure 실패:", e); return null;
  }

  // 비동기 configure 에러 대기
  await new Promise((r) => setTimeout(r, 50));
  if (encoderError || encoder.state === "closed") { console.warn("[VideoEncoder] configure 후 에러"); return null; }

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");

  for (let i = 0; i < frames.length; i++) {
    if (encoderError || encoder.state !== "configured") break;
    ctx.putImageData(frames[i], 0, 0);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i / fps) * 1e6) });
    try {
      encoder.encode(frame, { keyFrame: i % 30 === 0 });
    } catch (e) {
      frame.close(); encoderError = e; break;
    }
    frame.close();
    if (onProgress) onProgress(i + 1, frames.length);
    if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  if (encoderError) { console.warn("[VideoEncoder] encode 에러, WASM 폴백:", encoderError); return null; }

  try { await encoder.flush(); } catch (e) { console.warn("[VideoEncoder] flush 에러:", e); return null; }
  if (encoder.state !== "closed") encoder.close();
  if (chunks.length === 0) return null;

  const total = chunks.reduce((s, c) => s + c.byteLength, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

// Helper: Uint8Array → base64
function uint8ToBase64(arr) {
  let str = "";
  for (let i = 0; i < arr.length; i += 32768) str += String.fromCharCode(...arr.subarray(i, Math.min(i + 32768, arr.length)));
  return btoa(str);
}

// ── Single scene export ───────────────────────────────────────────────────────
export async function exportScene({ scene, settings, motion, effects, subtitle, transition, keyword, fps = 30, onProgress }) {
  const { aspectRatio = "16:9" } = settings;
  let width, height;
  if (aspectRatio === "9:16") { width = 1080; height = 1920; }
  else if (aspectRatio === "1:1") { width = 1080; height = 1080; }
  else { width = 1920; height = 1080; }

  let duration = settings.sceneDuration || 7;
  if (scene.ttsAudio) {
    try {
      const audio = new Audio(scene.ttsAudio);
      await new Promise((res) => { audio.onloadedmetadata = res; audio.onerror = res; });
      if (audio.duration && audio.duration > 0) duration = audio.duration + 0.5;
    } catch {}
  }

  onProgress?.({ phase: "frames", current: 0, total: Math.round(duration * fps) });
  const frames = await renderSceneToFrames({
    imageBase64: scene.imageBase64, script: scene.script, duration, fps, width, height,
    motion, effects, subtitle, transition, keyword, ttsAudio: scene.ttsAudio,
    onProgress: (f, t) => onProgress?.({ phase: "frames", current: f, total: t }),
  });

  onProgress?.({ phase: "encode", current: 0, total: frames.length });
  const server = await checkServer();

  if (server.available) {
    const h264 = await encodeFramesToH264(frames, fps, width, height, (f, t) => onProgress?.({ phase: "encode", current: f, total: t }));
    if (h264) {
      let audio = null;
      if (scene.ttsAudio) audio = { data: scene.ttsAudio.split(",")[1] || scene.ttsAudio, format: "wav" };
      onProgress?.({ phase: "mux", current: 0, total: 1 });
      const resp = await fetch(`${SERVER_URL}/mux-h264`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ h264Base64: uint8ToBase64(h264), audio, fps }),
      });
      const json = await resp.json();
      if (json.success) {
        return { mp4: Uint8Array.from(atob(json.mp4Base64), c => c.charCodeAt(0)), duration };
      }
    }
  }

  onProgress?.({ phase: "ffmpeg_wasm", current: 0, total: frames.length });
  return await encodeWithFFmpegWasm(frames, duration, fps, width, height, scene, onProgress);
}

// ── FFmpeg WASM fallback encoder ──────────────────────────────────────────────
async function encodeWithFFmpegWasm(frames, duration, fps, width, height, scene, onProgress) {
  let FFmpeg;
  try {
    const mod = await import("@ffmpeg/ffmpeg");
    FFmpeg = mod.FFmpeg;
  } catch {
    throw new Error("FFmpeg WASM를 불러올 수 없습니다. 로컬 서버(server/index.js)를 실행해주세요.");
  }
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "/ffmpeg-core.js",
    wasmURL: "/ffmpeg-core.wasm",
  });

  for (let i = 0; i < frames.length; i++) {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d").putImageData(frames[i], 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    await ffmpeg.writeFile(`frame${String(i).padStart(6, "0")}.png`, new Uint8Array(await blob.arrayBuffer()));
    if (onProgress && i % 10 === 0) onProgress({ phase: "ffmpeg_wasm", current: i, total: frames.length });
  }

  const args = ["-y", "-framerate", String(fps), "-i", "frame%06d.png", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "fast", "-crf", "23", "-movflags", "+faststart"];

  // Add TTS audio if available
  if (scene.ttsAudio) {
    const audioBase64 = scene.ttsAudio.split(",")[1] || scene.ttsAudio;
    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    await ffmpeg.writeFile("audio.wav", audioData);
    args.push("-i", "audio.wav", "-c:a", "aac", "-b:a", "128k", "-shortest");
  }

  args.push("output.mp4");
  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile("output.mp4");
  return { mp4: data instanceof Uint8Array ? data : new Uint8Array(data), duration };
}

// ── FFmpeg WASM 씬 합치기 (로컬 서버 없이도 여러 씬 concat) ───────────────────
async function concatWithFFmpegWasm(mp4List, onProgress) {
  let FFmpeg;
  try {
    const mod = await import("@ffmpeg/ffmpeg");
    FFmpeg = mod.FFmpeg;
  } catch {
    throw new Error("FFmpeg WASM를 불러올 수 없습니다. 로컬 서버(server/index.js)를 실행해주세요.");
  }
  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "/ffmpeg-core.js",
    wasmURL: "/ffmpeg-core.wasm",
  });

  let listTxt = "";
  for (let i = 0; i < mp4List.length; i++) {
    const fname = `part${String(i).padStart(4, "0")}.mp4`;
    await ffmpeg.writeFile(fname, mp4List[i]);
    listTxt += `file '${fname}'\n`;
  }
  await ffmpeg.writeFile("concat_list.txt", listTxt);

  onProgress?.({ phase: "concat", current: 0, total: 1 });
  // 모든 씬이 동일한 인코딩 설정을 거쳐 나온 mp4라 재인코딩 없이 스트림 복사로 합칠 수 있음
  await ffmpeg.exec(["-y", "-f", "concat", "-safe", "0", "-i", "concat_list.txt", "-c", "copy", "output.mp4"]);
  const data = await ffmpeg.readFile("output.mp4");
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

// ── BGM mixing ────────────────────────────────────────────────────────────────
async function mixBgm(mp4Data, bgmDataUrl, volume, server, onProgress) {
  const mp4Base64 = uint8ToBase64(mp4Data);
  const bgmBase64 = bgmDataUrl.includes(",") ? bgmDataUrl.split(",")[1] : bgmDataUrl;
  const vol = Math.round(volume * 100) / 100;

  // Try server first
  if (server.available) {
    try {
      onProgress?.({ phase: "bgm", current: 0, total: 1 });
      const resp = await fetch(`${SERVER_URL}/mix-bgm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mp4Base64, bgmBase64, volume: vol }),
      });
      const json = await resp.json();
      if (json.success) {
        return Uint8Array.from(atob(json.mp4Base64), c => c.charCodeAt(0));
      }
    } catch (err) {
      console.warn("[BGM] 서버 믹싱 실패, WASM 폴백:", err.message);
    }
  }

  // FFmpeg WASM fallback
  let FFmpeg;
  try {
    const mod = await import("@ffmpeg/ffmpeg");
    FFmpeg = mod.FFmpeg;
  } catch {
    console.warn("[BGM] FFmpeg WASM 로드 실패, BGM 없이 진행");
    return mp4Data;
  }

  const ffmpeg = new FFmpeg();
  await ffmpeg.load({
    coreURL: "/ffmpeg-core.js",
    wasmURL: "/ffmpeg-core.wasm",
  });

  const bgmData = Uint8Array.from(atob(bgmBase64), c => c.charCodeAt(0));
  await ffmpeg.writeFile("input.mp4", mp4Data);
  await ffmpeg.writeFile("bgm.mp3", bgmData);

  onProgress?.({ phase: "bgm", current: 0, total: 1 });

  // Try with audio mixing (TTS + BGM), fallback to BGM only
  try {
    await ffmpeg.exec([
      "-i", "input.mp4",
      "-stream_loop", "-1", "-i", "bgm.mp3",
      "-filter_complex", `[1:a]volume=${vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
      "-map", "0:v", "-map", "[aout]",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
      "-y", "output.mp4",
    ]);
  } catch {
    // If no audio stream in video, just add BGM as the only audio
    await ffmpeg.exec([
      "-i", "input.mp4",
      "-stream_loop", "-1", "-i", "bgm.mp3",
      "-map", "0:v", "-map", "1:a",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
      "-y", "output.mp4",
    ]);
  }

  const data = await ffmpeg.readFile("output.mp4");
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

// ── Full video export ─────────────────────────────────────────────────────────
export async function exportVideo({ scenes, settings, motion, effects, subtitle, transition, keyword, bgm, bgmFile, fps = 30, onProgress, onSceneProgress }) {
  const sceneMp4s = new Map();

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (!scene.imageBase64) continue;
    onProgress?.({ phase: "scene", sceneIndex: i, total: scenes.length });
    const result = await exportScene({ scene, settings, motion, effects, subtitle, transition, keyword, fps, onProgress: (p) => onSceneProgress?.({ sceneIndex: i, ...p }) });
    sceneMp4s.set(i, result.mp4);
  }

  const server = await checkServer();
  const sceneKeys = [...sceneMp4s.keys()].sort((a, b) => a - b);

  // Concatenate scenes
  let finalMp4;
  if (sceneKeys.length === 1) {
    finalMp4 = sceneMp4s.get(sceneKeys[0]);
  } else if (server.available) {
    onProgress?.({ phase: "concat" });
    const sceneData = sceneKeys.map(k => ({ mp4Base64: uint8ToBase64(sceneMp4s.get(k)) }));
    const resp = await fetch(`${SERVER_URL}/concat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenes: sceneData }),
    });
    const json = await resp.json();
    if (!json.success) throw new Error(json.error || "concat 실패");
    finalMp4 = Uint8Array.from(atob(json.mp4Base64), c => c.charCodeAt(0));
  } else {
    // 로컬 서버 없이도(=배포된 웹사이트에서 바로) 여러 씬을 합칠 수 있도록 WASM 폴백
    onProgress?.({ phase: "concat" });
    finalMp4 = await concatWithFFmpegWasm(sceneKeys.map(k => sceneMp4s.get(k)), onProgress);
  }

  // BGM mixing
  if (bgm?.enabled && bgmFile?.dataUrl) {
    try {
      finalMp4 = await mixBgm(finalMp4, bgmFile.dataUrl, bgm.volume || 0.15, server, onProgress);
    } catch (err) {
      console.warn("[BGM] 믹싱 실패, BGM 없이 영상 완성:", err.message);
    }
  }

  return { mp4: finalMp4 };
}

// ── Download helper ───────────────────────────────────────────────────────────
export function downloadMp4(mp4Data, filename = "video.mp4") {
  const blob = new Blob([mp4Data], { type: "video/mp4" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
