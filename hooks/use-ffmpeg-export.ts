import { useCallback, useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { VideoEditorState } from "./use-video-editor";

export function useFFmpegExport() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [ffmpegMessage, setFFmpegMessage] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgressInStages, setExportProgressInStages] = useState<
    { title: string; isDone: boolean; details: string }[]
  >([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);
  const [exportFileUrl, setExportFileUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      setFFmpegMessage((pre) => [...pre, message]);
    });
    ffmpeg.on("progress", ({ progress: prog }) =>
      setProgress(Math.max(0, Math.min(Math.round(prog * 100), 100)))
    );

    try {
      // standardizing on 'chrome' runtime for MV3
      const localCoreJsUrl = browser.runtime.getURL("/ffmpeg/ffmpeg-core.js");

      const localWasmUrl = browser.runtime.getURL("/ffmpeg/ffmpeg-core.wasm");

      const localWasmWorkerUrl = browser.runtime.getURL("/ffmpeg/ffmpeg-core.wasm");

      await ffmpeg.load({
        coreURL: await toBlobURL(localCoreJsUrl, "text/javascript"),
        wasmURL: await toBlobURL(localWasmUrl, "application/wasm"),
        workerURL: await toBlobURL(localWasmWorkerUrl, 'text/javascript'),
      });

      ffmpegRef.current = ffmpeg;
      setIsReady(true);
    } catch (err) {
      console.error("FFmpeg Load Error:", err);
      setError(err instanceof Error ? err.message : "Failed to load FFmpeg");
      ffmpegRef.current = null;
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

const exportWithFFmpeg = useCallback(
  async ({
    exportType,
    editerState,
    resolution = "1k",
    isChunking = false,
  }: {
    exportType: "mp4" | "gif" | "webm" | "av1";
    editerState: VideoEditorState;
    resolution?: "1k" | "720p" | "480p";
    isChunking?: boolean;
  }) => {
    try {
      // 1. Initial State & Validation
      setError(null);
      setExportFileUrl(null);
      setProgress(0);
      setIsExporting(true);
      setIsProcessing(true);

      const clipStart = editerState.clipStart ?? 0;
      const clipEnd = editerState.clipEnd ?? 0;
      const totalDuration = clipEnd - clipStart;

      if (totalDuration <= 0 || isNaN(totalDuration)) {
        throw new Error("Invalid project duration.");
      }

      setFFmpegMessage([`🚀 Initializing ${isChunking ? "Chunked" : "Single-Pass"} Render...`]);

      if (!ffmpegRef.current) await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      let outputW = 1920; let outputH = 1080;
      if (resolution === "720p") { outputW = 1280; outputH = 720; }
      else if (resolution === "480p") { outputW = 854; outputH = 480; }

      const finalExt = exportType === "av1" ? "mp4" : exportType;
      const finalOutputName = `render.${finalExt}`;
      const padding = editerState.padding ?? 0;

      // --------------------------------------------------------------------------------
      // BRANCH A: CHUNKED RENDER (Memory Safe)
      // --------------------------------------------------------------------------------
      if (isChunking) {
        const CHUNK_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB target
        const segments: { start: number; end: number }[] = [];
        let currentTime = clipStart;

        // Create Segments
        while (currentTime < clipEnd) {
          const activeVideos = editerState.videos.filter((v) => {
            const vEnd = v.startTime + (v.clipedVideoEndTime - v.clipedVideoStartTime);
            return currentTime >= v.startTime && currentTime < vEnd;
          });
          let step = 10;
          if (activeVideos.length > 0) {
            const maxBitrate = Math.max(...activeVideos.map(v => v.sizeByte / (v.clipedVideoEndTime - v.clipedVideoStartTime)));
            step = CHUNK_SIZE_LIMIT / maxBitrate;
          }
          step = Math.max(1, Math.min(60, step));
          let nextTime = Math.min(currentTime + step, clipEnd);
          segments.push({ start: currentTime, end: nextTime });
          currentTime = nextTime;
        }

        const chunkDataArrays: Uint8Array[] = [];

        for (let i = 0; i < segments.length; i++) {
          const chunk = segments[i];
          const curDur = chunk.end - chunk.start;
          setFFmpegMessage(pre => [...pre, `󱦟 Rendering Chunk ${i + 1}/${segments.length} (${curDur.toFixed(1)}s)...`]);

          const bgImg = `bg.png`;
          const bgBlob = await createBackgroundBlob(outputW, outputH, { type: editerState.bgType, color: editerState.backgroundColor, gradient: editerState.backgroundGradient, imageUrl: editerState.bgImageUrl });
          await ffmpeg.writeFile(bgImg, await fetchFile(bgBlob));

          const inputs: string[] = ["-loop", "1", "-i", bgImg];
          const filters: string[] = [];
          let lastL = "[0:v]";

          for (let j = 0; j < editerState.videos.length; j++) {
            const v = editerState.videos[j];
            const vEnd = v.startTime + (v.clipedVideoEndTime - v.clipedVideoStartTime);
            const rStart = Math.max(v.startTime, chunk.start);
            const rEnd = Math.min(vEnd, chunk.end);
            if (rStart >= rEnd) continue;

            const sStart = v.clipedVideoStartTime + (rStart - v.startTime);
            const sEnd = v.clipedVideoStartTime + (rEnd - v.startTime);
            const relS = rStart - chunk.start;
            const relE = rEnd - chunk.start;

            const { w: vW, h: vH } = await getVideoDimensions(v.url);
            const scale = (outputW / (outputW + 2 * padding)) * Math.min(outputW / vW, outputH / vH);
            const sW = Math.floor((vW * scale) / 2) * 2;
            const sH = Math.floor((vH * scale) / 2) * 2;

            const mName = `m_${j}.png`;
            const mBlob = await createRoundedMaskBlob({ width: sW, height: sH, radius: editerState.borderRadius * (outputW / (outputW + 2 * padding)) });
            await ffmpeg.writeFile(mName, await fetchFile(mBlob));
            await ffmpeg.writeFile(`v_${j}`, await fetchFile(v.url));

            inputs.push("-ss", sStart.toFixed(3), "-to", sEnd.toFixed(3), "-i", `v_${j}`, "-i", mName);
            const vIdx = inputs.filter(a => a === "-i").length - 2;
            const mIdx = vIdx + 1;

            filters.push(`[${vIdx}:v]fps=25,scale=${sW}:${sH},setpts=PTS-STARTPTS,format=rgba[vs${j}]`);
            filters.push(`[vs${j}][${mIdx}:v]alphamerge[vm${j}]`);
            filters.push(`${lastL}[vm${j}]overlay=${(outputW - sW) / 2}:${(outputH - sH) / 2}:enable='between(t,${relS.toFixed(3)},${relE.toFixed(3)})'[ov${j}]`);
            lastL = `[ov${j}]`;
          }

          await ffmpeg.exec(["-fflags", "+genpts", ...inputs, "-filter_complex", filters.length > 0 ? filters.join(";") : "format=yuv420p", "-map", filters.length > 0 ? lastL : "0:v", "-t", curDur.toFixed(3), "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", "-r", "25", `c${i}.mp4`]);
          const data = await ffmpeg.readFile(`c${i}.mp4`);
          chunkDataArrays.push(data as Uint8Array);

          const files = await ffmpeg.listDir("/");
          for (const f of files) { if (!f.isDir) await ffmpeg.deleteFile(f.name); }
          setProgress(Math.round(((i + 1) / segments.length) * 85));
        }

        // Join Chunks
        const concatList: string[] = [];
        for (let i = 0; i < chunkDataArrays.length; i++) {
          await ffmpeg.writeFile(`p${i}.mp4`, chunkDataArrays[i]);
          concatList.push(`file p${i}.mp4`);
        }
        await ffmpeg.writeFile("list.txt", concatList.join("\n"));
        let finalArgs = ["-f", "concat", "-safe", "0", "-i", "list.txt"];
        if (exportType === "mp4" || exportType === "av1") finalArgs.push("-c", "copy", finalOutputName);
        else finalArgs.push("-c:v", exportType === "webm" ? "libvpx-vp9" : "libx264", finalOutputName);
        
        await ffmpeg.exec(finalArgs);

      } 
      // --------------------------------------------------------------------------------
      // BRANCH B: SINGLE-PASS RENDER (Fast)
      // --------------------------------------------------------------------------------
      else {
        setFFmpegMessage(pre => [...pre, `🎬 Rendering entire project in one pass...`]);
        
        const bgBlob = await createBackgroundBlob(outputW, outputH, { type: editerState.bgType, color: editerState.backgroundColor, gradient: editerState.backgroundGradient, imageUrl: editerState.bgImageUrl });
        await ffmpeg.writeFile("bg.png", await fetchFile(bgBlob));

        const inputs: string[] = ["-loop", "1", "-i", "bg.png"];
        const filters: string[] = [];
        let lastL = "[0:v]";

        for (let j = 0; j < editerState.videos.length; j++) {
          const v = editerState.videos[j];
          const vDur = v.clipedVideoEndTime - v.clipedVideoStartTime;
          const vEnd = v.startTime + vDur;

          // Only include if video falls within clipStart/End
          const rStart = Math.max(v.startTime, clipStart);
          const rEnd = Math.min(vEnd, clipEnd);
          if (rStart >= rEnd) continue;

          const sStart = v.clipedVideoStartTime + (rStart - v.startTime);
          const sEnd = v.clipedVideoStartTime + (rEnd - v.startTime);
          const relStart = rStart - clipStart;
          const relEnd = rEnd - clipStart;

          const { w: vW, h: vH } = await getVideoDimensions(v.url);
          const scale = (outputW / (outputW + 2 * padding)) * Math.min(outputW / vW, outputH / vH);
          const sW = Math.floor((vW * scale) / 2) * 2;
          const sH = Math.floor((vH * scale) / 2) * 2;

          const mName = `m_${j}.png`;
          const mBlob = await createRoundedMaskBlob({ width: sW, height: sH, radius: editerState.borderRadius * (outputW / (outputW + 2 * padding)) });
          await ffmpeg.writeFile(mName, await fetchFile(mBlob));
          await ffmpeg.writeFile(`v_${j}`, await fetchFile(v.url));

          inputs.push("-ss", sStart.toFixed(3), "-to", sEnd.toFixed(3), "-i", `v_${j}`, "-i", mName);
          const vIdx = inputs.filter(a => a === "-i").length - 2;
          
          filters.push(`[${vIdx}:v]fps=25,scale=${sW}:${sH},setpts=PTS-STARTPTS,format=rgba[vs${j}]`);
          filters.push(`[vs${j}][${vIdx+1}:v]alphamerge[vm${j}]`);
          filters.push(`${lastL}[vm${j}]overlay=${(outputW-sW)/2}:${(outputH-sH)/2}:enable='between(t,${relStart.toFixed(3)},${relEnd.toFixed(3)})'[ov${j}]`);
          lastL = `[ov${j}]`;
        }

        const args = ["-fflags", "+genpts", ...inputs, "-filter_complex", filters.join(";"), "-map", lastL, "-t", totalDuration.toFixed(3)];
        
        if (exportType === "mp4") args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", finalOutputName);
        else if (exportType === "gif") args.push("-f", "gif", finalOutputName);
        else if (exportType === "av1") args.push("-c:v", "libaom-av1", "-crf", "30", "-cpu-used", "8", finalOutputName);
        else args.push("-c:v", "libvpx-vp9", "-crf", "30", finalOutputName);

        await ffmpeg.exec(args);
      }

      // --------------------------------------------------------------------------------
      // FINAL PHASE: DOWNLOAD
      // --------------------------------------------------------------------------------
      const finalData = await ffmpeg.readFile(finalOutputName);
      const url = URL.createObjectURL(new Blob([finalData as any], { type: `video/${finalExt}` }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `render-${Date.now()}.${finalExt}`;
      a.click();
      
      setProgress(100);
      setFFmpegMessage(pre => [...pre, "✅ Done!"]);
    } catch (err) {
      console.error(err);
      setFFmpegMessage(p => [...p, `❌ Error: ${err instanceof Error ? err.message : "Unknown"}`]);
    } finally {
      setIsExporting(false);
      setIsProcessing(false);
    }
  }, [loadFFmpeg]);

  const compressFileForEditor = useCallback(async (file: File) => {
    if (!ffmpegRef.current) await loadFFmpeg();
    const ffmpeg = ffmpegRef.current!;

    const inputName = "raw_input";
    const outputName = "optimized.mp4";

    await ffmpeg.writeFile(inputName, await fetchFile(file));

    // Optimization Command:
    // 1. Scale to 720p (scale=1280:-2) to save 50% RAM
    // 2. Lower bitrate (maxrate 2M)
    // 3. Fast encoding (ultrafast)
    // 4. Force 25fps to prevent sync issues later
    await ffmpeg.exec([
      "-i",
      inputName,
      "-vf",
      "scale=1280:-2,fps=25",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-maxrate",
      "2M",
      "-bufsize",
      "4M",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const optimizedBlob = new Blob([data as any], { type: "video/mp4" });

    // Cleanup FFmpeg memory immediately
    await ffmpeg.deleteFile(inputName);
    await ffmpeg.deleteFile(outputName);

    return optimizedBlob;
  }, []);

  return {
    initFFmpeg: loadFFmpeg,
    exportWithFFmpeg,
    compressFileForEditor,
    isReady,
    progress,
    error,
    ffmpegMessage,
    exportFileUrl,
    isProcessing,
  };
}

// Helper 1: Get Video Dimensions to calculate padding correctly
const getVideoDimensions = (url: string): Promise<{ w: number; h: number }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ w: video.videoWidth, h: video.videoHeight });
    };
    video.onerror = reject;
    video.src = url;
  });
};

