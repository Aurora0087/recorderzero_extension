import { useState, useRef, useEffect, Fragment } from "react";
import { useVideoEditor } from "@/hooks/use-video-editor";
import { useFFmpegExport } from "@/hooks/use-ffmpeg-export";
import ExportDialog from "./export-dialog";
import MainPreview from "./main-preview";
import BottomTimeline from "./bottom-timeline";
import RightMediaPanel from "./right-media-panel";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "../ui/progress";
import { Check, Download, TerminalSquare, X } from "lucide-react";
import { FcOpenedFolder, FcFolder } from "react-icons/fc";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { ImFilm } from "react-icons/im";
import { GiSoundWaves } from "react-icons/gi";
import { CgArrowTopRight } from "react-icons/cg";
import { IoImageOutline } from "react-icons/io5";

export default function EditerPage({
  blob = null,
  videoId,
}: {
  blob?: Blob | null;
  videoId: string | null;
}) {
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFileProgressDialog, setExportFileProgressDialog] =
    useState(false);
  const [selectedVideoClipId, setSelectedVideoClipId] = useState<null | string>(
    null
  );
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);

  const {
    state,
    updateClip,
    updateBackground,
    updateGradient,
    updatePadding,
    updateBorderRadius,
    updateTransition,
    updateTransitionDuration,
    addVideo,
    updateVideos,
    addimportedFiles,
    isProcessing,
  } = useVideoEditor();

  const {
    error,
    exportWithFFmpeg,
    initFFmpeg,
    progress,
    isReady,
    ffmpegMessage,
    exportFileUrl,
  } = useFFmpegExport();

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (videoElementRef.current) {
      setDuration(videoElementRef.current.duration);
    }
  };

  const handleTimeUpdate = () => {
    if (videoElementRef.current) {
      setCurrentTime(videoElementRef.current.currentTime);
    }
  };

  const handleExportClick = () => {
    setShowExportDialog(true);
  };

  const handleExportConfirm = async ({
    exportType,
  }: {
    exportType: "mp4" | "gif" | "webm";
  }) => {
    try {
      console.log("1. Starting Export Process...");

      // Ensure state is valid
      if (!state?.videos?.length) {
        alert("No video selected!");
        return;
      }

      console.log("2. Calling FFmpeg...");

      setShowExportDialog(false);
      setExportFileProgressDialog(true);
      // Trigger the export
      await exportWithFFmpeg({
        exportType,
        editerState: state,
      });

      console.log("3. Export Success");
    } catch (e) {
      console.error("4. Export Failed in UI:", e);
      alert(
        `Export failed: ${e instanceof Error ? e.message : "Unknown error"}`
      );
    }
  };

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Load blob if provided
  useEffect(() => {
    if (blob && videoId) {
      const file = new File([blob], "recording0.mp4", {
        type: blob.type || "video/mp4",
      });

      const url = URL.createObjectURL(file);

      const video = document.createElement("video");
      let videoDuration = 0;
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        videoDuration = video.duration;
        updateClip(0, videoDuration);
        addVideo({
          url,
          name: "recording0.mp4",
          type: "video/mp4",
          minTime: 0,
          maxTime: videoDuration,
          id: videoId + "_main",
          localyStoreVId: videoId,
        });
        addimportedFiles({
          id: videoId + "_main",
          name: "recording0.mp4",
          type: "video/mp4",
          url,
        });
        URL.revokeObjectURL(video.src);
      };
      setVideoUrl(url);
    }
  }, [blob]);

  // FIX: Instead of returning undefined, return a fallback
  if (!videoUrl) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading video...
      </main>
    );
  }

  return (
    <main className="h-screen flex flex-col select-none overflow-hidden bg-background text-foreground">
      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden w-full max-w-[100vw]">
        {/* Left Sidebar - Fixed Width (handled inside component or add w-16 here) <LeftSidebar />*/}
        {/* Center Column: [ files (left) + Preview (right)] (Top) + Timeline (Bottom) */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 relative p-1 h-svh">
          {/*1. files */}
          <div className="flex ">
            <div
              className={`${
                isFileExplorerOpen
                  ? "w-85 mr-1 opacity-100 border p-2"
                  : "w-0 mr-0 opacity-0 border-0 p-0"
              } bg-card rounded-md transition-all relative overflow-hidden flex flex-col gap-2`}
            >
              <div>Media Files</div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                {state.importedFiles.map((imf) => {
                  if (imf.type.includes("video/")) {
                    return (
                      <div
                        key={imf.id}
                        className=" bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-red-400"
                        title={imf.name}
                        draggable
                      >
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
                  }
                  else if (imf.type.includes("images/")) {
                    return (
                      <div
                        key={imf.id}
                        className=" bg-background overflow-hidden rounded-md aspect-video relative cursor-grab grid place-content-center border border-transparent hover:border-green-400"
                        title={imf.name}
                        draggable
                      >
                        <img src={imf.url} className=" w-full h-full object-contain"></img>
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
            <Button
              variant="secondary"
              onClick={() => setIsFileExplorerOpen((pre) => !pre)}
              size="icon-sm"
              className={`absolute ${
                isFileExplorerOpen ? "left-87" : "left-1"
              } z-50 border transition-all`}
            >
              {isFileExplorerOpen ? <FcFolder /> : <FcOpenedFolder />}
            </Button>
            <MainPreview
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              videos={state.videos}
              videoElementRef={videoElementRef}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onImportClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "video/*";
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoUpload(file);
                };
                input.click();
              }}
              currentTime={currentTime}
              clipStart={state.clipStart}
              clipEnd={state.clipEnd}
              backgroundColor={state.backgroundColor}
              backgroundGradient={state.backgroundGradient}
              padding={state.padding}
              borderRadius={state.borderRadius}
              transition={state.transition}
              transitionDuration={state.transitionDuration}
              onSeek={(time) => {
                if (videoElementRef.current) {
                  videoElementRef.current.currentTime = time;
                }
              }}
            />
          </div>
          {/* 2. Preview Area - Grows to fill space (flex-1) */}

          {/* 2. Timeline Area - Fixed Height & No Shrink */}
          <div className=" h-full z-10 relative">
            <BottomTimeline
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              videos={state.videos}
              videoElementRef={videoElementRef}
              currentTime={currentTime}
              clipStart={state.clipStart}
              clipEnd={state.clipEnd}
              onUpdateClip={updateClip}
              onSeek={(time) => {
                if (videoElementRef.current) {
                  videoElementRef.current.currentTime = time;
                }
              }}
            />
          </div>
        </div>

        {/* Right Media Panel - Fixed Width */}
        <RightMediaPanel
          selectedVideoId={selectedVideoClipId}
          clipUpdate={updateVideos}
          isProcessing={isProcessing}
          onExport={handleExportClick}
          mediaFiles={[]}
          onMediaSelect={(file) => handleVideoUpload(file)}
          onUpdateBackground={updateBackground}
          onUpdateGradient={updateGradient}
          onUpdatePadding={updatePadding}
          onUpdateBorderRadius={updateBorderRadius}
          onUpdateTransition={updateTransition}
          onUpdateTransitionDuration={updateTransitionDuration}
          state={state}
        />
      </div>

      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        isProcessing={isProcessing}
        onExport={handleExportConfirm}
        onClose={() => setShowExportDialog(false)}
        state={state}
        duration={duration}
      />

      {/* Export prosses dialog */}
      <Dialog
        open={exportFileProgressDialog}
        onOpenChange={setExportFileProgressDialog}
      >
        <DialogContent
          showCloseButton={false}
          className="overflow-hidden transition-transform"
        >
          <DialogHeader>
            <DialogTitle>Exporting File</DialogTitle>
            <DialogDescription className="text-xs">
              Readying the file for exporting. please do't reload page while
              exporting or all progrees will be losed.
            </DialogDescription>
            <div className=" my-4 space-y-2">
              {/*progress bar */}
              <div>
                <p>Progress</p>
                <div className="flex gap-2 items-center justify-between">
                  <Progress value={progress} className=" h-1" />
                  <span>{progress}%</span>
                </div>
              </div>
              {/* states in presses */}
              <div className=" flex gap-1 items-center flex-wrap my-4">
                <div
                  className=" bg-card rounded-md p-2 flex items-center justify-center gap-2 select-none"
                  title="Is FFmpeg loaded in browser"
                >
                  FFmpeg{" "}
                  <span>
                    {isReady ? (
                      <Check className=" w-4 h-4 text-green-400" />
                    ) : (
                      <X className=" w-4 h-4 text-red-400" />
                    )}
                  </span>
                </div>
              </div>
              {/* ffmpegMessages */}
              <ScrollArea className=" w-full h-full max-h-[30vh] border-b transition-transform">
                {ffmpegMessage.map((mes, i) => {
                  return (
                    <Fragment key={i}>
                      <p className=" text-xs p-1 text-primary">
                        <TerminalSquare className=" w-4 h-4 text-white" />
                        {mes}
                      </p>
                      <Separator />
                    </Fragment>
                  );
                })}
              </ScrollArea>

              {/**error message section */}
              {/* Download link */}
              {exportFileUrl && (
                <a
                  href={exportFileUrl}
                  className=" rounded-md bg-primary px-4 py-2 flex items-center justify-center gap-2 hover:bg-primary/50 text-primary-foreground"
                >
                  <Download className=" w-4 h-4" />
                  Download File
                </a>
              )}
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
