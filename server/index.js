import express from "express";
import cors from "cors";
import { createRequire } from "module";
import { execFile } from "child_process";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
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

// YouTube proxy (to avoid CORS when fetching YouTube page info)
app.get("/api/youtube/info", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// YouTube transcript extraction
app.get("/api/transcript/:videoId", async (req, res) => {
  const { videoId } = req.params;
  const { lang = "ko" } = req.query;

  if (!videoId) return res.status(400).json({ error: "videoId required" });

  // Try to fetch captions from YouTube
  try {
    // Method 1: Fetch YouTube page to find caption tracks
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
      },
    });
    const html = await pageRes.text();

    // Extract caption tracks from ytInitialPlayerResponse
    const playerResponseMatch = html.match(/ytInitialPlayerResponse\s*=\s*({.+?});/s);
    if (!playerResponseMatch) {
      return res.status(404).json({ error: "YouTube 자막 데이터를 찾을 수 없습니다.", details: { method1: "ytInitialPlayerResponse not found" } });
    }

    let playerResponse;
    try {
      playerResponse = JSON.parse(playerResponseMatch[1]);
    } catch {
      return res.status(500).json({ error: "YouTube 데이터 파싱 실패" });
    }

    const captions = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!captions || captions.length === 0) {
      return res.status(404).json({ error: "이 영상에는 자막이 없습니다.", details: { method1: "no captions found" } });
    }

    // Find preferred language track
    let track = captions.find((t) => t.languageCode === lang)
      || captions.find((t) => t.languageCode === "ko")
      || captions.find((t) => t.languageCode === "en")
      || captions[0];

    const captionUrl = track.baseUrl + "&fmt=json3";
    const captionRes = await fetch(captionUrl);
    if (!captionRes.ok) {
      return res.status(500).json({ error: "자막 파일을 가져오지 못했습니다." });
    }

    const captionData = await captionRes.json();
    const events = captionData.events || [];

    const segments = events
      .filter((e) => e.segs)
      .map((e) => ({
        text: e.segs.map((s) => s.utf8 || "").join("").replace(/\n/g, " ").trim(),
        offset: Math.round((e.tStartMs || 0) / 1000),
        duration: Math.round((e.dDurationMs || 3000) / 1000),
      }))
      .filter((s) => s.text);

    const fullText = segments.map((s) => s.text).join(" ");

    res.json({
      videoId,
      language: track.languageCode,
      segments,
      fullText,
      wordCount: fullText.length,
      method: "youtube_captions",
    });
  } catch (err) {
    console.error("[transcript] Error:", err.message);
    res.status(500).json({ error: err.message, details: { method1: err.message } });
  }
});

const server = createServer(app);
server.listen(PORT, () => {
  console.log(`[Server] FFmpeg server running on http://localhost:${PORT}`);
  console.log(`[Server] FFmpeg path: ${ffmpegPath}`);
});

process.on("SIGTERM", () => { server.close(); });
process.on("SIGINT", () => { server.close(); process.exit(0); });