interface BackgroundConfig {
  type: "COLOR" | "GRADIENT" | "IMAGE";
  color?: string;
  gradient?: {
    stops: { color: string; position: number }[];
    angle: number;
  };
  imageUrl?: string;
}

const createBackgroundBlob = async (
  width: number,
  height: number,
  config: BackgroundConfig
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  const { type, color, gradient, imageUrl } = config;

  if (type === "COLOR") {
    // --- 1. SOLID COLOR LOGIC ---
    ctx.fillStyle = color || "#000000";
    ctx.fillRect(0, 0, width, height);
  } else if (type === "GRADIENT" && gradient) {
    // --- 2. GRADIENT LOGIC ---
    const centerX = width / 2;
    const centerY = height / 2;
    const length = Math.max(width, height);
    const angleRad = ((gradient.angle - 90) * Math.PI) / 180;

    const x2 = centerX + (Math.cos(angleRad) * length) / 2;
    const y2 = centerY + (Math.sin(angleRad) * length) / 2;
    const x1 = centerX - (Math.cos(angleRad) * length) / 2;
    const y1 = centerY - (Math.sin(angleRad) * length) / 2;

    const canvasGradient = ctx.createLinearGradient(x1, y1, x2, y2);
    [...gradient.stops]
      .sort((a, b) => a.position - b.position)
      .forEach((stop) => {
        canvasGradient.addColorStop(stop.position / 100, stop.color);
      });

    ctx.fillStyle = canvasGradient;
    ctx.fillRect(0, 0, width, height);
  } else if (type === "IMAGE" && imageUrl) {
    // --- 3. IMAGE LOGIC ---
    const img = new Image();
    // Enable cross-origin for external URLs (needed for canvas.toBlob)
    img.crossOrigin = "anonymous";
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("Failed to load background image"));
    });

    // Draw image to fill the canvas dimensions
    ctx.drawImage(img, 0, 0, width, height);
  }

  // Final Step: Convert Canvas to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob conversion failed"));
    }, "image/png");
  });
};

// Helper 4: Create a Image Blob using HTML Canvas
const createRoundedMaskBlob = async ({
  width,
  height,
  radius,
}: {
  width: number;
  height: number;
  radius: number;
}): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) throw new Error("Canvas context failed");

  // 1. Clear everything (make it transparent)
  ctx.clearRect(0, 0, width, height);

  // 2. Draw a White Rounded Rectangle
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  // syntax: roundRect(x, y, w, h, radii)
  if (ctx.roundRect) {
    ctx.roundRect(0, 0, width, height, radius);
  } else {
    // Fallback for older browsers
    ctx.roundRect(0, 0, width, height, [radius]);
  }
  ctx.fill();

  // 3. Convert to Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob failed"));
    }, "image/png");
  });
};
