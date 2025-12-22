import { CgAddR, CgArrowTopRight } from "react-icons/cg";
import { GiSoundWaves } from "react-icons/gi";
import { ImFilm } from "react-icons/im";
import { IoImageOutline } from "react-icons/io5";
import { CiFileOn } from "react-icons/ci";
import { Separator } from "../ui/separator";
import {
  VideoAddProps,
  VideoEditorState,
  VideoUpdateProps,
} from "@/hooks/use-video-editor";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getVideoDuration, makeId } from "@/lib/utils";

function LeftsidefileExplor({
  isFileExplorerOpen,
  state,
  addVideo,
  updateVideos,
}: {
  state: VideoEditorState;
  isFileExplorerOpen: boolean;
  addVideo: ({
    url,
    id,
    maxTime,
    minTime,
    name,
    type,
    localyStoreVId,
  }: VideoAddProps) => void;
  updateVideos: ({ id, changeData }: VideoUpdateProps) => void;
}) {
  const [draggingElementId, setDraggingElementId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const draggingElementDublicat = useRef<HTMLDivElement>(null);
  const prevHoveredClipRef = useRef<HTMLElement | null>(null);
  const [isDraggedOverTimeline, setIsDraggedOverTimeline] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    setIsDragging(true);
    setDraggingElementId(id);
  };

  useEffect(() => {
    if (!isDragging) return;

    const wrapper = document.getElementById("clip-drag-drop-area");
    if (!wrapper) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const ele = draggingElementDublicat.current;

      if (ele) {
        // Move the ghost element
        ele.style.opacity = "100%";
        ele.style.top = `${e.clientY}px`;
        ele.style.left = `${e.clientX}px`;

        // host element ignores mouse events
        // Otherwise elementsFromPoint will return the ghost element, not the clip below it
        ele.style.pointerEvents = "none";

        // Find elements underneath
        const elementsUnderCursor = document.elementsFromPoint(
          e.clientX,
          e.clientY
        );

        // Find the specific drop zone
        //*********************************************/
        // view is it over time line
        const timeLineTracker = elementsUnderCursor.find((element) => {
          return element.id && element.id === "time-line-tracks";
        }) as HTMLElement | undefined;

        if (timeLineTracker) {
          setIsDraggedOverTimeline(true);
        } else {
          setIsDraggedOverTimeline(false);
        }
        console.log("Is on time line:", timeLineTracker);

        // view is it draged over any clips
        const trackElement = elementsUnderCursor.find((element) => {
          return element.id && element.id.includes("video-clip-");
        }) as HTMLElement | undefined;

        //*********************************************/

        // Cleanup Previous -> Highlight New
        //*********************************************/
        // If we have a stored previous element, and it's NOT the current one, clean it up
        if (
          prevHoveredClipRef.current &&
          prevHoveredClipRef.current !== trackElement
        ) {
          prevHoveredClipRef.current.style.border = "";
          prevHoveredClipRef.current = null;
        }

        // If we found a valid new track element and mouse over time line
        if (trackElement && timeLineTracker) {
          // Apply Outline (Fix: Must include style 'solid' and color)
          trackElement.style.border = "dashed red 0.25rem";

          // Update Ref
          prevHoveredClipRef.current = trackElement;
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      // prevent defaultes
      e.stopPropagation();
      e.preventDefault();

      // hidde gost element for user
      const ele = draggingElementDublicat.current;
      if (ele) {
        ele.style.opacity = "0%";
        ele.style.top = `${e.clientY}px`;
        ele.style.left = `${e.clientX}px`;
        ele.style.pointerEvents = "none";
      }
      setIsDragging(false);

      // get dragging imported file details
      const importedFileDetails = state.importedFiles.find(
        (imf) => imf.id === draggingElementId
      );

      // is hover ended over a clip on time line and dragging file has a id
      if (draggingElementId.length > 0 && isDraggedOverTimeline) {
        // is dragging file is a video
        if (
          importedFileDetails &&
          importedFileDetails.type.includes("video/")
        ) {
          // get video duration
          const newVideoDuration = await getVideoDuration(
            importedFileDetails.url
          );
          let slidingVideoClipId: string | null = null;

          if (prevHoveredClipRef.current) {
            // the clip where dragging stoped
            slidingVideoClipId =
              prevHoveredClipRef.current.getAttribute("video-clip-id");
          }

          const newVideoId = makeId();

          // add clip in time line
          addVideo({
            url: importedFileDetails.url,
            name: importedFileDetails.name,
            type: importedFileDetails.type,
            minTime: 0,
            maxTime: newVideoDuration,
            id: newVideoId,
            localyStoreVId: importedFileDetails.id,
          });

          // if dragging endes over a clip push all clips to right side and update new clip's start point where slidingVideoClip startpoint was
          if (slidingVideoClipId) {
            const slidingVideoClip = state.videos.find(
              (v) => v.id === slidingVideoClipId
            );
            if (slidingVideoClip) {
              const newVideoStartingPoint = slidingVideoClip.startTime;

              state.videos.map((v) => {
                if (v.startTime >= newVideoStartingPoint) {
                  console.log("updateing : ", v.name, v.id);

                  updateVideos({
                    id: v.id,
                    changeData: { startTime: v.startTime + newVideoDuration },
                  });
                }
              });

              updateVideos({
                id: newVideoId,
                changeData: { startTime: newVideoStartingPoint },
              });
              toast.success(`Video added before ""${slidingVideoClip.name}"". `);
            }
          } 
          // place end of the all clips
          else {
            let maxStartTime = -1;
            let lastClip = state.videos[0] || null;

            state.videos.forEach((v) => {
              if (v.startTime > maxStartTime) {
                lastClip = v;
                maxStartTime = v.startTime;
              }
            });
            if (lastClip) {
              maxStartTime =
                lastClip.startTime +
                (lastClip.clipedVideoEndTime - lastClip.clipedVideoStartTime);
            }
            updateVideos({
              id: newVideoId,
              changeData: { startTime: maxStartTime },
            });
            toast.success(`Video added in last of the timeline.`);
          }
        }
        if (prevHoveredClipRef.current) {
          // remove added css
          prevHoveredClipRef.current.style.border = "";
          prevHoveredClipRef.current = null;
        }
      }
    };

    // Attach listeners to DOCUMENT to handle fast movements outside the div
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isDraggedOverTimeline]);

  return (
    <div
      className={`${
        isFileExplorerOpen
          ? "w-85 mr-1 opacity-100 border p-2"
          : "w-0 mr-0 opacity-0 border-0 p-0"
      } bg-card rounded-md transition-all relative overflow-hidden flex flex-col gap-2`}
    >
      <div
        ref={draggingElementDublicat}
        className=" fixed p-2 px-1 bg-primary border z-9999 opacity-0"
      >
        <CiFileOn className=" w-8 h-8 text-primary-foreground" />
      </div>
      <div className="flex justify-between items-center">
        <span>Media Files</span>
        <Button size="sm">
          <CgAddR />
          <span>Import File</span>
        </Button>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-2">
        {state.importedFiles.map((imf) => {
          if (imf.type.includes("video/")) {
            return (
              <div
                key={imf.id}
                title={imf.name}
                onMouseDown={(e) => {
                  handleMouseDown(e, imf.id);
                }}
              >
                <div className="bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-red-400">
                  <video src={imf.url} controls={false}></video>
                  <a
                    href={imf.url}
                    target="_blank"
                    className="hover:text-primary absolute right-0 top-0 bg-background rounded"
                    title="Open File in New tab"
                  >
                    <CgArrowTopRight className=" w-4 h-4" />
                  </a>
                  <ImFilm className=" absolute bottom-1 left-1 w-4 h-4 text-red-400" />
                </div>
                <p className=" line-clamp-1">{imf.name}</p>
              </div>
            );
          } else if (imf.type.includes("audio/")) {
            return (
              <div
                key={imf.id}
                className=" bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-green-400"
                title={imf.name}
                draggable
              >
                <a
                  href={imf.url}
                  target="_blank"
                  className="hover:text-primary absolute right-0 top-0 bg-background rounded"
                  title="Open File in New tab"
                >
                  <CgArrowTopRight className=" w-4 h-4" />
                </a>
                <GiSoundWaves className=" w-8 h-8 text-green-400" />
              </div>
            );
          } else if (imf.type.includes("images/")) {
            return (
              <div
                key={imf.id}
                className=" bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-green-400"
                title={imf.name}
                draggable
              >
                <img
                  src={imf.url}
                  className=" w-full h-full object-contain"
                ></img>
                <a
                  href={imf.url}
                  target="_blank"
                  className="hover:text-primary absolute right-0 top-0 bg-background rounded"
                  title="Open File in New tab"
                >
                  <CgArrowTopRight className=" w-4 h-4" />
                </a>
                <IoImageOutline className=" absolute bottom-1 left-1 w-4 h-4 text-green-400" />
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}

export default LeftsidefileExplor;
