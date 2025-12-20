import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "../ui/button";
import {
  RiDeleteBinLine,
  RiScissorsCutLine,
} from "react-icons/ri";
import { makeId } from "@/lib/utils";
import { toast } from "sonner";

function VideoClipBox({
  clip,
  pixelsPerSecond,
  setSelectedVideoClipId,
  clipUpdate,
  onSeek,
  addVideo,
  currentTime,
  deleteClipAction
}: {
  clip: VideoTimeLineClip;
  pixelsPerSecond: number;
  setSelectedVideoClipId: (videoId: string | null) => void;
  clipUpdate: ({ id, changeData }: VideoUpdateProps) => void;
  onSeek: ({ time }: { time: number }) => void;
  addVideo: ({
    url,
    id,
    maxTime,
    minTime,
    name,
    type,
    localyStoreVId,
  }: VideoAddProps) => void;
  currentTime: number;
  deleteClipAction: (clipId: string) => void
}) {
  const clipBox = useRef(null);
  const duration = clip.clipedVideoEndTime - clip.clipedVideoStartTime;
  const width = duration * pixelsPerSecond;

  // Calculate initial left based on props
  // Note: Usually startTime is the timeline position.
  // If clipedVideoStartTime is an internal offset, make sure this math matches your logic.
  const initialLeft = clip.startTime * pixelsPerSecond;

  const [isDragging, setIsDragging] = useState(false);
  const [leftPosition, setLeftPosition] = useState(initialLeft);

  // Keep local state in sync if props change (e.g. zooming / pixelsPerSecond changes)
  useEffect(() => {
    if (!isDragging) {
      setLeftPosition(clip.startTime * pixelsPerSecond);
    }
  }, [clip.startTime, clip.clipedVideoStartTime, pixelsPerSecond, isDragging]);

  // --- 1. Start Dragging ---
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent playhead seeking
    e.preventDefault(); // Prevent text selection
    setIsDragging(true);
    setSelectedVideoClipId(clip.id);
  };

  // --- 2. Handle Move & Drop ---
  useEffect(() => {
    if (!isDragging) return;

    const wrapper = document.getElementById("clip-drag-drop-area");
    if (!wrapper) return;

    // Get limits
    const wrapperRect = wrapper.getBoundingClientRect();

    // We need to calculate the cursor offset relative to the clip's current left
    // But a simpler approach for timelines is measuring delta movement
    let startX = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // 1. Calculate Position (Your existing logic)
      const relativeX = e.clientX - wrapperRect.left + wrapper.scrollLeft;
      let newLeft = relativeX;
      if (newLeft < 0) newLeft = 0;
      //setLeftPosition(newLeft);

      // 2. Find elements underneath
      // elementsFromPoint returns an array: [DraggedClip, TextInsideClip, TrackContainer, AppBackground...]
      const elementsUnderCursor = document.elementsFromPoint(
        e.clientX,
        e.clientY
      );

      // 3. Find the specific "Track" element
      // Assuming your track divs have a class or ID to identify them (e.g., className="video-track")
      const trackElement = elementsUnderCursor.find((element) => {
        // Check if this is a valid drop zone
        return element.id.includes("time-line-ruler");
      });

      if (trackElement) {
        // You can visually highlight the track here if you want
        const timeValue = Number(trackElement.getAttribute("time-value"));

        if (!isNaN(timeValue)) {
          setLeftPosition(timeValue * pixelsPerSecond);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation(); // Prevent playhead seeking
      e.preventDefault();
      setIsDragging(false);
      const newStartTime = leftPosition / pixelsPerSecond;
      clipUpdate({
        id: clip.id,
        changeData: { startTime: newStartTime },
      });
      onSeek({ time: newStartTime });
    };

    // Attach listeners to DOCUMENT to handle fast movements outside the div
    //document.addEventListener("mousemove", handleMouseMove);
    //document.addEventListener("mouseup", handleMouseUp);

    return () => {
      //document.removeEventListener("mousemove", handleMouseMove);
      //document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, pixelsPerSecond, leftPosition]);

  function cutClipInto2() {
    // 1. Calculate the actual duration and where the clip ends on the timeline
    const clipDuration = clip.clipedVideoEndTime - clip.clipedVideoStartTime;
    const clipEndTimeOnTimeline = clip.startTime + clipDuration;

    // 2. Boundary Check
    if (
      currentTime <= clip.startTime + 0.1 ||
      currentTime >= clipEndTimeOnTimeline - 0.1
    ) {
      toast.warning("Cut position is outside the clip or too close to the edge");
      return;
    }

    // 3. Calculate the split point in "Source Video Time"
    // This converts the Timeline Position -> The actual second in the video file
    const timePassedSinceClipStart = currentTime - clip.startTime;
    const splitPointInSourceVideo =
      clip.clipedVideoStartTime + timePassedSinceClipStart;

    // --- Clip 1 (Left Side) ---
    // The start remains the same.
    // The end becomes the split point.
    clipUpdate({
      id: clip.id,
      changeData: {
        clipedVideoEndTime: splitPointInSourceVideo,
      },
    });

    // --- Clip 2 (Right Side) ---
    const randomId = makeId();

    // Create the new video first
    addVideo({
      url: clip.url,
      id: randomId,
      name: clip.name,
      localyStoreVId: clip.localyStoreVId,
      type: clip.type,
      maxTime: clip.maxTime,
      minTime: clip.minTime,
    });

    // Update its timing
    clipUpdate({
      id: randomId,
      changeData: {
        // It starts playing from the split point
        clipedVideoStartTime: splitPointInSourceVideo,
        // It maintains the original end point of the file
        clipedVideoEndTime: clip.clipedVideoEndTime,
        // It is placed on the timeline exactly where the cut happened
        startTime: currentTime,
      },
    });
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          id={"video-clip-" + clip.id}
          video-clip="true"
          video-clip-id={clip.id}
          ref={clipBox}
          //onMouseDown={handleMouseDown}
          className={`absolute h-16 rounded-md border text-background overflow-hidden cursor-pointer transition-opacity ${
            isDragging
              ? "opacity-80 z-50 shadow-lg cursor-grabbing"
              : "opacity-90 hover:opacity-100 cursor-grab"
          }`}
          onClick={(e) => {
            setSelectedVideoClipId(clip.id);
          }}
          style={{
            left: `${leftPosition}px`,
            width: `${width}px`,
            backgroundColor: clip.timeLineColor || "#3b82f6",
            clipPath: "inset(0 0 0 0)",
          }}
          title={clip.name}
        >
          {/* Clip Content */}
          <div className="p-2 text-xs fixed truncate font-medium drop-shadow-md bg-foreground/50 rounded-md w-fit">
            {clip.name}
          </div>

          {/* Visual handles */}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="video-clip-contextMenu">
        <ContextMenuItem asChild>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={cutClipInto2}
          >
            <RiScissorsCutLine className="w-4 h-4 mr-2" />
            Cut Clip from current time
          </Button>
        </ContextMenuItem>
        <ContextMenuItem asChild variant="destructive">
          <Button variant="ghost" className="w-full justify-start" onClick={()=>deleteClipAction(clip.id)}>
            <RiDeleteBinLine className="w-4 h-4 mr-2" />
            Remove clip from time line
          </Button>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default VideoClipBox;
