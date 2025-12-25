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

  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current || isLoadingRef.current) return;

    isLoadingRef.current = true;
    const ffmpeg = new FFmpeg();

    ffmpeg.on("log", ({ message }) => {
      setFFmpegMessage((pre) => [...pre, message]);
    });
    ffmpeg.on("progress", ({ progress: prog }) =>
      setProgress(Math.round(prog * 100))
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
    exportType: "mp4" | "gif" | "webm";
    editerState: VideoEditorState;
  }) => {
    try {
      setError(null);
      setExportFileUrl(null);
      setProgress(0);
      setIsExporting(true);

      if (!ffmpegRef.current) await loadFFmpeg();
      const ffmpeg = ffmpegRef.current!;

      const outputW = 1920;
      const outputH = 1080;
      const outputName = `output.${exportType}`;
      const padding = editerState.padding || 0;


      // Calculate safe inner dimensions based on padding
      const innerW = outputW - editerState.padding * 2;
      const innerH = outputH - editerState.padding * 2;

      // 1. Calculate Total Project Duration
      const totalDuration = editerState.clipEnd-editerState.clipStart;

      if (totalDuration <= 0) throw new Error("Invalid clip range selected.");

      // 2. Prepare Background
      const bgImageName = "bg_layer.png";
      const bgBlob = editerState.backgroundGradient.enabled
        ? await createGradientBlob(outputW, outputH, editerState.backgroundGradient.stops, editerState.backgroundGradient.angle)
        : await createColorImageBlob(outputW, outputH, editerState.backgroundColor);
      await ffmpeg.writeFile(bgImageName, await fetchFile(bgBlob));

      // 3. Setup Inputs
      const inputs: string[] = [
        "-loop", "1", "-i", bgImageName];
      const filterParts: string[] = [];
      let lastOverlayLabel = "[0:v]"; // Start with the background

      for (let i = 0; i < editerState.videos.length; i++) {
         const video = editerState.videos[i];
        
        // Timing logic (same as your current logic)
        const clipDuration = video.clipedVideoEndTime - video.clipedVideoStartTime;
        const timelineStart = video.startTime;
        const timelineEnd = video.startTime + clipDuration;
        const renderStart = Math.max(timelineStart, editerState.clipStart);
        const renderEnd = Math.min(timelineEnd, editerState.clipEnd);

        if (renderStart >= renderEnd) continue;

        const offsetInClip = renderStart - timelineStart;
        const actualSourceStart = video.clipedVideoStartTime + offsetInClip;
        const actualSourceDuration = renderEnd - renderStart;
        const relativeStartTime = renderStart - editerState.clipStart;

        // --- DYNAMIC PADDING CALCULATION (Per Clip) ---
        const { w: videoW, h: videoH } = await getVideoDimensions(video.url);
        
        // This matches your MainPreview logic: 
        // We scale the video so that (Video + Padding) fits the 1920x1080 area
        const scaleFactor = outputW / (outputW + 2 * padding);
        
        const scaledVideoW = Math.round(videoW * scaleFactor);
        const scaledVideoH = Math.round(videoH * scaleFactor);

        
        // If it's a vertical video or has a different aspect ratio, 
        // we ensure the X and Y offsets keep it perfectly centered 
        // within the 1920x1080 background.
        const xOffset = (outputW - scaledVideoW) / 2;
        const yOffset = (outputH - scaledVideoH) / 2;

        // Create a specific mask for THIS video's dimensions
        const maskName = `mask_${i}.png`;
        const maskBlob = await createRoundedMaskBlob({
          width: scaledVideoW,
          height: scaledVideoH,
          radius: editerState.borderRadius * scaleFactor,
        });
        await ffmpeg.writeFile(maskName, await fetchFile(maskBlob));

        const vFileName = `input_${i}.mp4`;
        await ffmpeg.writeFile(vFileName, await fetchFile(video.url));
        
        // Add Video Input and mask
        inputs.push("-ss", `${actualSourceStart}`, "-t", `${actualSourceDuration}`, "-i", vFileName);
        inputs.push("-i", maskName);

        // Get the current input index for this video
        const videoInputIdx = inputs.filter(arg => arg === "-i").length - 2;
        const maskInputIdx = inputs.filter(arg => arg === "-i").length - 1;
        
        const scaledLabel = `[v${i}_scaled]`;
        const maskedLabel = `[v${i}_masked]`;
        const outLabel = `[over_${i}]`;

        /**
         * UPDATED FILTER:
         * 1. Scale and pad to match inner area
         * 2. Set pixel format to yuv420p for compatibility
         * 3. Merge with looped mask (Input 1)
         * 4. Overlay onto background with 'enable' for timeline placement
         */
        filterParts.push(
          `[${videoInputIdx}:v]scale=${scaledVideoW}:${scaledVideoH},format=rgba${scaledLabel}`
        );
        filterParts.push(
          `${scaledLabel}[${maskInputIdx}:v]alphamerge${maskedLabel}`
        );
        filterParts.push(
          `${lastOverlayLabel}${maskedLabel}overlay=${xOffset}:${yOffset}:enable='between(t,${relativeStartTime},${relativeStartTime + actualSourceDuration})'${outLabel}`
        );

        lastOverlayLabel = outLabel;
      }

      // Join filters with semicolons, ensuring no trailing semicolon
      const filterComplex = filterParts.join(";");

      const ffmpegArgs = [
        ...inputs,
        "-filter_complex", filterComplex,
        "-map", lastOverlayLabel, // The final combined stream
        "-t", `${totalDuration}`,  // Stop at the work area end
        "-shortest",               // Important: cut off the infinite loops (bg/mask)
      ];

      if (exportType === "gif") {
        ffmpegArgs.push("-f", "gif", "-loop", "0", outputName);
      } else {
        ffmpegArgs.push(
          "-c:v", "libx264",
          "-preset", "ultrafast",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          outputName
        );
      }

      setFFmpegMessage((pre) => [...pre, `**** Running Final Render... ****`]);
      await ffmpeg.exec(ffmpegArgs);

      // 4. Cleanup and Download
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as any], { type: exportType === "gif" ? "image/gif" : "video/mp4" });
      const url = URL.createObjectURL(blob);
      setExportFileUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = `render-${Date.now()}.${exportType}`;
      a.click();

      // Clean up VFS to save memory
      for (let i = 0; i < editerState.videos.length; i++) {
        await ffmpeg.deleteFile(`input_${i}.mp4`);
      }
      await ffmpeg.deleteFile(bgImageName);

    } catch (err) {
      console.error("Export Error:", err);
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [loadFFmpeg]);

  return {
    initFFmpeg: loadFFmpeg,
    exportWithFFmpeg,
    isReady,
    progress,
    error,
    ffmpegMessage,
    exportFileUrl,
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

// Helper 2: Create a Gradient Image Blob using HTML Canvas
const createGradientBlob = async (
  width: number,
  height: number,
  stops: { color: string; position: number }[],
  angle: number
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const length = Math.max(canvas.width, canvas.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  // Convert CSS angle to Canvas Gradient coordinates (Simple approximation)
  // For precise CSS matching, complex trigonometry is needed,
  // but this covers standard diagonal/vertical/horizontal well.
  const angleRad = ((angle - 90) * Math.PI) / 180;

  const x2 = centerX + (Math.cos(angleRad) * length) / 2;
  const y2 = centerY + (Math.sin(angleRad) * length) / 2;
  const x1 = centerX - (Math.cos(angleRad) * length) / 2;
  const y1 = centerY - (Math.sin(angleRad) * length) / 2;

  const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

  // Add color stops (sorted by position)
  stops
    .sort((a, b) => a.position - b.position)
    .forEach((stop) => {
      gradient.addColorStop(stop.position / 100, stop.color);
    });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob failed"));
    }, "image/png");
  });
};

//
const createColorImageBlob = async (
  width: number,
  height: number,
  color: string
): Promise<Blob> => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context failed");

  ctx.fillStyle = color || "#000000";
  ctx.fillRect(0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas blob failed"));
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
