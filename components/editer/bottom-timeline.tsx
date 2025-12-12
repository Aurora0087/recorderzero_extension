import type React from "react";

import {
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
  useMemo,
  useEffect,
} from "react";
import { Pause, Play, Video, ZoomIn, ZoomOut } from "lucide-react";
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

interface BottomTimelineProps {
  videoElementRef: RefObject<HTMLVideoElement | null>;
  videos: VideoTimeLineClip[];
  isPlaying: boolean;
  togglePlay: () => void;
  currentTime: number;
  clipStart: number;
  clipEnd: number;
  onUpdateClip: (start: number, end: number) => void;
  onSeek: ({time}:{time: number}) => void;
  setSelectedVideoClipId:(videoId:string|null)=>void;
}

export default function BottomTimeline({
  videoElementRef,
  isPlaying,
  togglePlay,
  currentTime,
  clipStart,
  clipEnd,
  onUpdateClip,
  onSeek,
  videos,
  setSelectedVideoClipId
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
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const newTime = clickX / pixelsPerSecond;
    onSeek({time:Math.max(0, newTime)});
  };

  // 3. Generate Ruler Ticks
  const renderRuler = () => {
    const ticks = [];
    const step = pixelsPerSecond >= 50 ? 1 : 5; // Draw tick every 1s or 5s depending on zoom

    for (let i =0; i <= maxDuration; i += step) {
      ticks.push(
        <div
          key={i}
          className={`absolute border-l ${i % 5 === 0?"border-white":null} h-full text-[0.5rem] text-gray-400 pl-1 select-none pointer-events-none`}
          style={{ 
            left: `${i * pixelsPerSecond}px`
         }}
        >
          {i % 5 === 0 && <span>{formatTime(i)}</span>}{" "}
        </div>
      );
    }
    return ticks;
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

  // 4. Auto-scroll timeline when playing
 {/* useEffect(() => {
    if (isPlaying && containerRef.current) {
      const currentPos = currentTime * pixelsPerSecond;
      const centerOffset = containerRef.current.clientWidth / 2;
      if (currentPos > centerOffset) {
        containerRef.current.scrollTo({
          left: currentPos - centerOffset,
          behavior: "smooth",
        });
      }
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);*/}

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

      onSeek({time:Math.max(0, Math.min(newTime, maxDuration))});
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
    onSeek({time:clipStart});
  };
  const gotoEndTime = () => {
    if (containerRef) {
      containerRef.current?.scrollTo({
        left: (clipEnd * pixelsPerSecond)-50,
        behavior: "smooth",
      });
    }
    onSeek({time:clipEnd});
  };

  // scrooling in Tracks 

  const trackAreaOnScrool = (e: React.WheelEvent<HTMLDivElement>)=>{
    if (e.deltaY<0 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      setPixelsPerSecond(Math.max(5, pixelsPerSecond - 1));
    }
    else if (e.deltaY>0 && !e.shiftKey && !e.altKey && !e.ctrlKey) {
      setPixelsPerSecond(Math.min(250, pixelsPerSecond + 1));
    }{}
    
  }
  

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
          <div className=" h-8 font-bold p-2 flex justify-center items-center">
            <span></span>
          </div>
          <div className="p-2 h-16 border-y flex items-center gap-2 text-xs">
            <ImFilm className=" w-4 h-4 text-red-400"/>
            <span>Video Channel</span>
          </div>
          <div className="p-2 h-16 border-y flex items-center gap-2 text-xs">
            <GiSoundWaves className=" w-4 h-4 text-green-400"/>
            <span>Audio hannel</span>
          </div>
        </div>
        <div
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-black/30 transition-transform"
        ref={containerRef}
        onClick={handleTimelineClick}
      >
        <div
          style={{ width: `${timelineWidth}px`, minHeight: "100%" }}
          className="relative"
        >
          {/* A. Ruler Layer */}
          <div className="w-full">{renderRuler()}</div>

          {/* Start Clip Indicator */}
          <div
            className="absolute top-8 bottom-0 z-10 w-0.5 bg-green-500 pointer-events-none"
            style={{ left: `${clipStart * pixelsPerSecond}px` }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-green-500 bg-black/50 px-2 py-1 rounded whitespace-nowrap">
              Start
            </div>
          </div>

          {/* End Clip Indicator */}
          <div
            className="absolute top-8 bottom-0 z-10 w-0.5 bg-orange-500 pointer-events-none"
            style={{ left: `${clipEnd * pixelsPerSecond}px` }}
          >
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-bold text-orange-500 bg-black/50 px-2 py-1 rounded whitespace-nowrap">
              End
            </div>
          </div>

          {/* Semi-transparent overlay for clipped region */}
          <div
            className="absolute top-8 bottom-0 z-5 bg-primary/10 pointer-events-none"
            style={{
              left: `${clipStart * pixelsPerSecond}px`,
              width: `${(clipEnd - clipStart) * pixelsPerSecond}px`,
            }}
          />

          {/* B. Playhead (Cursor) */}
          <div
            ref={playheadRef} // Add ref to playhead
            className="absolute top-0 bottom-0 z-50 transition-all duration-75 pointer-events-none" // Add cursor styles and make interactive
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
            
            title="Playhead cursor"
          >
            <div className="w-fit h-fit p-1 -ml-[50%] text-center bg-red-400 rounded-md transition-transform text-[0.5rem] text-white pointer-events-auto cursor-ew-resize hover:text-xs"
            onMouseDown={handlePlayheadMouseDown}
            >
              {formatTime(currentTime)}
              </div>
              <div className=" bg-red-400 w-0.5 h-full cursor-ew-resize pointer-events-auto"
              onMouseDown={handlePlayheadMouseDown} // Add mouse down handler for dragging
              ></div>
          </div>

          {/* C. Tracks / Clips Layer */}
          <div
          onWheel={trackAreaOnScrool}
          className="flex flex-col pb-4 h-fit">
            <div className=" h-8">

            </div>
          <div className=" h-16 flex relative border-y border-dashed">
            {videos.map((clip) => {
              const duration =
                clip.clipedVideoEndTime - clip.startTime;
              const width = duration * pixelsPerSecond;
              const left = (clip.startTime+clip.clipedVideoStartTime) * pixelsPerSecond;

              return (
                <div
                  key={clip.id}
                  draggable
                  className="absolute h-12 top-1.5 rounded-md border text-background overflow-hidden cursor-pointer opacity-90 hover:opacity-100"
                  style={{
                    left: `${left}px`,
                    width: `${width}px`,
                    backgroundColor: clip.timeLineColor || "#3b82f6",
                    clipPath: "inset(0 0 0 0)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVideoClipId(clip.id)
                  }}
                  title={clip.name}
                >
                  {/* Clip Content */}
                  <div className="p-2 text-xs left-34 fixed truncate font-medium drop-shadow-md bg-foreground/50 rounded-md w-fit">
                    {clip.name}
                  </div>

                  {/* Visual handles for trimming (cosmetic for now) */}
                  <div className="absolute top-0 bottom-0 left-0 w-2 bg-background/20 hover:bg-white/50 cursor-w-resize" />
                  <div className="absolute top-0 bottom-0 right-0 w-2 bg-background/20 hover:bg-white/50 cursor-e-resize" />
                </div>
              );
            })}
          </div>
            <div className=" h-16 flex relative border-y border-dashed">

            </div>
          </div>
        </div>
      </div>
      </div>
      
    </div>
  );
}
