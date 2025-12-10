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

        setFFmpegMessage(["****Starting Exporing File Prosses.****"]);

        // --- 1. Initialize FFmpeg ---
        if (!ffmpegRef.current) {
          await loadFFmpeg();
          // specific check if load failed
          if (!ffmpegRef.current)
            throw new Error("Could not initialize FFmpeg");
        }

        setFFmpegMessage((pre) => [
          ...pre,
          "****FFmpeg Loaded successfully.****",
        ]);

        const ffmpeg = ffmpegRef.current;

        // --- 2. Input Validation & Setup ---
        if (!editerState.videos || editerState.videos.length === 0) {
          throw new Error("No videos found in state");
        }
        setFFmpegMessage((pre) => [...pre, `**** Finding Edits.****`]);

        const video = editerState.videos[0];
        const inputName = video.name;
        const outputName = `output.${exportType}`;
        const bgImageName = "bg_image.png";

        // --- 3. Get Video Dimensions ---
        // We need original dimensions to calculate the padded size
        setFFmpegMessage((pre) => [
          ...pre,
          "**** Calculating Dimensions... ****",
        ]);
        const { w: videoW, h: videoH } = await getVideoDimensions(video.url);

        const padding = editerState.padding || 0;
        const totalW = videoW + padding * 2;
        const totalH = videoH + padding * 2;

        // --- 4. Write Main Video File ---
        const fileData = await fetchFile(video.url);
        setFFmpegMessage((pre) => [
          ...pre,
          `****Fetching ${video.name}'s File data.****`,
        ]);
        await ffmpeg.writeFile(inputName, fileData);
        setFFmpegMessage((pre) => [
          ...pre,
          `****Writeing  ${video.name}'s file data in FFmpeg Sueessfull.****`,
        ]);

        // --- 5. Prepare FFmpeg Command Arguments ---
        let ffmpegArgs: string[] = [];

        // is gradiend bg using
        if (editerState.backgroundGradient.enabled) {
          setFFmpegMessage((pre) => [
            ...pre,
            "**** Generating Gradient Image ****",
          ]);

          // 1. Generate Gradient Blob via Canvas
          const bgBlob = await createGradientBlob(
            totalW,
            totalH,
            editerState.backgroundGradient.stops,
            editerState.backgroundGradient.angle
          );

          // 2. Write Background Image to FFmpeg
          await ffmpeg.writeFile(bgImageName, await fetchFile(bgBlob));

          // 3. Command: Input Video [0] + Input BG [1] -> Overlay Video on BG
          // [1:v][0:v]overlay=x=P:y=P means: Take stream 1 (bg), put stream 0 (video) on top at x,y
          ffmpegArgs = [
            "-i",
            inputName,
            "-i",
            bgImageName,
            "-filter_complex",
            `[1:v][0:v]overlay=x=${padding}:y=${padding}`,
          ];

          setFFmpegMessage((pre) => [
            ...pre,
            `**** enerating Gradient Image Completed ****`,
          ]);
        } else {
          setFFmpegMessage((pre) => [
            ...pre,
            "**** Applied Solid Background ****",
          ]);

          const hexColor = editerState.backgroundColor || "#000000";
          ffmpegArgs = [
            "-i",
            inputName,
            "-vf",
            `pad=w=${totalW}:h=${totalH}:x=${padding}:y=${padding}:color=${hexColor}`,
          ];

          setFFmpegMessage((pre) => [
            ...pre,
            `**** Sigle Color bg completed.****`,
          ]);
        }

        // --- 6. Add Export-Specific Flags ---
        // We append encoding flags to the existing args
        if (exportType === "gif") {
          // For GIF, we usually chain filters.
          // If we already used -filter_complex (gradient), we need to chain the palette gen.
          // This is complex, so for simplicity in this snippet, we might lose quality or
          // need a complex filter chain builder.
          // Simple approach for now (might override filter_complex if not careful):
          if (editerState.backgroundGradient.enabled) {
            // If we used overlay, we need to map the result into the GIF generation
            // This is advanced. For now, let's just stick to standard encoding args
            // assuming the output of the previous step is the input here.
            // *Correction*: FFmpeg exec runs one command. We need to combine them.

            // Append split and palette logic to the existing filter graph string?
            // To keep it simple for this fix, we will just output standard GIF params
            // Note: High quality GIF with overlay requires complicated filter chaining.
            // Using basic GIF settings for reliability:
            ffmpegArgs.push("-f", "gif", "-loop", "0");
          } else {
            // Solid color uses -vf, we can append scale/fps to it
            const currentFilter = ffmpegArgs[2]; // "pad=..."
            ffmpegArgs[2] = `${currentFilter},fps=10,scale=320:-1:flags=lanczos`;
            ffmpegArgs.push("-loop", "0");
          }
        } else {
          // MP4 / WebM
          ffmpegArgs.push(
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast", // Use ultrafast for WASM performance
            "-crf",
            "25", // Slightly higher CRF (lower quality) to reduce CPU load
            "-pix_fmt",
            "yuv420p" // Critical for compatibility with QuickTime/Windows
          );
        }

        ffmpegArgs.push(outputName);

        // --- 7. Execute ---
        setFFmpegMessage((pre) => [...pre, `**** Executing FFmpeg... ****`]);
        console.log("Command:", ffmpegArgs);

        await ffmpeg.exec(ffmpegArgs);

        setFFmpegMessage((pre) => [
          ...pre,
          `****Reading output file data.****`,
        ]);
        // --- 8. Read & Download ---
        const data = await ffmpeg.readFile(outputName);

        // Create Download
        const mimeType =
          exportType === "gif" ? "image/gif" : `video/${exportType}`;
        setFFmpegMessage((pre) => [
          ...pre,
          `****readying File for download.****`,
        ]);

        const blob = new Blob([data as any], { type: mimeType });
        const url = URL.createObjectURL(blob);

        setExportFileUrl(url);

        // Auto Download
        const a = document.createElement("a");
        a.href = url;
        a.download = `video-${Date.now()}.${exportType}`;
        document.body.appendChild(a);
        a.click();

        // Cleanup DOM
        setTimeout(() => {
          document.body.removeChild(a);
          // URL.revokeObjectURL(url);
        }, 100);

        // Cleanup FFmpeg FS
        try {
          await ffmpeg.deleteFile(inputName);
          await ffmpeg.deleteFile(outputName);
        } catch (e) {
          console.warn("Cleanup warning:", e);
        }

        setProgress(100);
      } catch (err) {
        console.error("Export Critical Error:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsExporting(false);
      }
    },
    [loadFFmpeg]
  );

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
