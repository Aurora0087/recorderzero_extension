import type React from "react";

import { type RefObject, useRef, useState, useMemo, useEffect } from "react";
import { Pause, Play, ZoomIn, ZoomOut } from "lucide-react";
import { IoPlaySkipBack, IoPlaySkipForward } from "react-icons/io5";
import { ImFilm } from "react-icons/im";
import { GiSoundWaves } from "react-icons/gi";
import { RiTimelineView } from "react-icons/ri";
import { ButtonGroup } from "../ui/button-group";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { deformatTime, formatTime } from "@/lib/utils";
import VideoClipBox from "./video-clip-box";
import { VideoAddProps } from "@/hooks/use-video-editor";

interface BottomTimelineProps {
  videoElementRef: RefObject<HTMLVideoElement | null>;
  videos: VideoTimeLineClip[];
  isPlaying: boolean;
  togglePlay: () => void;
  currentTime: number;
  clipStart: number;
  clipEnd: number;
  onUpdateClip: (start: number, end: number) => void;
  onSeek: ({ time }: { time: number }) => void;
  setSelectedVideoClipId: (videoId: string | null) => void;
  clipUpdate: ({ id, changeData }: VideoUpdateProps) => void;
  addVideo: ({
    url,
    id,
    maxTime,
    minTime,
    name,
    type,
    localyStoreVId,
  }: VideoAddProps) => void;
  deleteVideo: ({ id }: { id: string }) => void;
}

// --- Helper Component: D3 Ruler ---
const TimelineRuler = ({
  duration,
  pixelsPerSecond,
}: {
  duration: number;
  pixelsPerSecond: number;
  width: number;
}) => {
  const ticks = [];
  const step = pixelsPerSecond >= 50 ? 1 : 5; // Draw tick every 1s or 5s depending on zoom

  for (let i = 0; i <= duration; i += step) {
    ticks.push(
      <div
        key={i}
        id="time-line-ruler"
        time-value={i}
        className={`absolute border-l ${
          i % 5 === 0 ? "border-white/80" : "border-gray-600 border-dashed"
        } h-full text-[0.5rem] text-gray-400 pl-1 pt-1 select-none pointer-events-auto`}
        style={{
          left: `${i * pixelsPerSecond}px`,
        }}
      >
        {i % 5 === 0 && <span>{formatTime(i)}</span>}
      </div>
    );
  }

  return <div className="">{ticks}</div>;
};

