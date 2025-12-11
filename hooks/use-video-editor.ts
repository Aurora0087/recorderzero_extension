import { getRandomColor, makeId } from "@/lib/utils";
import { useState, useCallback } from "react";

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export interface VideoTimeLineClip {
  id: string;
  localyStoreVId: string;
  channel: string;
  name: string;
  timeLineColor: string;
  url: string;
  type: string;
  startTime: number; // strting position in time line
  clipedVideoStartTime: number; // after cut/croping orginalvideo.mintime+leftcropValue
  clipedVideoEndTime: number; // after cut/croping orginalvideo.maxtime+leftcropValue
  minTime: number; //0
  maxTime: number; //orginal video duration
}

export interface VideoEditorFileProps{
  id: string;
  name: string;
  url: string;
  type: string;
}

export interface VideoEditorState {
  clipStart: number;
  clipEnd: number;
  backgroundColor: string;
  backgroundGradient: {
    enabled: boolean;
    stops: { color: string; position: number }[];
    angle: number;
  };
  videos: VideoTimeLineClip[];
  importedFiles:VideoEditorFileProps[];
  zoompans: {
    time: number;
    level: number;
    xCoordinate: number;
    yCoordinate: number;
    duration: number;
  }[];
  padding: number;
  borderRadius: number;
  transition: string;
  transitionDuration: number;
}

export interface VideoAddProps {
  url: string;
  type: string;
  minTime: number;
  maxTime: number;
  name: string;
  id: string;
  localyStoreVId: string;
}

export interface  VideoUpdateProps {
  id: string;
  changeData: Partial<VideoTimeLineClip>;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

export function useVideoEditor() {
  const [state, setState] = useState<VideoEditorState>({
    clipStart: 0,
    clipEnd: 0,
    backgroundColor: "#1a1a1a",
    backgroundGradient: {
      enabled: false,
      stops: [
        { color: "#000000", position: 0 },
        { color: "#1a1a1a", position: 100 },
      ],
      angle: 45,
    },
    zoompans: [],
    videos: [],
    importedFiles:[],
    padding: 0,
    borderRadius: 0,
    transition: "none",
    transitionDuration: 0.5,
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const updateClip = useCallback((start: number, end: number) => {
    setState((prev) => ({
      ...prev,
      clipStart: Math.max(0, start),
      clipEnd: Math.max(start, end),
    }));
  }, []);

  const updateBackground = useCallback((color: string) => {
    setState((prev) => ({ ...prev, backgroundColor: color }));
  }, []);

  const updateGradient = useCallback(
    (gradient: Partial<VideoEditorState["backgroundGradient"]>) => {
      setState((prev) => ({
        ...prev,
        backgroundGradient: { ...prev.backgroundGradient, ...gradient },
      }));
    },
    []
  );

  const updatePadding = useCallback((padding: number) => {
    setState((prev) => ({
      ...prev,
      padding: Math.max(0, Math.min(500, padding)),
    }));
  }, []);

  const updateBorderRadius = useCallback((radius: number) => {
    setState((prev) => ({
      ...prev,
      borderRadius: Math.max(0, Math.min(100, radius)),
    }));
  }, []);

  const updateTransition = useCallback((transition: string) => {
    setState((prev) => ({ ...prev, transition }));
  }, []);

  const updateTransitionDuration = useCallback((duration: number) => {
    setState((prev) => ({
      ...prev,
      transitionDuration: Math.max(0.1, Math.min(5, duration)),
    }));
  }, []);

  const addVideo = useCallback(
    ({ url, id, maxTime, minTime, name, type,localyStoreVId }: VideoAddProps) => {
      setState((prev) => {
        if (prev.videos.some((video) => video.id === id)) {
          // Video with this ID already exists, do nothing
          return prev;
        }
        let startTime = 0;

        //calculate max clipedVideoEndTime
        state.videos.map((vd) => {
          startTime = +vd.clipedVideoEndTime;
        });

        const newVideo: VideoTimeLineClip = {
          id,
          localyStoreVId: localyStoreVId,
          url,
          type,
          clipedVideoEndTime: maxTime,
          clipedVideoStartTime: minTime,
          maxTime: maxTime,
          minTime: minTime,
          name,
          channel: "videos-0",
          startTime,
          timeLineColor: getRandomColor(),
        };
        return { ...prev, videos: [...prev.videos, newVideo] };
      });
    },
    []
  );

  const updateVideos = useCallback(({ id, changeData }: VideoUpdateProps) => {
    setState((prev) => {
      const updatedVideos = prev.videos.map((video) => {
        if (video.id === id) {
          return {
            ...video,
            ...changeData,
          };
        }
        return video;
      });
      return { ...prev, videos: updatedVideos };
    });
  }, []);

  const addimportedFiles = useCallback(({id,name,type,url}:VideoEditorFileProps)=>{
    setState((prev)=>{
      if (prev.importedFiles.some((imf) => (imf.id === id||imf.name===name))) {
          // file with this ID or name already exists, do nothing
          return prev;
        }
        return {...prev,importedFiles:[...prev.importedFiles,{id,name,type,url}]}
    })
  },[])

  const exportVideo = useCallback(async () => {
    setIsProcessing(true);
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, -5);
      const filename = `edited-video-${timestamp}.mp4`;

      // Create a dummy blob for demonstration
      // In production, this would use FFmpeg WASM to process the actual video
      const dummyData = new Array(1024 * 1024).fill(0);
      const blob = new Blob([new Uint8Array(dummyData)], { type: "video/mp4" });

      // Trigger download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log("Exported with settings:", state);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [state]);

  return {
    state,
    updateClip,
    updateBackground,
    updateGradient,
    updatePadding,
    updateBorderRadius,
    updateTransition,
    updateTransitionDuration,
    exportVideo,
    updateVideos,
    addVideo,
    addimportedFiles,
    isProcessing,
  };
}
