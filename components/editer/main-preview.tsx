import {
  useEffect,
  useRef,
  useCallback,
  RefObject,
  SetStateAction,
} from "react";
import { Play, Pause } from "lucide-react";

interface MainPreviewProps {
  videos: VideoTimeLineClip[];
  videoElementRef: RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  setIsPlaying: (value: SetStateAction<boolean>) => void;
  onLoadedMetadata: () => void;
  onTimeUpdate: () => void;
  onImportClick: () => void;
  currentTime: number;
  clipStart: number;
  clipEnd: number;
  backgroundColor: string;
  backgroundGradient: {
    enabled: boolean;
    stops: { color: string; position: number }[];
    angle: number;
  };
  padding: number;
  borderRadius: number;
  transition: string;
  transitionDuration: number;
  onSeek: (time: number) => void;
}

export default function MainPreview({
  videos,
  videoElementRef,
  isPlaying,
  setIsPlaying,
  onLoadedMetadata,
  onTimeUpdate,
  onImportClick,
  currentTime,
  backgroundColor,
  backgroundGradient,
  padding,
  borderRadius,
  onSeek,
}: MainPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(1);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>("");
  const [activePadding,setActivePadding] = useState(0);

  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  const togglePlay = () => {
    if (videoElementRef.current) {
      if (isPlaying) {
        videoElementRef.current.pause();
      } else {
        videoElementRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoElementRef.current;

    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 1. Clear Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Background
    if (backgroundGradient.enabled) {
      try {
        // Converting angle to radians ***(0° = right, 90° = down, 180° = left, 270° = up)***
        const angleRad = ((backgroundGradient.angle - 90) * Math.PI) / 180;

        // Calculate gradient line endpoints
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const length = Math.max(canvas.width, canvas.height);

        const x2 = centerX + (Math.cos(angleRad) * length) / 2;
        const y2 = centerY + (Math.sin(angleRad) * length) / 2;
        const x1 = centerX - (Math.cos(angleRad) * length) / 2;
        const y1 = centerY - (Math.sin(angleRad) * length) / 2;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);

        // Add color stops (sorted by position)
        backgroundGradient.stops
          .sort((a, b) => a.position - b.position)
          .forEach((stop) => {
            gradient.addColorStop(stop.position / 100, stop.color);
          });

        ctx.fillStyle = gradient;
      } catch (e) {
        // Fallback if color parsing fails
        ctx.fillStyle = backgroundColor || "#000000";
      }
    } else {
      ctx.fillStyle = backgroundColor || "#000000";
    }

    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Video
    if (videos.length > 0 && video && video.readyState >= 2) {
      const canvasComponentW = canvasRef.current?.offsetWidth || 0;
      const scaleFactor = canvasComponentW / CANVAS_WIDTH;
      const activePadding = padding * scaleFactor;

      // Define the "Container" box (the area inside the padding)
      const boxX = activePadding;
      const boxY = activePadding;
      const boxW = canvas.width - activePadding * 2;
      const boxH = canvas.height - activePadding * 2;

      const videoAspect = video.videoWidth / video.videoHeight;
      const boxAspect = boxW / boxH;

      let drawWidth, drawHeight, drawX, drawY;

      if (videoAspect > boxAspect) {
        // Video is wider than box - fit to width
        drawWidth = boxW;
        drawHeight = boxW / videoAspect;
        drawX = boxX;
        drawY = boxY + (boxH - drawHeight) / 2;
      } else {
        // Video is taller than box - fit to height
        drawHeight = boxH;
        drawWidth = boxH * videoAspect;
        drawX = boxX + (boxW - drawWidth) / 2;
        drawY = boxY;
      }

      ctx.save();
      ctx.beginPath();

      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(
          drawX,
          drawY,
          drawWidth,
          drawHeight,
          borderRadius * scaleFactor
        );
      } else {
        ctx.rect(drawX, drawY, drawWidth, drawHeight);
      }
      ctx.clip();

      ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      ctx.restore();
    }

    // 4. Loop
    if (video && !video.paused && !video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [
    videos,
    backgroundColor,
    backgroundGradient,
    padding,
    borderRadius,
    videoElementRef,
  ]);

  // Main Effect: Set up listeners
  useEffect(() => {
    const video = videoElementRef.current;
    if (!video) return;

    const onPlay = () => {
      setIsPlaying(true);
      renderFrame();
    };

    const onPause = () => {
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current!);
      renderFrame();
    };

    const onSeeked = () => {
      renderFrame();
    };

    const onLoadedData = () => {
      onLoadedMetadata();
      renderFrame();
    };

    // Time Update handler
    const onTimeUpdateHandler = () => {
      renderFrame();
      onTimeUpdate();
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("timeupdate", onTimeUpdateHandler);
    video.addEventListener("loadedmetadata", onLoadedData);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("timeupdate", onTimeUpdateHandler);
      video.removeEventListener("loadedmetadata", onLoadedData);
      cancelAnimationFrame(animationFrameRef.current!);
    };
  }, [videoElementRef, renderFrame]);

  // Effect: Re-render when style props change
  useEffect(() => {
    requestAnimationFrame(renderFrame);
  }, [currentTime, padding, borderRadius, backgroundColor, backgroundGradient]);

  // Effect: Update video source based on currentTime
  useEffect(() => {
    if (videos.length === 0) return;

    let newVideoUrl: string = "";
    for (const videoClip of videos) {
      if (
        currentTime >= videoClip.startTime + videoClip.clipedVideoStartTime &&
        currentTime <= videoClip.startTime + videoClip.clipedVideoEndTime
      ) {
        newVideoUrl = videoClip.url;
        break;
      }
    }

    if (newVideoUrl !== currentVideoUrl) {
      if (videoElementRef.current && newVideoUrl.length > 1) {
        const video = videoElementRef.current;

        // Pause first to avoid interrupting play()
        video.pause();
        video.src = newVideoUrl;
        setCurrentVideoUrl(newVideoUrl);
        console.log("Video url change :", newVideoUrl);
        // resume playing after loading
        video.load();
        if (isPlaying) {
          video.play().catch((err) => {
            if (err.name !== "AbortError") {
              console.error("Play error:", err);
            }
          });
        }
      }
    }
  }, [currentTime, videoElementRef, currentVideoUrl, isPlaying, videos]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-card overflow-hidden rounded-md border p-2">
      <div
        ref={containerRef}
        className="w-full overflow-hidden relative flex flex-col justify-center items-center"
      >
        {videos.length <= 0 ? (
          <div className="w-full h-full bg-accent animate-pulse rounded-md"></div>
        ) : (
          <div
            ref={canvasWrapper}
            className=" aspect-video h-[60vh] rounded-lg overflow-hidden relative group transition-transform"
            title="Output video preview"
          >
            <video
              ref={videoElementRef}
              className="absolute w-0 h-0 object-center opacity-0 pointer-events-none"
            />

            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="h-full w-full aspect-video"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 cursor-pointer w-full h-full flex items-center justify-center hover:bg-black/20 transition opacity-0 group-hover:opacity-100"
            >
              <div className="w-16 h-16 rounded-full bg-background/50 flex items-center justify-center backdrop-blur-sm">
                {isPlaying ? <Pause /> : <Play />}
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