export default function BottomTimeline({
  isPlaying,
  togglePlay,
  currentTime,
  clipStart,
  clipEnd,
  onUpdateClip,
  onSeek,
  videos,
  setSelectedVideoClipId,
  clipUpdate,
  addVideo,
  deleteVideo,
}: BottomTimelineProps) {
  // State for timeline scaling (Zoom)
  const [pixelsPerSecond, setPixelsPerSecond] = useState(50);
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false); // Add playhead drag state
  const containerRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null); // Add playhead ref for drag target

  useEffect(() => {
    setStartInput(formatTime(clipStart));
  }, [clipStart]);

  useEffect(() => {
    setEndInput(formatTime(clipEnd));
  }, [clipEnd]);

  // 1. Calculate Total Timeline Width
  // Find the end time of the last video to determine how long the timeline should be
  const maxDuration = useMemo(() => {
    if (videos.length === 0) return 120; // Default 1 min
    const lastEnd = Math.max(
      ...videos.map(
        (v) => v.startTime + (v.clipedVideoEndTime - v.clipedVideoStartTime)
      )
    );
    return Math.max(lastEnd + 60, 120); // Add 10s buffer
  }, [videos]);

  const timelineWidth = maxDuration * pixelsPerSecond;

  // 2. Handle Clicking on Timeline to Seek
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // Find elements underneath
    // elementsFromPoint
    const elementsUnderCursor = document.elementsFromPoint(
      e.clientX,
      e.clientY
    );
    const trackElement = elementsUnderCursor.find((element) => {
      // whene cliping on clipes for edit dont want to go to that time line
      return (
        element.id.includes("video-clip-") ||
        element.classList.contains("video-clip-contextMenu")
      );
    });
    if (!trackElement) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const newTime = clickX / pixelsPerSecond;
      onSeek({ time: Math.max(0, newTime) });
    }
  };

  const updateRenderVideoClip = ({
    start = null,
    end = null,
  }: {
    start?: string | null;
    end?: string | null;
  }) => {
    if (!start && !end) {
      toast.error("Values not given in UpdateRenderVideoClip.");
      return;
    }

    // Process start time
    if (start) {
      const startTime = deformatTime(start);
      if (startTime === null) {
        toast.error("Invalid start time format. Use MM:SS.MS");
        return;
      }
      if (startTime < 0) {
        toast.error("Start time cannot be negative");
        return;
      }
      if (startTime >= clipEnd) {
        toast.error("Start time must be before end time");
        return;
      }
      onUpdateClip(startTime, clipEnd);
      toast.success(`Start time updated to ${start}`);
      return;
    }

    // Process end time
    if (end) {
      const endTime = deformatTime(end);
      if (endTime === null) {
        toast.error("Invalid end time format. Use MM:SS.MS");
        return;
      }
      if (endTime <= clipStart) {
        toast.error("End time must be after start time");
        return;
      }
      if (endTime > maxDuration) {
        toast.error(`End time cannot exceed ${formatTime(maxDuration)}`);
        return;
      }
      onUpdateClip(clipStart, endTime);
      toast.success(`End time updated to ${end}`);
      return;
    }
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "start" | "end"
  ) => {
    if (e.key === "Enter") {
      if (type === "start") {
        updateRenderVideoClip({ start: startInput });
      } else {
        updateRenderVideoClip({ end: endInput });
      }
    }
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPlayhead || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const newTime = mouseX / pixelsPerSecond;

      onSeek({ time: Math.max(0, Math.min(newTime, maxDuration)) });
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    if (isDraggingPlayhead) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, pixelsPerSecond, maxDuration, onSeek]);

  const gotoStartTime = () => {
    if (containerRef) {
      containerRef.current?.scrollTo({
        left: 0,
        behavior: "smooth",
      });
    }
    onSeek({ time: clipStart });
  };
  const gotoEndTime = () => {
    if (containerRef) {
      containerRef.current?.scrollTo({
        left: clipEnd * pixelsPerSecond - 50,
        behavior: "smooth",
      });
    }
    onSeek({ time: clipEnd });
  };

  // scrooling in Tracks

  const trackAreaOnScrool = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      setPixelsPerSecond(Math.max(5, pixelsPerSecond - 1));
    } else if (e.deltaY > 0 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      setPixelsPerSecond(Math.min(250, pixelsPerSecond + 1));
    }
    {
    }
  };

  const deleteClipAction = (clipId: string) => {
    const deletingClip = videos.find((v) => v.id === clipId);
    if (!deletingClip) {
      return;
    }
    const deletingClipDuration =
      deletingClip.clipedVideoEndTime - deletingClip.clipedVideoStartTime;
    deleteVideo({ id: deletingClip.id });
    videos.map((v) => {
      if (v.startTime >= deletingClip.startTime) {
        clipUpdate({
          id: v.id,
          changeData: { startTime: v.startTime - deletingClipDuration },
        });
      }
    });
    // to do not showing video after called onseek(0.0)
    onSeek({ time: deletingClip.startTime });
  };

  const replaceClipWithAnother = ({
    replaceingClipId,
    draggingIngClip,
  }: {
    draggingIngClip: VideoTimeLineClip;
    replaceingClipId: string;
  }) => {
    const targetClip = videos.find((v) => v.id === replaceingClipId);
    if (!targetClip) return;

    // 1. Setup Variables
    const draggedDuration =
      draggingIngClip.clipedVideoEndTime - draggingIngClip.clipedVideoStartTime;

    const oldStart = draggingIngClip.startTime;
    const newStart = targetClip.startTime;

    // 2. Logic Split based on Direction
    if (oldStart > newStart) {
      // === DIRECTION: RIGHT TO LEFT (Moving Earlier) ===
      // Example: Moving Clip C(20s) to Clip A(0s)
      // 1. Dragged Clip takes the new spot (0s)
      // 2. Clips in between shift RIGHT to make room (+ duration)

      videos.forEach((v) => {
        // Case A: The Dragged Clip
        if (v.id === draggingIngClip.id) {
          clipUpdate({ id: v.id, changeData: { startTime: newStart } });
        }
        // Case B: Clips between new spot and old spot (inclusive of target)
        // These need to move RIGHT
        else if (v.startTime >= newStart && v.startTime < oldStart) {
          clipUpdate({
            id: v.id,
            changeData: { startTime: v.startTime + draggedDuration },
          });
        }
      });
    } else {
      // === DIRECTION: LEFT TO RIGHT (Moving Later) ===
      // Example: Moving Clip A(0s) to Clip C(20s)
      // 1. Dragged Clip takes the new spot (20s)
      // 2. Clips in between shift LEFT to fill the old gap (- duration)

      let totalDurationOfSlidedClips = draggingIngClip.startTime;

      videos.forEach((v) => {
        // Case B: Clips between old spot and new spot (inclusive of target)
        // These need to move LEFT
        if (
          v.id !== draggingIngClip.id &&
          v.startTime > oldStart &&
          v.startTime <= newStart
        ) {
          clipUpdate({
            id: v.id,
            changeData: { startTime: v.startTime - draggedDuration },
          });
          totalDurationOfSlidedClips +=
            v.clipedVideoEndTime - v.clipedVideoStartTime;
        }
      });

      // Case A: The Dragged Clip
      if (draggingIngClip.id) {
        clipUpdate({
          id: draggingIngClip.id,
          changeData: { startTime: totalDurationOfSlidedClips },
        });
      }
    }
  };

  // --- Drag Handlers for Indicators ---

  const handleStartDrag = (newTime: number) => {
    // Ensure start doesn't pass end
    if (newTime >= clipEnd) return;
    onUpdateClip(newTime, clipEnd);
  };

  const handleEndDrag = (newTime: number) => {
    // Ensure end doesn't go before start
    if (newTime <= clipStart) return;
    onUpdateClip(clipStart, newTime);
  };

  return (
    <div className="bg-card/20 rounded-md overflow-hidden border flex flex-col h-full min-h-32 select-none">
      {/* --- Toolbar --- */}
      <div className="px-2 py-1 border-b flex justify-between items-center gap-2 bg-card w-full overflow-x-auto">
        <div className="flex items-center gap-2">
          <RiTimelineView className="h-4 w-4" />
          <p className="text-sm font-medium">Timeline</p>
        </div>

        <ButtonGroup>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={gotoStartTime}
            title="Go to start"
          >
            <IoPlaySkipBack />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={togglePlay}
            title="Toggle video player"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={gotoEndTime}
            title="Go to end"
          >
            <IoPlaySkipForward />
          </Button>
        </ButtonGroup>

        <div className="flex gap-2 items-center">
          {/* Zoom Controls */}
          <div className="flex items-center mr-4 border-r pr-4 gap-1">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setPixelsPerSecond(Math.max(5, pixelsPerSecond - 5))
              }
              title="Zoom-out timeline"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-8 text-center">
              {Math.round(pixelsPerSecond)}%
            </span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() =>
                setPixelsPerSecond(Math.min(250, pixelsPerSecond + 5))
              }
              title="Zoom-in timeline"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <InputGroup className=" h-8" title="Starting time">
            <InputGroupInput
              className=" w-24 h-8"
              onChange={(e) => setStartInput(e.target.value)} // Only update state, don't call update
              onKeyDown={(e) => handleInputKeyDown(e, "start")} // Add Enter key handler
              value={startInput}
              placeholder="Start"
            />
            <InputGroupAddon align="inline-start">
              <span>Start</span>
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <span>min</span>
            </InputGroupAddon>
          </InputGroup>
          <InputGroup className=" h-8" title="Ending time">
            <InputGroupInput
              className=" w-24 h-8"
              onChange={(e) => setEndInput(e.target.value)} // Only update state, don't call update
              onKeyDown={(e) => handleInputKeyDown(e, "end")} // Add Enter key handler
              value={endInput}
              placeholder="End"
            />
            <InputGroupAddon align="inline-start">
              <span>End</span>
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <span>min</span>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>

      {/* --- Scrollable Timeline Area --- */}
      <div className="flex grow">
        <div className=" w-34 h-full bg-card flex flex-col overflow-hidden border-r">
          <div className=" h-12 font-bold p-2 flex justify-center items-center">
            <span></span>
          </div>
          <div className="p-2 h-16 border-y flex items-center gap-2 text-xs">
            <ImFilm className=" w-4 h-4 text-red-400" />
            <span>Video Channel</span>
          </div>
          <div className="p-2 h-16 border-y flex items-center gap-2 text-xs">
            <GiSoundWaves className=" w-4 h-4 text-green-400" />
            <span>Audio hannel</span>
          </div>
        </div>
        <div
          id="time-line-tracks"
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-black/30 transition-transform"
          ref={containerRef}
          onMouseDown={handleTimelineClick}
        >
          <div
            style={{ width: `${timelineWidth}px`, minHeight: "100%" }}
            className="relative"
          >
            {/* A. Ruler Layer */}
            <div className="w-full">
              <TimelineRuler
                duration={maxDuration}
                pixelsPerSecond={pixelsPerSecond}
                width={timelineWidth}
              />
            </div>

            {/* Draggable Indicators */}
            <DraggableIndicator
              time={clipStart}
              pixelsPerSecond={pixelsPerSecond}
              maxDuration={maxDuration}
              color="#22c55e" // Green
              label="Start"
              onChange={handleStartDrag}
              containerRef={containerRef}
            />

            <DraggableIndicator
              time={clipEnd}
              pixelsPerSecond={pixelsPerSecond}
              maxDuration={maxDuration}
              color="#f97316" // Orange
              label="End"
              onChange={handleEndDrag}
              containerRef={containerRef}
            />

            {/* 3. Inverted Overlay (Darken areas OUTSIDE selection) */}
            {/* Left Overlay (0 to Start) */}
            <div
              className="absolute top-0 bottom-0 z-10 bg-black/20 pointer-events-none backdrop-grayscale"
              style={{
                left: 0,
                width: `${clipStart * pixelsPerSecond}px`,
              }}
            />
            {/* Right Overlay (End to Max) */}
            <div
              className="absolute top-0 bottom-0 z-10 bg-black/20 pointer-events-none backdrop-grayscale"
              style={{
                left: `${clipEnd * pixelsPerSecond}px`,
                right: 0,
              }}
            />

            {/* B. Playhead (Cursor) */}
            <div
              ref={playheadRef}
              className="absolute top-0 bottom-0 z-50 pointer-events-none"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
              title="Playhead cursor"
            >
              <div
                className="w-fit h-fit p-1 px-2 -ml-[50%] text-center bg-red-400 rounded-b-md transition-transform text-[0.5rem] text-white pointer-events-auto cursor-ew-resize hover:text-xs"
                onMouseDown={handlePlayheadMouseDown}
              >
                {formatTime(currentTime)}
              </div>
              <div
                className=" bg-red-400 w-px h-full cursor-ew-resize pointer-events-auto"
                onMouseDown={handlePlayheadMouseDown}
              />
            </div>

            {/* C. Tracks / Clips Layer */}
            <div
              onWheel={trackAreaOnScrool}
              className="flex flex-col pb-4 h-fit"
            >
              <div className=" h-12"></div>
              <div
                id="clip-drag-drop-area"
                className=" h-16 flex relative border-y border-dashed"
              >
                {videos.map((clip) => (
                  <VideoClipBox
                    replaceClipWithAnother={replaceClipWithAnother}
                    clipUpdate={clipUpdate}
                    currentTime={currentTime}
                    key={clip.id}
                    clip={clip}
                    pixelsPerSecond={pixelsPerSecond}
                    setSelectedVideoClipId={setSelectedVideoClipId}
                    onSeek={onSeek}
                    addVideo={addVideo}
                    deleteClipAction={deleteClipAction}
                  />
                ))}
              </div>
              <div className=" h-16 flex relative border-y border-dashed"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//////////////////////////////////////////////////////////////////////////////////////////////////

const DraggableIndicator = ({
  time,
  pixelsPerSecond,
  maxDuration,
  color,
  label,
  onChange,
  containerRef,
}: {
  time: number;
  pixelsPerSecond: number;
  maxDuration: number;
  color: string;
  label: string;
  onChange: (newTime: number) => void;
  containerRef: RefObject<HTMLDivElement | null>;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const newTime = Math.max(
        0,
        Math.min(relativeX / pixelsPerSecond, maxDuration)
      );

      onChange(newTime);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, maxDuration, onChange, containerRef]);

  return (
    <div
      className={`absolute top-0 bottom-0 z-20 w-px cursor-ew-resize group`}
      style={{
        left: `${time * pixelsPerSecond}px`,
        backgroundColor: color,
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
      }}
    >
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 text-[0.6rem] font-bold text-white px-2 py-1 rounded-b-md whitespace-nowrap opacity-80 group-hover:opacity-100 ${
          isDragging ? "opacity-100 scale-110" : ""
        }`}
        style={{ backgroundColor: color }}
      >
        {label}: {formatTime(time)}
      </div>
      {/* Full height line helper */}
      <div className={`w-full h-full bg-${color}-500 opacity-50`}></div>
    </div>
  );
};
