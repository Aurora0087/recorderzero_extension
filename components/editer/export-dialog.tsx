import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader } from 'lucide-react';
import type { VideoEditorState } from '@/hooks/use-video-editor';

interface ExportDialogProps {
  isOpen: boolean;
  isProcessing: boolean;
  onExport: () => Promise<void>;
  onClose: () => void;
  state: VideoEditorState;
  duration: number;
}

export default function ExportDialog({
  isOpen,
  isProcessing,
  onExport,
  onClose,
  state,
  duration,
}: ExportDialogProps) {
  const [exportSettings, setExportSettings] = useState({
    format: 'mp4',
    quality: 'high',
    fps: 24,
  });

  const clipDuration = state.clipEnd - state.clipStart;
  const fileSize = Math.round((clipDuration * 2) / (exportSettings.quality === 'high' ? 1 : 2));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-lg border border-neutral-800 max-w-md w-full p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Export Video</h2>

        {/* Export Settings */}
        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-neutral-400 text-sm block mb-2">Format</label>
            <select
              value={exportSettings.format}
              onChange={(e) =>
                setExportSettings({ ...exportSettings, format: e.target.value })
              }
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP8)</option>
              <option value="gif">GIF</option>
            </select>
          </div>

          {/* Quality Selection */}
          <div>
            <label className="text-neutral-400 text-sm block mb-2">Quality</label>
            <select
              value={exportSettings.quality}
              onChange={(e) =>
                setExportSettings({ ...exportSettings, quality: e.target.value })
              }
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              <option value="low">Low (360p)</option>
              <option value="medium">Medium (720p)</option>
              <option value="high">High (1080p)</option>
            </select>
          </div>

          {/* FPS Selection */}
          <div>
            <label className="text-neutral-400 text-sm block mb-2">FPS</label>
            <select
              value={exportSettings.fps}
              onChange={(e) =>
                setExportSettings({ ...exportSettings, fps: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            >
              <option value={24}>24 FPS</option>
              <option value={30}>30 FPS</option>
              <option value={60}>60 FPS</option>
            </select>
          </div>
        </div>

        {/* Export Info */}
        <div className="bg-neutral-800 rounded p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Duration:</span>
            <span className="text-white font-mono">{clipDuration.toFixed(2)}s</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Est. File Size:</span>
            <span className="text-white font-mono">~{fileSize}MB</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-400">Format:</span>
            <span className="text-white font-mono">{exportSettings.format.toUpperCase()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={onExport}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
