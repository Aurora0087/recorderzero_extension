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
  videoRefs: RefObject<Map<string, HTMLVideoElement>>;
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
  videoRefs,
}: MainPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const canvasWrapper = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>(1);
  const [currentVideoId, setCurrentVideoId] = useState<string>("");
  const [activePaddingX, setActivePaddingX] = useState(0);
  const [activePaddingY, setActivePaddingY] = useState(0);
  const [activeRadiusing, setActiveRadiusing] = useState(0);
  const videoRapperRef = useRef<HTMLDivElement>(null);

  const CANVAS_WIDTH = 1920;
  const CANVAS_HEIGHT = 1080;

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
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

    const canvasWrapperW = canvasWrapper.current?.offsetWidth || 1;
    const canvasWrapperH = canvasWrapper.current?.offsetHeight || 1;

    const videoWapperW = videoRapperRef.current?.offsetWidth || 1;
    const videoWapperH = videoRapperRef.current?.offsetHeight || 1;

    const scaleFactorW = canvasWrapperW / (CANVAS_WIDTH + 2 * padding);

    setActivePaddingX(padding * scaleFactorW);
    const extraPH =
      (((videoWapperW + 2 * padding) * canvasWrapperH) / canvasWrapperW -
        videoWapperH) *
      0.5;
    setActivePaddingY(extraPH * scaleFactorW);
    setActiveRadiusing(borderRadius * scaleFactorW);

    // 4. Loop
    if (video && !video.paused && !video.ended) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [backgroundColor, backgroundGradient, padding, borderRadius]);

  // Main Effect: Set up listeners
  useEffect(() => {
    renderFrame();
  }, [videoRefs]);

  // Effect: Re-render when style props change
  useEffect(() => {
    requestAnimationFrame(renderFrame);
  }, [currentTime, padding, borderRadius, backgroundColor, backgroundGradient]);

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
            className=" aspect-video h-[60vh] overflow-hidden relative group transition-transform"
            title="Output video preview"
          >
            <canvas ref={canvasRef} className="absolute h-full w-full" />
            <div
              style={{
                paddingRight: activePaddingX,
                paddingLeft: activePaddingX,
                paddingTop: activePaddingY,
                paddingBottom: activePaddingY,
              }}
              className=" relative w-full h-full aspect-video"
            >
              <div
                ref={videoRapperRef}
                className="relative w-full h-full aspect-video overflow-hidden"
                style={{ borderRadius: activeRadiusing }}
              >
                {videos.map((v) => {
                  return (
                    <video
                      key={v.id}
                      id={v.id}
                      ref={(el) => {
                        if (el) {
                          videoRefs.current.set(v.id, el);
                        } else {
                          videoRefs.current.delete(v.id);
                        }
                      }}
                      src={v.url}
                      controls={false}
                      className="absolute w-full h-full object-fill opacity-100 pointer-events-none"
                    />
                  );
                })}
              </div>
            </div>

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
