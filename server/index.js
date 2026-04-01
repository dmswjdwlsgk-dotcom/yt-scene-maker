import express from "express";
import cors from "cors";
import { createRequire } from "module";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdir, rm } from "fs/promises";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createServer } from "http";

const require = createRequire(import.meta.url);

let ffmpegPath;
try {
  const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
  ffmpegPath = ffmpegInstaller.path;
} catch {
  ffmpegPath = "ffmpeg"; // fallback to system ffmpeg
}

const app = express();
const PORT = 3099;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true, limit: "500mb" }));

// Health check
app.get("/health", async (req, res) => {
  try {
    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, ["-version"], { timeout: 5000 }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
    res.json({ status: "ok", ffmpeg: true, gpuEncoder: null, encoders: ["libx264"] });
  } catch (err) {
    res.json({ status: "ok", ffmpeg: false, gpuEncoder: null, encoders: [] });
  }
});

// Mux H264 raw NAL units + audio into MP4
app.post("/mux-h264", async (req, res) => {
  const { h264Base64, audio, fps = 30 } = req.body;
  if (!h264Base64) {
    return res.status(400).json({ success: false, error: "h264Base64 required" });
  }

  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpDir = tmpdir();
  const h264File = join(tmpDir, `${tmpId}.h264`);
  const audioFile = join(tmpDir, `${tmpId}.wav`);
  const outputFile = join(tmpDir, `${tmpId}.mp4`);

  try {
    // Write H264 data
    const h264Data = Buffer.from(h264Base64, "base64");
    await writeFile(h264File, h264Data);

    let ffmpegArgs;

    if (audio && audio.data) {
      // Write audio
      const audioData = Buffer.from(audio.data, "base64");
      await writeFile(audioFile, audioData);

      ffmpegArgs = [
        "-y",
        "-r", String(fps),
        "-i", h264File,
        "-i", audioFile,
        "-c:v", "copy",
        "-c:a", "aac",
        "-b:a", "128k",
        "-shortest",
        "-movflags", "+faststart",
        outputFile,
      ];
    } else {
      ffmpegArgs = [
        "-y",
        "-r", String(fps),
        "-i", h264File,
        "-c:v", "copy",
        "-movflags", "+faststart",
        outputFile,
      ];
    }

    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, ffmpegArgs, { timeout: 120000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    const mp4Data = await readFile(outputFile);
    const mp4Base64 = mp4Data.toString("base64");

    res.json({ success: true, mp4Base64 });
  } catch (err) {
    console.error("[mux-h264] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    // Cleanup
    for (const f of [h264File, audioFile, outputFile]) {
      try { if (existsSync(f)) await unlink(f); } catch {}
    }
  }
});

// Concatenate multiple MP4 scenes
app.post("/concat", async (req, res) => {
  const { scenes } = req.body;
  if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
    return res.status(400).json({ success: false, error: "scenes array required" });
  }

  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpDir = tmpdir();
  const inputFiles = [];
  const listFile = join(tmpDir, `${tmpId}_list.txt`);
  const outputFile = join(tmpDir, `${tmpId}_concat.mp4`);

  try {
    // Write each scene MP4
    let listContent = "";
    for (let i = 0; i < scenes.length; i++) {
      const mp4Data = Buffer.from(scenes[i].mp4Base64, "base64");
      const mp4File = join(tmpDir, `${tmpId}_scene${i}.mp4`);
      await writeFile(mp4File, mp4Data);
      inputFiles.push(mp4File);
      listContent += `file '${mp4File}'\n`;
    }

    await writeFile(listFile, listContent);

    const ffmpegArgs = [
      "-y",
      "-f", "concat",
      "-safe", "0",
      "-i", listFile,
      "-c", "copy",
      "-movflags", "+faststart",
      outputFile,
    ];

    await new Promise((resolve, reject) => {
      execFile(ffmpegPath, ffmpegArgs, { timeout: 300000 }, (err, stdout, stderr) => {
        if (err) reject(new Error(stderr || err.message));
        else resolve();
      });
    });

    const mp4Data = await readFile(outputFile);
    const mp4Base64 = mp4Data.toString("base64");

    res.json({ success: true, mp4Base64 });
  } catch (err) {
    console.error("[concat] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    for (const f of [...inputFiles, listFile, outputFile]) {
      try { if (existsSync(f)) await unlink(f); } catch {}
    }
  }
});

// BGM mixing: overlay BGM audio on final concatenated MP4
app.post("/mix-bgm", async (req, res) => {
  const { mp4Base64, bgmBase64, volume = 0.15 } = req.body;
  if (!mp4Base64 || !bgmBase64) return res.status(400).json({ success: false, error: "mp4Base64 and bgmBase64 required" });

  const tmpId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const tmpDir = tmpdir();
  const mp4File  = join(tmpDir, `${tmpId}_input.mp4`);
  const bgmFile  = join(tmpDir, `${tmpId}_bgm.mp3`);
  const outFile  = join(tmpDir, `${tmpId}_out.mp4`);
  const vol = Math.min(2, Math.max(0, parseFloat(volume)));

  try {
    await writeFile(mp4File, Buffer.from(mp4Base64, "base64"));
    await writeFile(bgmFile, Buffer.from(bgmBase64, "base64"));

    // Try with TTS+BGM amix; fallback to BGM-only if no audio stream
    const tryMix = (args) => new Promise((resolve, reject) =>
      execFile(ffmpegPath, args, { timeout: 180000 }, (err, _out, stderr) => err ? reject(new Error(stderr || err.message)) : resolve())
    );

    try {
      await tryMix([
        "-y", "-i", mp4File,
        "-stream_loop", "-1", "-i", bgmFile,
        "-filter_complex", `[1:a]volume=${vol}[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[aout]`,
        "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", outFile,
      ]);
    } catch {
      // No audio stream in video — add BGM as sole audio track
      await tryMix([
        "-y", "-i", mp4File,
        "-stream_loop", "-1", "-i", bgmFile,
        `-filter_complex`, `[1:a]volume=${vol}[bgm]`,
        "-map", "0:v", "-map", "[bgm]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
        "-shortest", outFile,
      ]);
    }

    const data = await readFile(outFile);
    res.json({ success: true, mp4Base64: data.toString("base64") });
  } catch (err) {
    console.error("[mix-bgm] Error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    for (const f of [mp4File, bgmFile, outFile]) {
      try { if (existsSync(f)) await unlink(f); } catch {}
    }
  }
});

// Supertone TTS proxy
app.use("/api/supertone", async (req, res) => {
  const targetUrl = `https://supertoneapi.com${req.path}`;
  try {
    const headers = { ...req.headers };
    delete headers.host;
    delete headers.connection;

    let body;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = JSON.stringify(req.body);
    }

    const fetchRes = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body,
    });

    res.status(fetchRes.status);
    for (const [key, val] of fetchRes.headers.entries()) {
      if (!["transfer-encoding", "connection"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    }

    const data = await fetchRes.arrayBuffer();
    res.send(Buffer.from(data));
  } catch (err) {
    console.error("[supertone proxy] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// CapCut 프로젝트 직접 설치
app.post("/install-capcut", async (req, res) => {
  const { draftInfoJson, draftMetaJson, images, capCutRootPath } = req.body;

  const rootPath = capCutRootPath || `${process.env.HOME}/Movies/CapCut/User Data/Projects/com.lveditor.draft`;
  // UUID with dashes — CapCut 내부 형식과 동일
  const draftId = randomUUID().toUpperCase();
  const draftFolder = join(rootPath, draftId);
  const nowUs = Date.now() * 1000;

  try {
    // 폴더 생성
    await mkdir(draftFolder, { recursive: true });
    await mkdir(join(draftFolder, "draft_settings"), { recursive: true });

    // 고정 보일러플레이트 파일들
    await writeFile(join(draftFolder, "draft_agency_config.json"),
      JSON.stringify({ is_auto_agency_enabled: false, is_auto_agency_popup: false, is_single_agency_mode: false, marterials: null, use_converter: false, video_resolution: 720 }));
    await writeFile(join(draftFolder, "draft_biz_config.json"), "{}");
    await writeFile(join(draftFolder, "performance_opt_info.json"),
      JSON.stringify({ manual_cancle_precombine_segs: null, need_auto_precombine_segs: null }));

    // draft_info.json — 플레이스홀더를 실제 절대경로로 교체
    const infoStr = draftInfoJson.replace(/__DRAFT_FOLDER__/g, draftFolder);
    await writeFile(join(draftFolder, "draft_info.json"), infoStr);

    // draft_meta_info.json — 경로 교체
    const metaStr = draftMetaJson
      .replace(/__DRAFT_FOLDER__/g, draftFolder)
      .replace(/__ROOT_PATH__/g, rootPath)
      .replace(/__DRAFT_ID__/g, draftId);
    const metaObj = JSON.parse(metaStr);
    const draftName = metaObj.draft_name || "Project";
    const tmDuration = metaObj.tm_duration || 0;
    await writeFile(join(draftFolder, "draft_meta_info.json"), metaStr);

    // 이미지 저장
    for (const img of images || []) {
      const buf = Buffer.from(img.base64.replace(/^data:[^;]+;base64,/, ""), "base64");
      await writeFile(join(draftFolder, img.name), buf);
    }

    // root_meta_info.json 업데이트 — CapCut 프로젝트 레지스트리에 등록
    const rootMetaFile = join(rootPath, "root_meta_info.json");
    let rootMeta = { all_draft_store: [], draft_ids: 0, root_path: rootPath };
    try {
      const existing = await readFile(rootMetaFile, "utf8");
      rootMeta = JSON.parse(existing);
    } catch { /* 없으면 새로 생성 */ }

    rootMeta.all_draft_store = rootMeta.all_draft_store || [];
    rootMeta.all_draft_store.unshift({
      cloud_draft_cover: false,
      cloud_draft_sync: false,
      draft_cloud_last_action_download: false,
      draft_cloud_purchase_info: "",
      draft_cloud_template_id: "",
      draft_cloud_tutorial_info: "",
      draft_cloud_videocut_purchase_info: "",
      draft_cover: join(draftFolder, "draft_cover.jpg"),
      draft_fold_path: draftFolder,
      draft_id: draftId,
      draft_is_ai_shorts: false,
      draft_is_cloud_temp_draft: false,
      draft_is_invisible: false,
      draft_is_web_article_video: false,
      draft_json_file: join(draftFolder, "draft_info.json"),
      draft_name: draftName,
      draft_new_version: "",
      draft_root_path: rootPath,
      draft_timeline_materials_size: 0,
      draft_type: "",
      draft_web_article_video_enter_from: "",
      streaming_edit_draft_ready: true,
      tm_draft_cloud_completed: "",
      tm_draft_cloud_entry_id: -1,
      tm_draft_cloud_modified: 0,
      tm_draft_cloud_parent_entry_id: -1,
      tm_draft_cloud_space_id: -1,
      tm_draft_cloud_user_id: -1,
      tm_draft_create: nowUs,
      tm_draft_modified: nowUs,
      tm_draft_removed: 0,
      tm_duration: tmDuration,
    });
    rootMeta.draft_ids = (rootMeta.draft_ids || 0) + 1;
    rootMeta.root_path = rootPath;
    await writeFile(rootMetaFile, JSON.stringify(rootMeta, null, 2));

    res.json({ success: true, draftId, draftFolder });
  } catch (err) {
    console.error("[install-capcut]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[Server] FFmpeg server running on http://localhost:${PORT}`);
  console.log(`[Server] FFmpeg path: ${ffmpegPath}`);
});

process.on("SIGTERM", () => { server.close(); });
process.on("SIGINT", () => { server.close(); process.exit(0); });
