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
        // subtract half width/height if you want it centered on cursor
        ele.style.top = `${e.clientY}px`;
        ele.style.left = `${e.clientX}px`;

        // 2. CRITICAL: Ensure the ghost element ignores mouse events
        // Otherwise elementsFromPoint will return the ghost element, not the clip below it
        ele.style.pointerEvents = "none";

        // Find elements underneath
        const elementsUnderCursor = document.elementsFromPoint(
          e.clientX,
          e.clientY
        );

        // Find the specific drop zone
        const trackElement = elementsUnderCursor.find((element) => {
          return element.id && element.id.includes("video-clip-");
        }) as HTMLElement | undefined;

        // 3. Logic: Cleanup Previous -> Highlight New

        // Step A: If we have a stored previous element, and it's NOT the current one, clean it up
        if (
          prevHoveredClipRef.current &&
          prevHoveredClipRef.current !== trackElement
        ) {
          prevHoveredClipRef.current.style.border = "";
          prevHoveredClipRef.current = null;
        }

        // Step B: If we found a valid new track element
        if (trackElement) {
          // Apply Outline (Fix: Must include style 'solid' and color)
          trackElement.style.border = "dashed red 0.25rem";

          // Update Ref
          prevHoveredClipRef.current = trackElement;
        }
      }
    };

    const handleMouseUp = async (e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const ele = draggingElementDublicat.current;
      if (ele) {
        ele.style.opacity = "0%";
        ele.style.top = `${e.clientY}px`;
        ele.style.left = `${e.clientX}px`;
      }
      setIsDragging(false);
      if (prevHoveredClipRef.current && draggingElementId.length > 0) {
        const importedFileDetails = state.importedFiles.find(
          (imf) => imf.id === draggingElementId
        );

        if (
          importedFileDetails &&
          importedFileDetails.type.includes("video/")
        ) {
          const newVideoDuration = await getVideoDuration(
            importedFileDetails.url
          );
          const slidingVideoClipId =
            prevHoveredClipRef.current.getAttribute("video-clip-id");

          const newVideoId = makeId();

          addVideo({
            url: importedFileDetails.url,
            name: importedFileDetails.name,
            type: importedFileDetails.type,
            minTime: 0,
            maxTime: newVideoDuration,
            id: newVideoId,
            localyStoreVId: importedFileDetails.id,
          });

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
            }
          }
        }
        prevHoveredClipRef.current.style.border = "";
        prevHoveredClipRef.current = null;
        toast.success("File added n timeline.");
      }
    };

    // Attach listeners to DOCUMENT to handle fast movements outside the div
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

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
