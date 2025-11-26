import { RefObject, SetStateAction, useRef, useState } from "react"
import { ButtonGroup } from "../ui/button-group"
import { Button } from "../ui/button"
import { Clock, Pause, Play, Timer } from "lucide-react"
import { IoPlaySkipBack } from "react-icons/io5";
import { IoPlaySkipForward } from "react-icons/io5";

interface BottomTimelineProps {
  videoElementRef: RefObject<HTMLVideoElement | null>
  videos: VideoTimeLineClip[]
  isPlaying: boolean
  setIsPlaying: (value: SetStateAction<boolean>) => void
  currentTime: number
  clipStart: number
  clipEnd: number
  onUpdateClip: (start: number, end: number) => void
  onSeek: (time: number) => void
}

export default function BottomTimeline({
  videoElementRef,
  isPlaying,
  setIsPlaying,
  currentTime,
  clipStart,
  clipEnd,
  onUpdateClip,
  onSeek,
  videos,
}: BottomTimelineProps) {

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000); // Extract milliseconds

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(milliseconds).padStart(3, "0")}`;
  };

  const togglePlay = () => {
    if (videoElementRef.current) {
      if (isPlaying) {
        videoElementRef.current.pause()
      } else {
        videoElementRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  return (
    <div className="bg-card/20 border-t flex flex-col">
      <div className="px-4 py-2 border-b flex justify-between items-center">
        <div className=" flex items-center justify-center gap-2">
          <Clock className=" h-4 w-4" />
          <p className="text-sm font-medium">Timeline</p>
        </div>

        {/*  */}
        <ButtonGroup>
          <Button size="icon-sm" variant="outline" onClick={() => { onSeek(0) }}>
            <IoPlaySkipBack />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={togglePlay}>
            {
              isPlaying ? <Pause /> : <Play />
            }
          </Button>
          <Button size="icon-sm" variant="outline" onClick={() => { onSeek(clipEnd) }}>
            <IoPlaySkipForward />
          </Button>
        </ButtonGroup>

        {/* see and update current, start and end time */}
        <div className="flex justify-center gap-2 items-center">

          <Button variant="outline" size="sm" className=" flex justify-center items-center gap-2">
            <Timer className=" w-4 h-4" />
            <span>Time</span>
            <span>{formatTime(currentTime)}</span>
          </Button>

          {/*todo:  update start and end time*/}
          <Button variant="outline" size="sm" className=" flex justify-center items-center gap-2">
            <span>Start</span>
            <span>{formatTime(clipStart)}</span>
          </Button>
          <Button variant="outline" size="sm" className=" flex justify-center items-center gap-2">
            <span>End</span>
            <span>{formatTime(clipEnd)}</span>
          </Button>
        </div>
      </div>
      {/* time line with d3 goes here */}
    </div>
  )
}
