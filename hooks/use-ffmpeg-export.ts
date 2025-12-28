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
      setProgress(Math.max(0,Math.min(Math.round(prog * 100),100)))
    );

    try {
      // standardizing on 'chrome' runtime for MV3
      const localCoreJsUrl = browser.runtime.getURL("/ffmpeg/ffmpeg-core.js");

      const localWasmUrl = browser.runtime.getURL("/ffmpeg/ffmpeg-core.wasm");

      await ffmpeg.load({
        coreURL: await toBlobURL(localCoreJsUrl, "text/javascript"),
        wasmURL: await toBlobURL(localWasmUrl, "application/wasm"),
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
  }: {
    exportType: "mp4" | "gif" | "webm" | "av1";
    editerState: VideoEditorState;
  }) => {
    try {
      setError(null);
      setExportFileUrl(null);
      setProgress(0);
      setIsExporting(true);
      setIsProcessing(true);

      setFFmpegMessage(["󱓞 Initializing FFmpeg Engine..."]);

      if (!ffmpegRef.current) await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const outputW = 1920;
      const outputH = 1080;
      const CHUNK_DURATION = 2; // Small chunks for RAM stability
      const totalDuration = editerState.clipEnd - editerState.clipStart;
      const chunkCount = Math.ceil(totalDuration / CHUNK_DURATION);

      setFFmpegMessage((pre) => [...pre, ` Project Duration: ${totalDuration.toFixed(2)}s | Parts: ${chunkCount}`]);

      const chunkDataArrays: Uint8Array[] = [];

      // --- PHASE 1: RENDER INDIVIDUAL CHUNKS ---
      for (let i = 0; i < chunkCount; i++) {
        const chunkStart = editerState.clipStart + i * CHUNK_DURATION;
        const chunkEnd = Math.min(chunkStart + CHUNK_DURATION, editerState.clipEnd);
        const currentChunkDuration = chunkEnd - chunkStart;

        setFFmpegMessage((pre) => [...pre, `󱦟 Rendering Part ${i + 1}/${chunkCount} (${currentChunkDuration.toFixed(1)}s)...`]);

        // 1. Prepare Background
        const bgImageName = `bg_${i}.png`;
        const bgBlob = await createBackgroundBlob(outputW, outputH, {
          type: editerState.bgType,
          color: editerState.backgroundColor,
          gradient: editerState.backgroundGradient,
          imageUrl: editerState.bgImageUrl,
        });
        await ffmpeg.writeFile(bgImageName, await fetchFile(bgBlob));

        // 2. Build Inputs/Filters
        const inputs: string[] = ["-loop", "1", "-i", bgImageName];
        const filterParts: string[] = [];
        let lastLabel = "[0:v]";

        for (let j = 0; j < editerState.videos.length; j++) {
          const video = editerState.videos[j];
          const vDuration = video.clipedVideoEndTime - video.clipedVideoStartTime;
          const vStartOnTimeline = video.startTime;
          const vEndOnTimeline = video.startTime + vDuration;

          const renderStart = Math.max(vStartOnTimeline, chunkStart);
          const renderEnd = Math.min(vEndOnTimeline, chunkEnd);

          if (renderStart >= renderEnd) continue;

          const sourceStart = video.clipedVideoStartTime + (renderStart - vStartOnTimeline);
          const sourceEnd = video.clipedVideoStartTime + (renderEnd - vStartOnTimeline);
          const relStart = renderStart - chunkStart;
          const relEnd = renderEnd - chunkStart;

          const { w: videoW, h: videoH } = await getVideoDimensions(video.url);
          const fitScale = Math.min(outputW / videoW, outputH / videoH);
          const paddingScaleFactor = outputW / (outputW + 2 * editerState.padding);
          const combinedScale = fitScale * paddingScaleFactor;

          const scaledW = Math.floor((videoW * combinedScale) / 2) * 2;
          const scaledH = Math.floor((videoH * combinedScale) / 2) * 2;

          const maskName = `m_${i}_${j}.png`;
          const mBlob = await createRoundedMaskBlob({
            width: scaledW,
            height: scaledH,
            radius: editerState.borderRadius * paddingScaleFactor,
          });

          await ffmpeg.writeFile(maskName, await fetchFile(mBlob));
          await ffmpeg.writeFile(`v_${j}`, await fetchFile(video.url));

          inputs.push("-ss", `${sourceStart}`, "-to", `${sourceEnd}`, "-i", `v_${j}`);
          inputs.push("-i", maskName);

          const vIdx = inputs.filter((a) => a === "-i").length - 2;
          const mIdx = inputs.filter((a) => a === "-i").length - 1;

          filterParts.push(`[${vIdx}:v]fps=25,scale=${scaledW}:${scaledH},setpts=PTS-STARTPTS,format=rgba[vs${j}]`);
          filterParts.push(`[vs${j}][${mIdx}:v]alphamerge[vm${j}]`);
          filterParts.push(`${lastLabel}[vm${j}]overlay=${(outputW - scaledW) / 2}:${(outputH - scaledH) / 2}:enable='between(t,${relStart},${relEnd})'[ov${j}]`);
          lastLabel = `[ov${j}]`;
        }

        const chunkName = `chunk_${i}.mp4`;

        await ffmpeg.exec([
          "-fflags", "+genpts",
          ...inputs,
          "-filter_complex", filterParts.length > 0 ? filterParts.join(";") : "format=yuv420p",
          "-map", filterParts.length > 0 ? lastLabel : "0:v",
          "-t", `${currentChunkDuration}`,
          "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22", "-pix_fmt", "yuv420p", "-r", "25",
          chunkName,
        ]);

        const data = await ffmpeg.readFile(chunkName);
        chunkDataArrays.push(data as Uint8Array);

        // CLEAR RAM for next chunk
        const files = await ffmpeg.listDir("/");
        for (const f of files) { if (!f.isDir) await ffmpeg.deleteFile(f.name); }

        setProgress(Math.max(0,Math.min(100,Math.round(((i + 1) / chunkCount) * 80))));
      }

      // --- PHASE 2: JOINING & FINAL CONVERSION ---
      setFFmpegMessage((pre) => [...pre, ` Stitching segments and preparing final ${exportType.toUpperCase()}...`]);

      const concatEntries: string[] = [];
      for (let i = 0; i < chunkDataArrays.length; i++) {
        const name = `part_${i}.mp4`;
        await ffmpeg.writeFile(name, chunkDataArrays[i]);
        concatEntries.push(`file ${name}`);
      }
      await ffmpeg.writeFile("list.txt", concatEntries.join("\n"));

      const finalOutputName = `final_render.${exportType === "av1" ? "mp4" : exportType}`;
      
      let finalArgs = ["-f", "concat", "-safe", "0", "-i", "list.txt"];

      // Add Export-Specific Encoders
      if (exportType === "mp4") {
        finalArgs.push("-c", "copy", finalOutputName);
      } else if (exportType === "gif") {
        finalArgs.push("-vf", "fps=10,scale=720:-1:flags=lanczos", finalOutputName);
      } else if (exportType === "webm") {
        finalArgs.push("-c:v", "libvpx-vp9", "-crf", "30", "-b:v", "0", finalOutputName);
      } else if (exportType === "av1") {
        finalArgs.push("-c:v", "libaom-av1", "-crf", "30", "-cpu-used", "8", finalOutputName);
      }

      await ffmpeg.exec(finalArgs);

      // --- PHASE 3: DOWNLOAD ---
      setFFmpegMessage((pre) => [...pre, ` Export Complete! Preparing Download...`]);
      const finalData = await ffmpeg.readFile(finalOutputName);
      const mimeType = exportType === "gif" ? "image/gif" : exportType === "webm" ? "video/webm" : "video/mp4";
      const blob = new Blob([finalData as any], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${Date.now()}.${exportType === "av1" ? "mp4" : exportType}`;
      a.click();

      setProgress(100);

    } catch (err) {
      console.error("Render Failed:", err);
      setFFmpegMessage((pre) => [...pre, ` Error: ${err instanceof Error ? err.message : "Export failed"}`]);
      setError("Rendering failed. Please try a shorter duration or lower resolution.");
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
