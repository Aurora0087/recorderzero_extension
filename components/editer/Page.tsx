import { useState, useRef, useEffect } from 'react';
import { useVideoEditor } from '@/hooks/use-video-editor';
import { useFFmpegExport } from '@/hooks/use-ffmpeg-export';
import ExportDialog from './export-dialog';
import TopHeader from './top-header';
import LeftSidebar from './left-sidebar';
import MainPreview from './main-preview';
import BottomTimeline from './bottom-timeline';
import RightMediaPanel from './right-media-panel';

export default function EditerPage({ blob = null, videoId }: { blob?: Blob | null, videoId: string | null }) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const videoElementRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const {
    state,
    updateClip,
    updateBackground,
    updateGradient,
    updatePadding,
    updateBorderRadius,
    updateTransition,
    updateTransitionDuration,
    exportVideo,
    addVideo,
    updateVideos,
    isProcessing,
  } = useVideoEditor();

  const { initFFmpeg } = useFFmpegExport();

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

  const handleExportClick = () => setShowExportDialog(true);

  const handleExportConfirm = async () => {
    await exportVideo();
    setShowExportDialog(false);
  };

  // Initialize FFmpeg once
  useEffect(() => {
    initFFmpeg();
  }, [initFFmpeg]);

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Load blob if provided
  useEffect(() => {
    if (blob && videoId) {
      const file = new File([blob], "recording.mp4", {
        type: blob.type || "video/mp4",
      });

      const url = URL.createObjectURL(file);

      const video = document.createElement('video');
      let videoDuration = 0;
      video.src = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        videoDuration = video.duration;
        updateClip(0, videoDuration);
        URL.revokeObjectURL(video.src);
      };
      setVideoUrl(url);
      addVideo({ url, name: "recording.mp4", type: "video/mp4", minTime: 0, maxTime: videoDuration, id: videoId })


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
    <main className="h-screen flex flex-col select-none">
      {/* Top Header */}
      <TopHeader onExport={handleExportClick} isProcessing={isProcessing} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <LeftSidebar />

        {/* Center Preview */}
        <div className="flex-1">
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

          {/* Bottom Timeline */}
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

        {/* Right Media Panel */}
        <RightMediaPanel
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
    </main>
  );
}
