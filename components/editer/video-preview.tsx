import { useRef, useEffect, useState } from 'react';
import { applyTransitionEffect, resetTransitionEffect } from './transition-effects';
import { Button } from '../ui/button';
import { Pause, Play } from 'lucide-react';


interface VideoPreviewProps {
  videoUrl: string;
  clipStart: number;
  clipEnd: number;
  backgroundColor: string;
  backgroundGradient: {
    enabled: boolean;
    color1: string;
    color2: string;
    angle: number;
  };
  padding: number;
  borderRadius: number;
  transition: string;
  transitionDuration: number;
}

export default function VideoPreview({
  videoUrl,
  clipStart,
  clipEnd,
  backgroundColor,
  backgroundGradient,
  padding,
  borderRadius,
  transition,
  transitionDuration,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleLoadedMetadata = () => {
        setDuration(video.duration);
        video.currentTime = clipStart;
      };
      const handleTimeUpdate = () => {
        setCurrentTime(video.currentTime);
        if (video.currentTime >= clipEnd) {
          video.currentTime = clipStart;
          video.pause();
          setIsPlaying(false);
        }
      };
      const handlePlay = () => setIsPlaying(true);
      const handlePause = () => setIsPlaying(false);

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }
  }, [clipStart, clipEnd]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvas = () => {
      if (backgroundGradient.enabled) {
        const gradient = ctx.createLinearGradient(
          0,
          0,
          canvas.width * Math.cos((backgroundGradient.angle * Math.PI) / 180),
          canvas.height * Math.sin((backgroundGradient.angle * Math.PI) / 180)
        );
        gradient.addColorStop(0, backgroundGradient.color1);
        gradient.addColorStop(1, backgroundGradient.color2);
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = backgroundColor;
      }
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const videoWidth = canvas.width - padding * 2;
      const videoHeight = canvas.height - padding * 2;
      const aspectRatio = video.videoWidth / video.videoHeight;
      let displayWidth = videoWidth;
      let displayHeight = videoWidth / aspectRatio;

      if (displayHeight > videoHeight) {
        displayHeight = videoHeight;
        displayWidth = videoHeight * aspectRatio;
      }

      const x = (canvas.width - displayWidth) / 2;
      const y = (canvas.height - displayHeight) / 2;

      if (borderRadius > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, displayWidth, displayHeight, borderRadius);
        ctx.clip();
      }

      // Apply transition effect
      applyTransitionEffect(ctx, canvas, transition, currentTime, clipStart, clipEnd, transitionDuration);

      ctx.drawImage(video, x, y, displayWidth, displayHeight);

      if (borderRadius > 0) {
        ctx.restore();
      }

      // Reset transition effect
      resetTransitionEffect(ctx, transition);

      requestAnimationFrame(updateCanvas);
    };

    updateCanvas();
  }, [backgroundColor, backgroundGradient, padding, borderRadius, transition, transitionDuration, currentTime, clipStart, clipEnd]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(clipStart, Math.min(time, clipEnd));
    }
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex-1 rounded-lg overflow-hidden bg-card border border-neutral-800 relative">
        <canvas
          ref={canvasRef}
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="bg-card text-card-foreground rounded-lg p-3 border border-card">
        <div className="flex justify-between text-sm">
          <span className="">Duration:</span>
          <span className="font-mono">{duration.toFixed(2)}s</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="">Clip Range:</span>
          <span className="font-mono">
            {clipStart.toFixed(2)}s - {clipEnd.toFixed(2)}s
          </span>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 border border-card space-y-3">
        <Button
          onClick={handlePlayPause}
          className=" w-full items-center justify-center flex gap-2"
        >

          {isPlaying ? (
            <>
              <Pause />
              <span>
                Pause
              </span>

            </>

          ) : (
            <>
              <Play />
              <span>
                Play
              </span>
            </>

          )}
        </Button>

        <div className="space-y-2">
          <label className=" text-sm">Timeline</label>
          <input
            type="range"
            min={clipStart}
            max={clipEnd}
            step="0.01"
            value={currentTime}
            onChange={(e) => handleSeek(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="flex justify-between text-xs">
            <span>{currentTime.toFixed(2)}s</span>
            <span>{(clipEnd - clipStart).toFixed(2)}s / {duration.toFixed(2)}s</span>
          </div>
        </div>
      </div>

      <video
        ref={videoRef}
        src={videoUrl}
        className="hidden"
        crossOrigin="anonymous"
        width={1280}
        height={720}
      />
    </div>
  );
}
