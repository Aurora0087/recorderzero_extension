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
} from "@/components/ui/dialog";
import { Progress } from "../ui/progress";
import { Check, Download, TerminalSquare, X } from "lucide-react";
import { FcFolder } from "react-icons/fc";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { Button } from "../ui/button";
import { FaAnglesLeft, FaAnglesRight } from "react-icons/fa6";
import LeftsidefileExplor from "./Left-side-file-Explor";

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
  const [currentPlayingVideoId, setCurrentPlayingVideoId] =
    useState<string>("");
  const [isFileExplorerOpen, setIsFileExplorerOpen] = useState(true);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

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
    deleteVideo,
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

  function pushSingleVideoClip(vid: string) {
    const video = videoRefs.current.get(vid);
    if (!video) {
      return;
    }
    video.pause();
  }

  const noVideoArea = ({ nextTime }: { nextTime: number }) => {
    console.log(nextTime);

    const nextVideoDetails = state.videos.find(
      (v) =>
        v.startTime + v.clipedVideoStartTime <= nextTime &&
        v.startTime + v.clipedVideoEndTime >= nextTime
    );
    if (nextVideoDetails) {
      onSeek({ time: nextVideoDetails.startTime });
    } else {
      setCurrentPlayingVideoId("");
      setCurrentTime(nextTime + 0.1);
      setTimeout(() => {
        noVideoArea({ nextTime: nextTime + 0.1 });
      }, 100);
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      videoRefs.current.get(currentPlayingVideoId)?.pause();
    } else {
      videoRefs.current.get(currentPlayingVideoId)?.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (videoElementRef.current) {
      setDuration(videoElementRef.current.duration);
    }
  };

  function handleTimeUpdate({ vid }: { vid: string }) {
    // 1. Safety Checks
    if (vid !== currentPlayingVideoId) return;

    const videoEle = videoRefs.current.get(currentPlayingVideoId);
    const videoDetails = state.videos.find(
      (a) => a.id === currentPlayingVideoId
    );

    if (!videoEle || !videoDetails) return;

    const videosCurrentTime = videoEle.currentTime;

    // 2. Check if the video clip has reached its trim point
    // We use a small buffer (0.05) to ensure we don't overshoot frames visually
    if (videosCurrentTime >= videoDetails.clipedVideoEndTime - 0.05) {
      // -- STOP CURRENT VIDEO --
      videoEle.pause();
      videoEle.style.opacity = "0"; // Hide it immediately

      // Calculate where exactly this clip ends on the timeline
      const clipDuration =
        videoDetails.clipedVideoEndTime - videoDetails.clipedVideoStartTime;
      const currentClipEndTimeOnTimeline =
        videoDetails.startTime + clipDuration;

      // -- CHECK 1: Is this the end of the entire project? --
      // Check against state.clipEnd (Total Duration)
      if (currentClipEndTimeOnTimeline >= state.clipEnd - 0.1) {
        setIsPlaying(false);
        setCurrentPlayingVideoId("");
        setCurrentTime(currentClipEndTimeOnTimeline);
        return;
      }

      // -- CHECK 2: Is there another video immediately after? --
      const nextVideoDetails = state.videos.find(
        (v) => Math.abs(v.startTime - currentClipEndTimeOnTimeline) < 0.1
      );

      if (nextVideoDetails) {
        // -> SWITCH TO NEXT VIDEO
        setCurrentPlayingVideoId(nextVideoDetails.id);

        // Pre-setup the next video element
        const nextVideoEle = videoRefs.current.get(nextVideoDetails.id);
        if (nextVideoEle) {
          nextVideoEle.style.opacity = "100%";
          nextVideoEle.currentTime = nextVideoDetails.clipedVideoStartTime;

          if (isPlaying) {
            // Using a promise to prevent "play() request was interrupted" errors
            const playPromise = nextVideoEle.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) =>
                console.error("Auto-play blocked:", error)
              );
            }
          }
        }
      } else {
        // -> GAP DETECTED
        setCurrentPlayingVideoId("");
        setCurrentTime(currentClipEndTimeOnTimeline);
      }
    } else {
      // -- NORMAL PLAYBACK --
      // Map Video Time -> Timeline Time
      // Formula: ClipStartOnTimeline + (CurrentVideoTime - TrimStartOffset)
      const correctTimelineTime =
        videoDetails.startTime +
        (videosCurrentTime - videoDetails.clipedVideoStartTime);
      setCurrentTime(correctTimelineTime);
    }
  }
  function onSeek({ time }: { time: number }) {
    // 1. FIX: Correctly calculate if 'time' falls within a clip's timeline range
    const seekingVideoClip = state.videos.find((v) => {
      const clipDuration = v.clipedVideoEndTime - v.clipedVideoStartTime;
      const clipEndOnTimeline = v.startTime + clipDuration;

      return time >= v.startTime && time <= clipEndOnTimeline;
    });

    if (seekingVideoClip) {
      setCurrentPlayingVideoId(seekingVideoClip.id);

      // Hide/Pause all other videos to prevent "ghost" frames
      videoRefs.current.forEach((ele, key) => {
        if (key !== seekingVideoClip.id) {
          ele.style.opacity = "0";
          ele.pause();
        }
      });

      const seekingVideoClipEle = videoRefs.current.get(seekingVideoClip.id);
      if (seekingVideoClipEle) {
        seekingVideoClipEle.style.opacity = "100%";

        // 2. Math: Internal Time = TrimStart + (TimelineTime - TimelineStart)
        seekingVideoClipEle.currentTime =
          seekingVideoClip.clipedVideoStartTime +
          (time - seekingVideoClip.startTime);

        if (isPlaying) {
          seekingVideoClipEle
            .play()
            .catch((e) => console.error("Seek play interrupted", e));
        } else {
          seekingVideoClipEle.pause();
        }
      }
    } else {
      // We are in a gap (No video)
      setCurrentPlayingVideoId("");

      videoRefs.current.forEach((v) => {
        v.style.opacity = "0%";
        v.pause();
      });

      // 3. FIX: If playing, trigger the gap loop so the playhead keeps moving
      if (isPlaying) {
        // Clear previous timeouts if you have a ref for it
        // clearTimeout(noVideoTimeoutRef.current);
        noVideoArea({ nextTime: time + 0.1 });
      }
    }

    // Always update the global time state
    setCurrentTime(time);
  }

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
      setCurrentPlayingVideoId(videoId + "_main");
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
            <LeftsidefileExplor
            addimportedFiles={addimportedFiles}
             isFileExplorerOpen={isFileExplorerOpen}
             updateVideos={updateVideos}
             addVideo={addVideo}
              state={state}  
              />
            <Button
              variant="secondary"
              title="Toggle file explorer view"
              onClick={() => setIsFileExplorerOpen((pre) => !pre)}
              size="icon-sm"
              className={`absolute ${
                isFileExplorerOpen ? "left-89 rotate-0" : "left-3 rotate-180"
              } z-50 top-3 border transition-all`}
            >
             <FaAnglesLeft />
            </Button>
            <MainPreview
              togglePlay={togglePlay}
              videoRefs={videoRefs}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              videos={state.videos}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdateHandel={handleTimeUpdate}
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
              addVideo={addVideo}
              setSelectedVideoClipId={setSelectedVideoClipId}
              isPlaying={isPlaying}
              clipUpdate={updateVideos}
              togglePlay={togglePlay}
              videos={state.videos}
              videoElementRef={videoElementRef}
              currentTime={currentTime}
              clipStart={state.clipStart}
              clipEnd={state.clipEnd}
              onUpdateClip={updateClip}
              onSeek={onSeek}
              deleteVideo={deleteVideo}
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
