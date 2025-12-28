import { CgAddR, CgArrowTopRight } from "react-icons/cg";
import { GiSoundWaves } from "react-icons/gi";
import { ImFilm } from "react-icons/im";
import { IoImageOutline } from "react-icons/io5";
import { Separator } from "../ui/separator";
import {
  VideoAddProps,
  VideoEditorFileProps,
  VideoEditorState,
  VideoUpdateProps,
} from "@/hooks/use-video-editor";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { getVideoDuration, makeId } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface LeftsidefileExplorprops {
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
  addimportedFiles: ({ id, name, type, url }: VideoEditorFileProps) => void;
}

function LeftsidefileExplor({
  isFileExplorerOpen,
  state,
  addVideo,
  updateVideos,
  addimportedFiles,
}: LeftsidefileExplorprops) {


  const [draggingElementId, setDraggingElementId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const draggingElementDublicat = useRef<HTMLDivElement>(null);
  const prevHoveredClipRef = useRef<HTMLElement | null>(null);
  const [isDraggedOverTimeline, setIsDraggedOverTimeline] = useState(false);
  const [draggedFile, setDraggedFile] = useState<VideoEditorFileProps | null>(null);
  
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  // State to highlight drag area
  const [isDragOver, setIsDragOver] = useState(false);

  // --- File Import Logic ---

  const processFile = (file: File) => {
    // 1. Validate File Types
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Check allowed formats
    const isVideo = fileType.startsWith("video/");
    
    // Image: allow all except gif
    const isImage = fileType.startsWith("image/") && !fileName.endsWith(".gif");
    
    // Audio: only allow wav (per your request, usually people want mp3 too, but this follows instructions)
    const isWavAudio = fileType === "audio/wav" || fileName.endsWith(".wav");

    if (!isVideo && !isImage && !isWavAudio) {
      toast.error(`Format not supported: ${file.name}. (No GIFs or non-WAV audio)`);
      return;
    }

    // 2. Convert to Blob URL
    const objectUrl = URL.createObjectURL(file);
    const newId = makeId();

    // 3. Add to state
    addimportedFiles({
      id: newId,
      name: file.name,
      type: file.type || (isWavAudio ? "audio/wav" : "unknown"),
      url: objectUrl
    });

    toast.success(`Imported: ${file.name}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(processFile);
    }
    // Reset input so you can select the same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // --- Drag & Drop Import Logic ---

  const handleDragOverImport = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeaveImport = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDropImport = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(processFile);
    }
  };


  // --- Existing Logic (Drag to Timeline) ---

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    setIsDragging(true);
    setDraggingElementId(id);
    const file = state.importedFiles.find(f => f.id === id);
    setDraggedFile(file || null);
  };

  useEffect(() => {
    if (!isDragging) return;

    const wrapper = document.getElementById("clip-drag-drop-area");
    if (!wrapper) return;

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const ele = draggingElementDublicat.current;

      if (ele) {
        ele.style.opacity = "100%";
        ele.style.top = `${e.clientY}px`;
        ele.style.left = `${e.clientX}px`;
        ele.style.pointerEvents = "none";

        const elementsUnderCursor = document.elementsFromPoint(
          e.clientX,
          e.clientY
        );

        const timeLineTracker = elementsUnderCursor.find((element) => {
          return element.id && element.id === "time-line-tracks";
        }) as HTMLElement | undefined;

        if (timeLineTracker) {
          setIsDraggedOverTimeline(true);
        } else {
          setIsDraggedOverTimeline(false);
        }

        const trackElement = elementsUnderCursor.find((element) => {
          return element.id && element.id.includes("video-clip-");
        }) as HTMLElement | undefined;

        if (
          prevHoveredClipRef.current &&
          prevHoveredClipRef.current !== trackElement
        ) {
          prevHoveredClipRef.current.style.border = "";
          prevHoveredClipRef.current = null;
        }

        if (trackElement && timeLineTracker) {
          trackElement.style.border = "dashed red 0.25rem";
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
        ele.style.pointerEvents = "none";
      }
      setIsDragging(false);

      const importedFileDetails = state.importedFiles.find(
        (imf) => imf.id === draggingElementId
      );

      if (draggingElementId.length > 0 && isDraggedOverTimeline) {
        if (
          importedFileDetails &&
          importedFileDetails.type.includes("video/")
        ) {
          const newVideoDuration = await getVideoDuration(
            importedFileDetails.url
          );
          let slidingVideoClipId: string | null = null;

          if (prevHoveredClipRef.current) {
            slidingVideoClipId =
              prevHoveredClipRef.current.getAttribute("video-clip-id");
          }

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
              toast.success(`Video inserted before "${slidingVideoClip.name}".`);
            }
          } else {
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
            // If no clips exist, maxStartTime is -1, so reset to 0
            if (maxStartTime < 0) maxStartTime = 0;

            updateVideos({
              id: newVideoId,
              changeData: { startTime: maxStartTime },
            });
            toast.success(`Video added to end of timeline.`);
          }
        }
        if (prevHoveredClipRef.current) {
          prevHoveredClipRef.current.style.border = "";
          prevHoveredClipRef.current = null;
        }
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isDraggedOverTimeline, state.videos, state.importedFiles]); 

  return (
    <div
      className={`${
        isFileExplorerOpen
          ? "w-85 mr-1 opacity-100 border p-2"
          : "w-0 mr-0 opacity-0 border-0 p-0"
      } bg-card rounded-md transition-all relative overflow-hidden flex flex-col gap-2 ${isDragOver ? 'ring-2 ring-primary bg-primary/10' : ''}`}
      // Add Drop Handlers to the main container
      onDragOver={handleDragOverImport}
      onDragLeave={handleDragLeaveImport}
      onDrop={handleDropImport}
    >
      {/* Ghost Element */}
      <div
        ref={draggingElementDublicat}
        className="fixed z-9999 opacity-0 pointer-events-none -ml-4 -mt-4"
      >
        <div className="w-56 bg-card/90 backdrop-blur-md shadow-2xl rounded-lg overflow-hidden border border-white/10 ring-1 ring-black/20 transform rotate-4">
          
          {/* Preview Area */}
          <div className="aspect-video w-full bg-black/10 relative flex items-center justify-center overflow-hidden">
            {draggedFile?.type.includes("image") && (
              <img
                src={draggedFile.url}
                alt="ghost"
                className="w-full h-full object-cover opacity-90"
              />
            )}
            
            {draggedFile?.type.includes("video") && (
              <div className="w-full h-full relative">
                <video
                  src={draggedFile.url}
                  className="w-full h-full object-cover opacity-90"
                  muted
                />
                {/* Film strip overlay effect */}
                <div className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent flex items-end p-2">
                  <ImFilm className="text-white/80 w-5 h-5" />
                </div>
              </div>
            )}

            {draggedFile?.type.includes("audio") && (
               <div className="w-full h-full bg-linear-to-br from-green-500/20 to-emerald-900/40 flex items-center justify-center">
                  <GiSoundWaves className="w-12 h-12 text-green-500 drop-shadow-md animate-pulse" />
               </div>
            )}
          </div>

          {/* Label Area */}
          <div className="p-2 bg-card border-t border-white/5 flex items-center gap-2">
             <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {draggedFile?.type.includes("video") && <ImFilm size={12}/>}
                {draggedFile?.type.includes("image") && <IoImageOutline size={12}/>}
                {draggedFile?.type.includes("audio") && <GiSoundWaves size={12}/>}
             </div>
             <div className="flex flex-col overflow-hidden">
               <span className="text-[10px] font-semibold truncate w-full text-foreground/90">
                 {draggedFile?.name || "Unknown File"}
               </span>
               <span className="text-[9px] text-muted-foreground uppercase tracking-wider">
                 {draggedFile?.type.split("/")[1] || "File"}
               </span>
             </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="font-semibold">Media Files</span>
        
        {/* Hidden Input */}
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            multiple 
            accept="video/*,image/*,audio/wav" 
        />
        
        <Button size="sm" onClick={handleImportClick}>
          <CgAddR className="mr-2" />
          <span>Import File</span>
        </Button>
      </div>
      
      <Separator />

      {/* Empty State / Drop Instructions */}
      {state.importedFiles.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-md m-2">
            <p className="text-sm">Drag & Drop files here</p>
            <p className="text-xs mt-1">Video, Images, WAV</p>
          </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        {state.importedFiles.map((imf) => {
          if (imf.type.includes("video/")) {
            return (
              <div
                key={imf.id}
                title={imf.name}
                onMouseDown={(e) => handleMouseDown(e, imf.id)}
              >
                <div className="bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-red-400 group">
                  <video src={imf.url} className="w-full h-full object-cover pointer-events-none"></video>
                  <a
                    href={imf.url}
                    target="_blank"
                    className="hover:text-primary absolute right-1 top-1 bg-background/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open File in New tab"
                    onClick={(e) => e.stopPropagation()} // Prevent drag start when clicking link
                  >
                    <CgArrowTopRight className="w-3 h-3" />
                  </a>
                  <ImFilm className="absolute bottom-1 left-1 w-4 h-4 text-red-400 drop-shadow-md" />
                </div>
                <p className="text-xs mt-1 truncate px-1">{imf.name}</p>
              </div>
            );
          } else if (imf.type.includes("audio/")) {
            return (
              <div
                key={imf.id}
                title={imf.name}
                // Allow dragging audio files too if needed later, logic same as video
                className="group"
              >
                 <div className="bg-secondary/30 overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-green-400">
                    <GiSoundWaves className="w-8 h-8 text-green-400" />
                    <a
                    href={imf.url}
                    target="_blank"
                    className="hover:text-primary absolute right-1 top-1 bg-background/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open File in New tab"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <CgArrowTopRight className="w-3 h-3" />
                    </a>
                </div>
                <p className="text-xs mt-1 truncate px-1">{imf.name}</p>
              </div>
            );
          } else if (imf.type.includes("image/")) {
            return (
              <div
                key={imf.id}
                title={imf.name}
                className="group"
                onMouseDown={(e) => handleMouseDown(e, imf.id)}
              >
                <div className="bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-blue-400">
                    <img
                    src={imf.url}
                    className="w-full h-full object-cover pointer-events-none"
                    alt={imf.name}
                    />
                    <a
                    href={imf.url}
                    target="_blank"
                    className="hover:text-primary absolute right-1 top-1 bg-background/80 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open File in New tab"
                    onClick={(e) => e.stopPropagation()}
                    >
                    <CgArrowTopRight className="w-3 h-3" />
                    </a>
                    <IoImageOutline className="absolute bottom-1 left-1 w-4 h-4 text-blue-400 drop-shadow-md" />
                </div>
                <p className="text-xs mt-1 truncate px-1">{imf.name}</p>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

export default LeftsidefileExplor;