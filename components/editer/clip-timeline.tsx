import { useRef, useEffect, useState } from 'react';

interface ClipTimelineProps {
  duration: number;
  clipStart: number;
  clipEnd: number;
  currentTime: number;
  onUpdateClip: (start: number, end: number) => void;
  onSeek: (time: number) => void;
}

export default function ClipTimeline({
  duration,
  clipStart,
  clipEnd,
  currentTime,
  onUpdateClip,
  onSeek,
}: ClipTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const handleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(type);
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = percentage * duration;

      if (dragging === 'start') {
        onUpdateClip(Math.min(time, clipEnd), clipEnd);
      } else {
        onUpdateClip(clipStart, Math.max(time, clipStart));
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, duration, clipStart, clipEnd, onUpdateClip]);

  const startPercent = (clipStart / duration) * 100;
  const endPercent = (clipEnd / duration) * 100;
  const currentPercent = (currentTime / duration) * 100;

  return (
    <div
      ref={containerRef}
      className="relative h-16 bg-muted rounded-lg border cursor-pointer group"
      onClick={(e) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const percentage = (e.clientX - rect.left) / rect.width;
          onSeek(percentage * duration);
        }
      }}
    >
      {/* Full timeline background */}
      <div className="absolute inset-0 bg-neutral-700/30 rounded-lg" />

      {/* Clipped region */}
      <div
        className="absolute top-0 bottom-0 bg-primary/20 border-l-2 border-r-2 border-primary"
        style={{
          left: `${startPercent}%`,
          right: `${100 - endPercent}%`,
        }}
      />

      {/* Current time indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-red-500 rounded-full pointer-events-none"
        style={{ left: `${currentPercent}%` }}
      />

      {/* Start handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/80 rounded cursor-col-resize hover:bg-primary transition-colors border"
        style={{ left: `${startPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        onMouseDown={handleMouseDown('start')}
      />

      {/* End handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-8 bg-primary/80 rounded cursor-col-resize hover:bg-primary transition-colors border"
        style={{ left: `${endPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}
        onMouseDown={handleMouseDown('end')}
      />

      {/* Time labels */}
      <div className="absolute bottom-1 left-2 text-xs pointer-events-none">
        {clipStart.toFixed(1)}s
      </div>
      <div className="absolute bottom-1 right-2 text-xs pointer-events-none">
        {clipEnd.toFixed(1)}s
      </div>
    </div>
  );
}
