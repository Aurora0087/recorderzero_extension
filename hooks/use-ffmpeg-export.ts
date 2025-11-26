import { useCallback, useState } from 'react';
import type { VideoEditorState } from '@/hooks/use-video-editor';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export function useFFmpegExport() {

  const ffmpegRef = useRef<FFmpeg | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ffmpegMessage, setffmpegMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadFFmpeg = async () => {
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd';
    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('log', ({ message }) => {
      setffmpegMessage(message);
      console.log(message);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    setIsReady(true);
  }

  const initFFmpeg = useCallback(async () => {
    try {
      if (!ffmpegRef.current) {
        await loadFFmpeg(); // Load only if no instance exists
      } else if (!isReady) {
        setIsReady(true);
      }
    } catch (err) {
      console.error('FFmpeg initialization failed:', err);
      setError('FFmpeg initialization failed');
    }
  }, [isReady]);

  useEffect(() => {
    // Destroy the FFmpeg instance on unmount
    return () => {
      if (ffmpegRef.current) {
        try {
          ffmpegRef.current.terminate();
        } catch (error) {
          console.warn("Error exiting FFmpeg", error)
        }
        ffmpegRef.current = null;
      }
    };
  }, []);

  const exportWithFFmpeg = useCallback(
    async (
      videoFile: File,
      videoUrl: string,
      state: VideoEditorState,
      canvasWidth: number = 800,
      canvasHeight: number = 600
    ) => {
      try {
        setError(null);
        setProgress(0);

        // For now, create a canvas-based export as fallback
        // In production, integrate actual FFmpeg WASM library
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) throw new Error('Could not get canvas context');

        // Create a simple video file by capturing frames
        return await createCanvasVideoExport(
          videoFile,
          videoUrl,
          state,
          canvas,
          ctx,
          canvasWidth,
          canvasHeight,
          (prog) => setProgress(prog)
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Export failed';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  return { initFFmpeg, exportWithFFmpeg, isReady, progress, error, ffmpegMessage };
}

async function createCanvasVideoExport(
  videoFile: File,
  videoUrl: string,
  state: VideoEditorState,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  onProgress: (progress: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';

    video.onloadedmetadata = async () => {
      try {
        const fps = 24;
        const duration = Math.min(state.clipEnd - state.clipStart, video.duration);
        const frameCount = Math.ceil(duration * fps);
        const frames: ImageData[] = [];

        // Extract frames from the clipped region
        for (let i = 0; i < frameCount; i++) {
          const frameTime = state.clipStart + (i / fps);
          video.currentTime = frameTime;

          await new Promise((frameResolve) => {
            video.onseeked = () => {
              // Draw background
              ctx.fillStyle = state.backgroundColor;
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);

              // Draw video with padding
              const videoWidth = canvasWidth - state.padding * 2;
              const videoHeight = canvasHeight - state.padding * 2;
              const aspectRatio = video.videoWidth / video.videoHeight;
              let displayWidth = videoWidth;
              let displayHeight = videoWidth / aspectRatio;

              if (displayHeight > videoHeight) {
                displayHeight = videoHeight;
                displayWidth = videoHeight * aspectRatio;
              }

              const x = (canvasWidth - displayWidth) / 2;
              const y = (canvasHeight - displayHeight) / 2;

              ctx.drawImage(video, x, y, displayWidth, displayHeight);

              // Capture frame
              frames.push(ctx.getImageData(0, 0, canvasWidth, canvasHeight));
              onProgress((i / frameCount) * 100);
              frameResolve(null);
            };
          });
        }

        // Create blob from frames (for now, just export the last frame as PNG)
        // In production, use a WebM or MP4 encoder library
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create video blob'));
            }
          },
          'image/png'
        );
      } catch (err) {
        reject(err);
      }
    };

    video.onerror = () => {
      reject(new Error('Failed to load video'));
    };
  });
}
