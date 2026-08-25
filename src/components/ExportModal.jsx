// src/components/ExportModal.jsx
import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import { checkServer, exportVideo, downloadMp4 } from "../lib/renderer.js";

// ─── SRT helpers ──────────────────────────────────────────────────────────
function secToSrt(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s % 1) * 1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
}

function buildSRT(scenes, sceneDuration) {
  return scenes.map((sc, i) => {
    const start = i * sceneDuration;
    const end = start + sceneDuration;
    return `${i + 1}\n${secToSrt(start)} --> ${secToSrt(end)}\n${sc.script || ""}\n`;
  }).join("\n");
}

// ─── Base64 utils ─────────────────────────────────────────────────────────
function base64ToBytes(b64) {
  const raw = b64.includes(",") ? b64.split(",")[1] : b64;
  return Uint8Array.from(atob(raw), c => c.charCodeAt(0));
}

// ─── Project file builders ────────────────────────────────────────────────

// Premiere Pro / Filmora: FCP7 XML
function buildFCPXML(scenes, title, fps, W, H, sceneDuration) {
  const tb = fps;
  const spf = Math.round(sceneDuration * fps); // frames per scene

  const fileEntries = scenes.map((sc, i) => `
    <file id="file-${i + 1}">
      <name>scene_${String(i + 1).padStart(3, "0")}.png</name>
      <pathurl>scene_${String(i + 1).padStart(3, "0")}.png</pathurl>
      <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
      <duration>${spf}</duration>
      <media>
        <video>
          <samplecharacteristics>
            <width>${W}</width><height>${H}</height>
            <pixelaspectratio>square</pixelaspectratio>
            <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
          </samplecharacteristics>
        </video>
      </media>
    </file>`).join("\n");

  const clipItems = scenes.map((sc, i) => {
    const start = i * spf;
    return `
          <clipitem id="clipitem-${i + 1}">
            <name>씬 ${i + 1}</name>
            <duration>${spf}</duration>
            <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
            <start>${start}</start>
            <end>${start + spf}</end>
            <in>0</in><out>${spf}</out>
            <file id="file-${i + 1}"/>
          </clipitem>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="seq-1">
    <name>${title || "Project"}</name>
    <duration>${scenes.length * spf}</duration>
    <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
    <timecode>
      <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
      <string>00:00:00:00</string><frame>0</frame>
      <displayformat>NDF</displayformat>
    </timecode>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate><timebase>${tb}</timebase><ntsc>FALSE</ntsc></rate>
            <width>${W}</width><height>${H}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </format>
        <track>${clipItems}
        </track>
      </video>
    </media>
  </sequence>
  ${fileEntries}
</xmeml>`;
}

// CapCut draft_content.json — CapCut 실제 프로젝트 포맷
function buildCapCutDraft(scenes, title, W, H, sceneDuration, draftFolderPath = "") {
  const us = (t) => Math.round(t * 1_000_000); // seconds → microseconds
  const uid = () => crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 32);
  const now = Date.now();

  const videoMaterials = scenes.map((sc, i) => {
    const id = uid();
    const fname = `scene_${String(i + 1).padStart(3, "0")}.png`;
    // CapCut은 절대경로 필요 — draftFolderPath가 있으면 절대경로, 없으면 파일명만
    const absPath = draftFolderPath ? `${draftFolderPath}/${fname}` : fname;
    return {
      aigc_type: "none",
      audio_fade: null,
      cartoon: false,
      category_id: "",
      category_name: "local",
      check_flag: 62978047,
      crop: { lower_left_x: 0.0, lower_left_y: 1.0, lower_right_x: 1.0, lower_right_y: 1.0, upper_left_x: 0.0, upper_left_y: 0.0, upper_right_x: 1.0, upper_right_y: 0.0 },
      crop_scale: 1.0,
      duration: us(sceneDuration),
      extra_type_option: 0,
      formula_id: "",
      freeze: null,
      has_audio: false,
      height: H,
      id,
      import_time: Math.floor(now / 1000),
      import_time_ms: now,
      local_id: "",
      local_material_id: id,
      material_id: "",
      material_name: fname,
      material_url: "",
      media_path: "",
      object_locked: null,
      path: absPath,
      picture_from: "none",
      request_id: "",
      source: 0,
      source_platform: 0,
      type: "photo",
      width: W,
    };
  });

  const segments = scenes.map((sc, i) => ({
    cartoon: false,
    clip: { alpha: 1.0, flip: { horizontal: false, vertical: false }, rotation: 0.0, scale: { x: 1.0, y: 1.0 }, transform: { x: 0.0, y: 0.0 } },
    common_keyframes: [],
    enable_adjust: true,
    enable_color_curves: true,
    enable_color_wheels: true,
    enable_lut: true,
    extra_material_refs: [],
    group_id: "",
    id: uid(),
    intensifies_audio: false,
    is_placeholder: false,
    is_tone_modify: false,
    keyframe_refs: [],
    last_nonzero_volume: 1.0,
    material_id: videoMaterials[i].id,
    render_index: i,
    reverse: false,
    source_timerange: { duration: us(sceneDuration), start: 0 },
    speed: 1.0,
    target_timerange: { duration: us(sceneDuration), start: us(i * sceneDuration) },
    track_attribute: 0,
    track_render_index: i,
    visible: true,
    volume: 1.0,
  }));

  const ratioStr = W === H ? "1:1" : W > H ? "16:9" : "9:16";

  return JSON.stringify({
    canvas_config: { background: null, height: H, ratio: ratioStr, width: W },
    color_space: 0,
    config: {
      adjust_max_index: 1, attachment_info: [], combination_max_index: 1, export_range: null,
      extract_audio_last_index: 1, lyrics_recognition_id: "", lyrics_sync: true, lyrics_taskinfo: [],
      maintrack_adsorb: true, material_save_mode: 0, multi_language_current: "none",
      multi_language_list: [], multi_language_main: "none", multi_language_mode: "none",
      original_sound_last_index: 1, record_audio_last_index: 1, sticker_max_index: 1,
      subtitle_keywords_config: null, subtitle_recognition_id: "", subtitle_sync: true,
      subtitle_taskinfo: [], system_font_list: [], use_float_render: false,
      video_mute: false, zoom_info_params: null,
    },
    cover: "",
    create_time: Math.floor(now / 1000),
    draft_type: "",
    duration: us(scenes.length * sceneDuration),
    extra_info: null,
    fps: 30.0,
    free_render_index_mode_on: false,
    function_assistant_info: { theme_infos: [] },
    group_container: null,
    id: uid(),
    is_drop_frame_timecode: false,
    keyframe_graph_list: [],
    keyframes: { adjusts: [], filters: [], stickers: [], texts: [], videos: [] },
    last_modified_platform: {
      app_id: 359289, app_source: "cc", app_version: "8.3.0",
      device_id: "38be5637823c04ddd61cadd80b50c2b2",
      hard_disk_id: "73e89470743b5d13cc6d41f79785a055",
      mac_address: "d49d46240907ba79f9694b731dc3f206",
      os: "mac", os_version: "15.3.1",
    },
    lyrics_effects: [],
    materials: {
      audios: [],
      canvases: [{ album_image: "", blur: 0.0, color: "", id: uid(), image: "", image_id: "", image_name: "", source_platform: 0, team_id: "", type: "canvas_color" }],
      effects: [],
      filters: [],
      material_animations: [],
      speeds: [],
      stickers: [],
      texts: [],
      transitions: [],
      video_effects: [],
      videos: videoMaterials,
    },
    mutable_config: null,
    name: (title || "Project").slice(0, 50),
    new_version: "163.0.0",
    path: "",
    platform: {
      app_id: 359289, app_source: "cc", app_version: "8.3.0",
      device_id: "38be5637823c04ddd61cadd80b50c2b2",
      hard_disk_id: "73e89470743b5d13cc6d41f79785a055",
      mac_address: "d49d46240907ba79f9694b731dc3f206",
      os: "mac", os_version: "15.3.1",
    },
    relationships: [],
    render_index_track_mode_on: true,
    retouch_cover: null,
    smart_ads_info: { draft_url: "", page_from: "", routine: "" },
    source: "default",
    static_cover_image_path: "",
    time_marks: { in: -1, out: -1, stainless: false, template_start: 0 },
    tracks: [{ attribute: 0, flag: 0, id: uid(), is_default_name: true, name: "", segments, type: "video" }],
    uneven_animation_template_info: { composition: "", content: "", order: "", sub_template_info_list: [] },
    update_time: Math.floor(now / 1000),
    version: 360000,
  }, null, 2);
}

// draft_meta_info.json — CapCut 프로젝트 메타 정보
function buildCapCutMeta(title, W, H, draftFolderPath = "", rootPath = "", draftId = "", totalDurationUs = 0) {
  const nowUs = Date.now() * 1000; // ms → microseconds
  const id = draftId || crypto.randomUUID().replace(/-/g, "").toUpperCase();
  return JSON.stringify({
    cloud_draft_cover: false,
    cloud_draft_sync: false,
    cloud_package_completed_time: "",
    draft_cloud_capcut_purchase_info: "",
    draft_cloud_last_action_download: false,
    draft_cloud_package_type: "",
    draft_cloud_purchase_info: "",
    draft_cloud_template_id: "",
    draft_cloud_tutorial_info: "",
    draft_cloud_videocut_purchase_info: "",
    draft_cover: "draft_cover.jpg",
    draft_deeplink_url: "",
    draft_enterprise_info: { draft_enterprise_extra: "", draft_enterprise_id: "", draft_enterprise_name: "", enterprise_material: [] },
    draft_fold_path: draftFolderPath,
    draft_id: id,
    draft_is_ae_produce: false,
    draft_is_ai_packaging_used: false,
    draft_is_ai_shorts: false,
    draft_is_ai_translate: false,
    draft_is_article_video_draft: false,
    draft_is_cloud_temp_draft: false,
    draft_is_from_deeplink: "false",
    draft_is_invisible: false,
    draft_is_web_article_video: false,
    draft_materials: [{ type: 0, value: [] }],
    draft_materials_copied_info: [],
    draft_name: (title || "Project").slice(0, 50),
    draft_need_rename_folder: false,
    draft_new_version: "",
    draft_removable_storage_device: "",
    draft_root_path: rootPath,
    draft_segment_extra_info: [],
    draft_timeline_materials_size_: 0,
    draft_type: "",
    draft_web_article_video_enter_from: "",
    tm_draft_cloud_completed: "",
    tm_draft_cloud_entry_id: -1,
    tm_draft_cloud_modified: 0,
    tm_draft_cloud_parent_entry_id: -1,
    tm_draft_cloud_space_id: -1,
    tm_draft_cloud_user_id: -1,
    tm_draft_create: nowUs,
    tm_draft_modified: nowUs,
    tm_draft_removed: 0,
    tm_duration: totalDurationUs,
  }, null, 2);
}

// ─── VREW .vrew 프로젝트 빌더 (Cineboard exportVrew.js 포팅) ────────────────

function vrewUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
  });
}
function vrewShortId() {
  return Math.random().toString(16).substring(2, 12);
}
function vrewDataUrlToBytes(dataUrl) {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function vrewPlaceholderPng(w, h) {
  try {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#1a1f2b";
    ctx.fillRect(0, 0, w, h);
    return vrewDataUrlToBytes(c.toDataURL("image/png"));
  } catch {
    return vrewDataUrlToBytes("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
  }
}
function vrewCleanScript(text) {
  if (!text) return "";
  let t = text;
  t = t.replace(/^#+\s*.*$/gm, "");
  t = t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  t = t.split("\n").map(l => l.trim()).filter(l => l.length > 0).join(" ");
  return t.trim();
}

async function buildVREWProject(scenes, title, aspectRatio = "16:9", sceneDuration = 7) {
  const isVertical = aspectRatio === "9:16";
  const videoWidth  = isVertical ? 1080 : 1920;
  const videoHeight = isVertical ? 1920 : 1080;
  const videoRatio  = isVertical ? 0.5625 : 1.7777777777777777;

  const now = new Date();
  const isoDate = now.toISOString();
  const localDate = now.toLocaleString("sv-SE").replace(" ", "T") + "+09:00";

  const CAPTION_STYLE = {
    captionStyleSetting: {
      mediaId: "uc-0010-simple-textbox",
      yAlign: "bottom", yOffset: -0.05, xOffset: 0, rotation: 0, width: 0.96,
      customAttributes: [
        { attributeName: "--textbox-color", type: "color-hex", value: "rgba(0, 0, 0, 0.4)" },
        { attributeName: "--textbox-align", type: "textbox-align", value: "center" },
      ],
      scaleFactor: videoRatio,
    },
    quillStyle: { font: "Pretendard-Vrew_700", size: "100", color: "#ffffff", "outline-on": "true", "outline-color": "#000000", "outline-width": "6" },
  };

  const project = {
    version: 15,
    files: [{
      version: 1, mediaId: "vrewmark_white_01", sourceOrigin: "VREW_RESOURCE",
      fileSize: 6879, name: "vrewmark_white_01.png", type: "Image",
      isTransparent: true, fileLocation: "IN_MEMORY",
    }],
    transcript: { scenes: [] },
    props: {
      assets: {}, audios: {}, overdubInfos: {}, analyzeDate: null,
      captionDisplayMode: { 0: true, 1: false }, mediaEffectMap: {},
      markerNames: { 0: "", 1: "", 2: "", 3: "", 4: "", 5: "" },
      flipSetting: {}, videoRatio,
      globalVideoTransform: { zoom: 1, xPos: 0, yPos: 0, rotation: 0 },
      videoSize: { width: videoWidth, height: videoHeight },
      backgroundMap: {},
      globalCaptionStyle: { ...CAPTION_STYLE, quillJsonForDisplay: [] },
      lastTTSSettings: {
        pitch: 1, speed: -1, volume: -1,
        speaker: { gender: "female", age: "middle", provider: "vrew", lang: "ko-KR", name: "va29", speakerId: "va29", versions: ["v2"] },
        version: "v2",
      },
      initProjectVideoSize: { width: videoWidth, height: videoHeight },
      pronunciationDisplay: true, projectAudioLanguage: "ko",
      audioLanguagesMap: {}, originalClipsMap: {}, ttsClipInfosMap: {},
      waterMark: {
        type: "watermark", mediaId: "vrewmark_white_01",
        xPos: 0.025, yPos: 0.037, height: 0.16118518518518518, width: 0.12, rotation: 0,
        vrewMark: { version: 2, color: "WHITE", index: 0, position: "TOP_LEFT" },
      },
    },
    comment: `3.6.1\t${isoDate}`,
    projectId: vrewUuid(),
    statistics: {
      wordCursorCount:    { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0 },
      wordSelectionCount: { 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0 },
      wordCorrectionCount:{ 0:0,1:0,2:0,3:0,4:0,5:0,6:0,7:0 },
      projectStartMode: "images_to_video",
      saveInfo: {
        created: { version: "3.6.1", date: localDate, stage: "release" },
        updated: { version: "3.6.1", date: localDate, stage: "release" },
        loadCount: 0, saveCount: 1,
      },
      savedStyleApplyCount: 0, cumulativeTemplateApplyCount: 0,
      ratioChangedByTemplate: false, videoRemixInfos: {}, isAIWritingUsed: false,
      clientLinebreakExecuteCount: 0,
      agentStats: { isEdited: false, requestCount: 0, responseCount: 0, toolCallCount: 0, toolErrorCount: 0 },
    },
    lastTTSSettings: {
      pitch: 1, speed: -1, volume: -1,
      speaker: { gender: "female", age: "middle", provider: "vrew", lang: "ko-KR", name: "va29", speakerId: "va29", versions: ["v2"] },
      version: "v2",
    },
  };

  const zip = new JSZip();
  const mediaFolder = zip.folder("media");
  const MIN_DUR = 3;
  const CHARS_PER_SEC = 0.2;

  for (let si = 0; si < scenes.length; si++) {
    const scene = scenes[si];
    const hasImage = !!scene.imageBase64;
    const imageBytes = hasImage
      ? vrewDataUrlToBytes(scene.imageBase64)
      : vrewPlaceholderPng(videoWidth, videoHeight);

    const imageMediaId = vrewUuid();
    const imageFname = `${imageMediaId}.png`;
    mediaFolder.file(imageFname, imageBytes);

    project.files.push({
      version: 1, mediaId: imageMediaId, sourceOrigin: "USER",
      fileSize: imageBytes.length, name: imageFname,
      type: "Image", fileLocation: "IN_MEMORY", isTransparent: false,
    });

    const assetId = vrewUuid();
    project.props.assets[assetId] = {
      mediaId: imageMediaId, xPos: 0, yPos: 0, height: 1, width: 1, rotation: 0,
      zIndex: 0, type: "image", originalWidthHeightRatio: videoRatio,
      importType: "images_to_video", stats: { fillType: "cover" },
    };

    const audioId = vrewUuid().replace(/-/g, "").substring(0, 10);
    const audioFname = `${audioId}.mpga`;
    const mpgaStub = new Uint8Array([255, 251, 144, 0]);

    const clipText = vrewCleanScript(scene.script || "");
    const charCount = clipText.replace(/[\s\n]/g, "").length;
    const clipDuration = Math.min(120, Math.max(MIN_DUR, sceneDuration || Math.ceil(charCount * CHARS_PER_SEC)));

    const words = [];
    const wordTokens = clipText
      ? (clipText.match(/\S+\s*/g) || []).map(w => w.trim() + " ")
      : [];

    if (wordTokens.length === 0) {
      const silDur = Math.min(0.5, clipDuration * 0.1);
      const remDur = clipDuration - silDur;
      words.push({ id: vrewShortId(), text: ".", startTime: 0, duration: parseFloat(silDur.toFixed(4)), aligned: false, type: 0, originalDuration: parseFloat(silDur.toFixed(4)), originalStartTime: 0, truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
      words.push({ id: vrewShortId(), text: "", startTime: parseFloat(silDur.toFixed(4)), duration: parseFloat(remDur.toFixed(4)), aligned: false, type: 1, originalDuration: parseFloat(remDur.toFixed(4)), originalStartTime: parseFloat(silDur.toFixed(4)), truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
      words.push({ id: vrewShortId(), text: "", startTime: clipDuration, duration: 0, aligned: false, type: 2, originalDuration: 0, originalStartTime: clipDuration, truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
    } else {
      const SPEECH_RATIO = 0.7;
      const PUNCT_PAUSE = 0.2;
      const COMMA_PAUSE = 0.15;
      const punctCount = wordTokens.filter(w => /[.!?。]$/.test(w.trim())).length;
      const commaCount = wordTokens.filter(w => /,$/.test(w.trim())).length;
      const totalPause = Math.min(punctCount * PUNCT_PAUSE + commaCount * COMMA_PAUSE, clipDuration * 0.3);
      const speechTime = clipDuration * SPEECH_RATIO - totalPause;
      const totalChars = wordTokens.reduce((s, w) => s + w.replace(/[.!?,。]/g, "").length, 0) || 1;
      let cursor = 0;
      for (let wi = 0; wi < wordTokens.length; wi++) {
        const w = wordTokens[wi];
        const chars = Math.max(1, w.replace(/[.!?,。]/g, "").length);
        const wDur = parseFloat((chars / totalChars * speechTime).toFixed(4));
        words.push({ id: vrewShortId(), text: w, startTime: parseFloat(cursor.toFixed(4)), duration: wDur, aligned: false, type: 0, originalDuration: wDur, originalStartTime: parseFloat(cursor.toFixed(4)), truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
        cursor += wDur;
        if (/[.!?。]$/.test(w.trim()) && wi < wordTokens.length - 1 && totalPause > 0) {
          const p = parseFloat(PUNCT_PAUSE.toFixed(4));
          words.push({ id: vrewShortId(), text: "", startTime: parseFloat(cursor.toFixed(4)), duration: p, aligned: false, type: 1, originalDuration: p, originalStartTime: parseFloat(cursor.toFixed(4)), truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
          cursor += p;
        }
        if (/,$/.test(w.trim()) && wi < wordTokens.length - 1 && totalPause > 0) {
          const p = parseFloat(COMMA_PAUSE.toFixed(4));
          words.push({ id: vrewShortId(), text: "", startTime: parseFloat(cursor.toFixed(4)), duration: p, aligned: false, type: 1, originalDuration: p, originalStartTime: parseFloat(cursor.toFixed(4)), truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
          cursor += p;
        }
      }
      const silStart = parseFloat(cursor.toFixed(4));
      const silDur = parseFloat(Math.max(0.1, clipDuration - silStart).toFixed(4));
      words.push({ id: vrewShortId(), text: "", startTime: silStart, duration: silDur, aligned: false, type: 1, originalDuration: silDur, originalStartTime: silStart, truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
      const endTime = parseFloat((silStart + silDur).toFixed(4));
      words.push({ id: vrewShortId(), text: "", startTime: endTime, duration: 0, aligned: false, type: 2, originalDuration: 0, originalStartTime: endTime, truncatedWords: [], autoControl: false, mediaId: audioId, audioIds: [], assetIds: [], playbackRate: 1 });
    }

    const captionText = clipText || ".";
    mediaFolder.file(audioFname, mpgaStub);
    project.files.push({
      version: 1, mediaId: audioId, sourceOrigin: "VREW_RESOURCE",
      fileSize: mpgaStub.length, name: audioFname, type: "AVMedia",
      videoAudioMetaInfo: { audioInfo: { codec: "mp3", sampleRate: 24000 }, duration: clipDuration },
      sourceFileType: "TTS", fileLocation: "IN_MEMORY",
    });

    project.props.ttsClipInfosMap[audioId] = {
      duration: clipDuration,
      text: { raw: clipText, textAspectLang: "ko-KR", processed: clipText },
      speaker: { ...project.lastTTSSettings.speaker },
      volume: -1, speed: -1, pitch: 1, version: "v2",
    };

    project.transcript.scenes.push({
      id: vrewUuid(),
      clips: [{
        id: vrewUuid(), words, assetIds: [assetId], audioIds: [],
        captionMode: "MANUAL",
        captions: [
          { text: [{ insert: `${captionText}\n` }] },
          { text: [{ insert: "\n" }] },
        ],
        dirty: { blankDeleted: false, caption: false, video: false },
        translationModified: { result: false, source: false },
      }],
      name: `Scene ${String(si + 1).padStart(3, "0")}`,
      dirty: { video: false },
    });
  }

  zip.file("project.json", JSON.stringify(project, null, 2));
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

// ─── Export functions ─────────────────────────────────────────────────────
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportSRT(scenes, sceneDuration, titleStr) {
  const srt = buildSRT(scenes, sceneDuration);
  downloadBlob(new Blob([srt], { type: "text/plain;charset=utf-8" }), `${titleStr || "subtitles"}.srt`);
}

async function exportAssetsZip(scenes, sceneDuration, titleStr) {
  const zip = new JSZip();
  zip.file("subtitles.srt", buildSRT(scenes, sceneDuration));
  const folder = zip.folder("images");
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].imageBase64) {
      folder.file(`scene_${String(i + 1).padStart(3, "0")}.png`, base64ToBytes(scenes[i].imageBase64));
    }
  }
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${titleStr || "project"}_assets.zip`);
}

// CapCut 직접 설치 — File System Access API로 drafts 폴더에 바로 쓰기
async function installCapCutDirect(scenes, settings, title) {
  const arMap = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] };
  const [W, H] = arMap[settings.aspectRatio] || [1920, 1080];
  const dur = settings.sceneDuration || 7;

  // 플레이스홀더로 JSON 생성 — 서버가 실제 절대경로로 교체
  const draftInfoJson = buildCapCutDraft(scenes, title, W, H, dur, "__DRAFT_FOLDER__");
  const totalDurationUs = Math.round(scenes.length * dur * 1_000_000);
  const draftMetaJson = buildCapCutMeta(title, W, H, "__DRAFT_FOLDER__", "__ROOT_PATH__", "__DRAFT_ID__", totalDurationUs);

  const images = scenes
    .map((sc, i) => sc.imageBase64 ? { name: `scene_${String(i + 1).padStart(3, "0")}.png`, base64: sc.imageBase64 } : null)
    .filter(Boolean);

  const res = await fetch("http://localhost:3099/install-capcut", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draftInfoJson, draftMetaJson, images }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "서버 오류");
  return data.draftId;
}

async function exportEditorProject(scenes, settings, title, editor, fps = 30) {
  const arMap = { "16:9": [1920, 1080], "9:16": [1080, 1920], "1:1": [1080, 1080] };
  const [W, H] = arMap[settings.aspectRatio] || [1920, 1080];
  const dur = settings.sceneDuration || 7;

  if (editor === "vrew") {
    const vrewBlob = await buildVREWProject(scenes, title, settings.aspectRatio, dur);
    downloadBlob(vrewBlob, `${title || "project"}.vrew`);
    return;
  }

  if (editor === "capcut") {
    // ⚠️ CapCut 드래프트 등록(draft_info.json / root_meta_info.json)에는 실제 컴퓨터의
    //    절대 경로가 반드시 필요한데, 브라우저는 보안상 절대 경로를 알 수 없다
    //    (File System Access API도 경로 문자열을 안 준다) — 그래서 로컬 서버
    //    (server/index.js, Node fs로 실제 경로를 읽음) 없이는 원천적으로 "직접 설치"가
    //    불가능하다. 예전엔 이 사실 없이 그냥 fetch가 실패하면 알 수 없는 에러만
    //    떴음(서버 없이 배포 사이트만 쓰는 사용자는 항상 실패). 이제 실패 시 왜
    //    안 되는지 명확히 알려주고, 최소한 이미지만이라도 ZIP으로 챙겨준다.
    try {
      await installCapCutDirect(scenes, settings, title);
    } catch (err) {
      const zip = new JSZip();
      const folder = zip.folder("images");
      for (let i = 0; i < scenes.length; i++) {
        if (scenes[i].imageBase64) folder.file(`scene_${String(i + 1).padStart(3, "0")}.png`, base64ToBytes(scenes[i].imageBase64));
      }
      zip.file("subtitles.srt", buildSRT(scenes, dur));
      zip.file(
        "CapCut 직접 설치 안내.txt",
        "CapCut 드래프트 폴더에 자동으로 설치하려면 로컬 서버가 필요합니다.\n\n" +
        "1. 터미널에서 프로젝트 폴더로 이동\n" +
        "2. npm run server 실행 (localhost:3099가 뜰 때까지 대기)\n" +
        "3. 서버를 켠 채로 이 페이지에서 '캡컷' 버튼을 다시 눌러주세요.\n\n" +
        "(CapCut 드래프트 등록 파일은 실제 컴퓨터의 절대 경로를 알아야 해서,\n" +
        " 브라우저만으로는 자동 설치가 원천적으로 불가능합니다. 로컬 서버가 반드시 필요해요.)\n\n" +
        "서버 없이 급하게 쓰려면: 이 ZIP 속 이미지를 CapCut에서 새 프로젝트를 만들고\n" +
        "순서대로 직접 타임라인에 끌어다 놓아 수동으로 편집해주세요.\n\n" +
        `(오류 내용: ${err.message})`
      );
      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `${title || "project"}_capcut_manual.zip`);
      throw new Error("로컬 서버가 꺼져 있어 직접 설치를 할 수 없습니다. 터미널에서 npm run server 실행 후 다시 시도해주세요. (대신 이미지 ZIP은 다운로드했습니다)");
    }
    return;
  }

  // Premiere Pro
  const zip = new JSZip();
  const folder = zip.folder("images");
  for (let i = 0; i < scenes.length; i++) {
    if (scenes[i].imageBase64) folder.file(`scene_${String(i + 1).padStart(3, "0")}.png`, base64ToBytes(scenes[i].imageBase64));
  }
  zip.file("subtitles.srt", buildSRT(scenes, dur));
  zip.file("sequence.xml", buildFCPXML(scenes, title, fps, W, H, dur));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(blob, `${title || "project"}_premiere.zip`);
}

// ─── Styles ───────────────────────────────────────────────────────────────
const S = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 300, padding: 16,
  },
  modal: {
    background: "#1A1D27", borderRadius: 20,
    width: "100%", maxWidth: 580, maxHeight: "90vh",
    display: "flex", flexDirection: "column",
    boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
  },
  header: { padding: "20px 24px 16px", borderBottom: "1px solid #1E2430" },
  body: { flex: 1, overflowY: "auto", padding: "20px 24px" },
  section: { background: "#0E1117", border: "1px solid #1E2430", borderRadius: 12, padding: 16, marginBottom: 14 },
  label: { fontSize: 13, color: "#D1D5DB" },
  row: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  select: { background: "#1A1D27", border: "1px solid #1E2430", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, fontFamily: "inherit", cursor: "pointer" },
};

// ─── Main component ───────────────────────────────────────────────────────
export default function ExportModal({ onClose, scenes, settings, motion, effects, subtitle, transition, keyword, bgm, bgmFile, title }) {
  const [serverStatus, setServerStatus] = useState(null);
  const [fps, setFps] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [exporting2, setExporting2] = useState(""); // "srt"|"zip"|editor name
  const [capCutBasePath, setCapCutBasePath] = useState("");
  const menuRef = useRef(null);

  useEffect(() => { checkServer().then(setServerStatus); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showProjectMenu) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowProjectMenu(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showProjectMenu]);

  const doneScenes = scenes.filter((s) => s.imageBase64);

  async function handleExport() {
    if (!doneScenes.length) return;
    setExporting(true); setError(""); setDone(false);
    try {
      const result = await exportVideo({
        scenes: doneScenes, settings, motion, effects, subtitle, transition, keyword, bgm, bgmFile, fps,
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

  async function handleQuickExport(type) {
    if (!doneScenes.length) return;
    setExporting2(type);
    try {
      const dur = settings.sceneDuration || 7;
      if (type === "srt") await exportSRT(doneScenes, dur, title);
      else if (type === "zip") await exportAssetsZip(doneScenes, dur, title);
      else await exportEditorProject(doneScenes, { ...settings, _capCutBasePath: capCutBasePath }, title, type, fps);
    } catch (err) {
      alert("내보내기 실패: " + err.message);
    } finally {
      setExporting2("");
      setShowProjectMenu(false);
    }
  }

  function getProgressText() {
    if (!progress) return "";
    const { phase, current, total } = progress;
    if (phase === "scene") return `씬 렌더링 준비 중...`;
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

  const supportsDirectInstall = typeof window.showDirectoryPicker === "function";
  const PROJECT_EDITORS = [
    { id: "premiere", label: "Premiere Pro", icon: "🎞", sub: "FCP7 XML" },
    { id: "capcut",   label: "CapCut",       icon: "✂️", sub: supportsDirectInstall ? "직접 설치" : "ZIP" },
    { id: "vrew",     label: "VREW",         icon: "📋", sub: ".vrew 파일" },
  ];

  const quickBtn = (label, onClick, busy, color = "#1E2430") => (
    <button
      onClick={onClick}
      disabled={!!busy || !doneScenes.length}
      style={{
        padding: "9px 14px", borderRadius: 10, cursor: busy || !doneScenes.length ? "not-allowed" : "pointer",
        background: color, border: "1px solid rgba(255,255,255,0.08)",
        color: "#D1D5DB", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
        display: "flex", alignItems: "center", gap: 6,
        opacity: busy || !doneScenes.length ? 0.6 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {busy ? <span style={{ width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> : null}
      {label}
    </button>
  );

  return (
    <div style={S.overlay} onClick={(e) => !exporting && e.target === e.currentTarget && onClose()}>
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>🎬 내보내기</h2>
              <p style={{ fontSize: 12, color: "#6B7280", marginTop: 3 }}>{doneScenes.length}개 씬 준비됨</p>
            </div>
            <button onClick={onClose} disabled={exporting} style={{ background: "#2D3748", border: "none", borderRadius: 8, width: 32, height: 32, cursor: exporting ? "not-allowed" : "pointer", color: "#9CA3AF", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", opacity: exporting ? 0.5 : 1 }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={S.body}>
          {/* Server status */}
          <div style={S.section}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>렌더 서버 상태</div>
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
                  서버 실행: <code style={{ background: "#1E2430", padding: "2px 6px", borderRadius: 4, color: "#F97316" }}>node server/index.js</code>
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
              <span style={{ fontSize: 13, color: "#D1D5DB" }}>약 {Math.round(doneScenes.length * (settings.sceneDuration || 7))}초</span>
            </div>
          </div>

          {/* CapCut 경로 설정 */}
          <div style={S.section}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 8 }}>✂️ CapCut 직접 설치 경로</div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 8, lineHeight: 1.6 }}>
              CapCut 프로젝트 파일 버튼을 누르면 <code style={{ background: "#1E2430", padding: "1px 5px", borderRadius: 3, color: "#F97316" }}>com.lveditor.draft</code> 폴더를 직접 선택하라는 창이 뜹니다.<br />
              경로는 <code style={{ background: "#1E2430", padding: "1px 5px", borderRadius: 3, color: "#34D399" }}>root_meta_info.json</code>에서 자동으로 읽어옵니다.
            </div>
            <div style={{ fontSize: 11, color: "#4B5563" }}>
              Mac 기본 위치: <code style={{ color: "#6B7280" }}>~/Movies/CapCut/User Data/Projects/com.lveditor.draft</code>
            </div>
          </div>

          {/* Progress */}
          {exporting && (
            <div style={S.section}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#9CA3AF", marginBottom: 10 }}>렌더링 진행 중...</div>
              <div style={{ fontSize: 13, color: "#D1D5DB", marginBottom: 10 }}>{getProgressText()}</div>
              <div style={{ background: "#1E2430", borderRadius: 8, height: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 8, background: "linear-gradient(90deg, #F97316, #EF4444)", width: `${getProgressPercent()}%`, transition: "width 0.3s" }} />
              </div>
            </div>
          )}

          {done && (
            <div style={{ ...S.section, border: "1px solid #34D399" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#34D399", marginBottom: 4 }}>✅ 내보내기 완료!</div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>MP4 파일이 다운로드되었습니다.</div>
            </div>
          )}

          {error && (
            <div style={{ ...S.section, border: "1px solid rgba(239,68,68,0.4)" }}>
              <div style={{ fontSize: 13, color: "#FCA5A5" }}>❌ {error}</div>
            </div>
          )}

          {!exporting && !done && (
            <div style={{ padding: "10px 14px", background: "rgba(96,165,250,0.05)", border: "1px solid rgba(96,165,250,0.15)", borderRadius: 10, fontSize: 11, color: "#93C5FD", lineHeight: 1.6 }}>
              💡 Chrome/Edge에서 WebCodecs GPU 가속 인코딩이 가능합니다.
            </div>
          )}
        </div>

        {/* Footer — quick export bar */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #1E2430" }}>
          {/* Quick export buttons */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {quickBtn("📄 SRT 자막", () => handleQuickExport("srt"), exporting2 === "srt")}
            {quickBtn("📦 SRT + 에셋 ZIP", () => handleQuickExport("zip"), exporting2 === "zip")}

            {/* Project file dropdown */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                onClick={() => setShowProjectMenu((v) => !v)}
                disabled={!doneScenes.length}
                style={{
                  padding: "9px 14px", borderRadius: 10, cursor: !doneScenes.length ? "not-allowed" : "pointer",
                  background: showProjectMenu ? "#2D3748" : "#1E2430",
                  border: `1px solid ${showProjectMenu ? "#F97316" : "rgba(255,255,255,0.08)"}`,
                  color: "#34D399", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: 6,
                  opacity: !doneScenes.length ? 0.5 : 1,
                }}
              >
                🗂 프로젝트 파일 ▾
              </button>

              {showProjectMenu && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                  background: "#1A1D27", border: "1px solid #2D3748",
                  borderRadius: 12, overflow: "hidden", minWidth: 180,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 10,
                }}>
                  {PROJECT_EDITORS.map((ed) => (
                    <button
                      key={ed.id}
                      onClick={() => handleQuickExport(ed.id)}
                      disabled={exporting2 === ed.id}
                      style={{
                        width: "100%", textAlign: "left",
                        padding: "11px 16px", background: "none", border: "none",
                        color: "#D1D5DB", fontSize: 13, fontFamily: "inherit",
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                        borderBottom: "1px solid #1E2430",
                        transition: "background 0.1s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#2D3748"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                    >
                      <span style={{ fontSize: 16 }}>{ed.icon}</span>
                      <span>{ed.label}</span>
                      {ed.sub && <span style={{ marginLeft: 4, fontSize: 10, color: "#6B7280" }}>{ed.sub}</span>}
                      {exporting2 === ed.id && <span style={{ marginLeft: "auto", width: 12, height: 12, border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* MP4 export button */}
          <button
            onClick={handleExport}
            disabled={exporting || doneScenes.length === 0}
            style={{
              width: "100%", padding: "13px 0",
              background: exporting || doneScenes.length === 0 ? "#374151" : "linear-gradient(90deg, #F97316, #EF4444)",
              border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: 800,
              cursor: exporting || doneScenes.length === 0 ? "not-allowed" : "pointer",
              fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {exporting
              ? <><span style={{ width: 16, height: 16, border: "3px solid rgba(255,255,255,0.4)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> 렌더링 중...</>
              : "🎬 MP4 영상 내보내기 (WebCodecs)"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
