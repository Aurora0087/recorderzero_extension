
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { VideoEditorState } from '@/hooks/use-video-editor';
import ClipTimeline from './clip-timeline';
import BackgroundControls from './background-controls';

interface EditingControlsProps {
  state: VideoEditorState;
  duration: number;
  currentTime: number;
  onUpdateClip: (start: number, end: number) => void;
  onUpdateBackground: (color: string) => void;
  onUpdateGradient: (gradient: Partial<VideoEditorState['backgroundGradient']>) => void;
  onUpdatePadding: (padding: number) => void;
  onUpdateBorderRadius: (radius: number) => void;
  onUpdateTransition: (transition: string) => void;
  onUpdateTransitionDuration: (duration: number) => void;
  onExport: () => Promise<void>;
  onSeek: (time: number) => void;
  isProcessing: boolean;
}

export default function EditingControls({
  state,
  duration,
  currentTime,
  onUpdateClip,
  onUpdateBackground,
  onUpdateGradient,
  onUpdatePadding,
  onUpdateBorderRadius,
  onUpdateTransition,
  onUpdateTransitionDuration,
  onExport,
  onSeek,
  isProcessing,
}: EditingControlsProps) {
  return (
    <div className="space-y-6">
      {/* Clip Timeline */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4">Clip Timeline</h3>
        <ClipTimeline
          duration={duration}
          clipStart={state.clipStart}
          clipEnd={state.clipEnd}
          currentTime={currentTime}
          onUpdateClip={onUpdateClip}
          onSeek={onSeek}
        />
      </div>

      {/* Clip Duration Inputs */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4">Clip Duration</h3>
        <div className="space-y-3">
          <div>
            <label className="text-neutral-400 text-sm block mb-2">Start Time (s)</label>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={state.clipStart}
              onChange={(e) => onUpdateClip(parseFloat(e.target.value), state.clipEnd)}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            />
          </div>
          <div>
            <label className="text-neutral-400 text-sm block mb-2">End Time (s)</label>
            <input
              type="number"
              min="0"
              max={duration}
              step="0.1"
              value={state.clipEnd}
              onChange={(e) => onUpdateClip(state.clipStart, parseFloat(e.target.value))}
              className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm"
            />
          </div>
        </div>
      </div>

      {/* Background and Padding Controls */}
      <BackgroundControls
        backgroundColor={state.backgroundColor}
        backgroundGradient={state.backgroundGradient}
        padding={state.padding}
        borderRadius={state.borderRadius}
        onBackgroundChange={onUpdateBackground}
        onGradientChange={onUpdateGradient}
        onPaddingChange={onUpdatePadding}
        onBorderRadiusChange={onUpdateBorderRadius}
      />

      {/* Transition Control */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
        <h3 className="text-white font-semibold mb-4">Transition Effects</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {['none', 'fade', 'slideLeft', 'slideRight', 'zoomIn', 'zoomOut', 'dissolve', 'wipeDown', 'wipeUp'].map((trans) => (
            <button
              key={trans}
              onClick={() => onUpdateTransition(trans)}
              className={`px-3 py-2 rounded border-2 text-xs font-medium transition-colors ${
                state.transition === trans
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-600'
              }`}
            >
              {trans === 'none' ? 'None' : trans.replace(/([A-Z])/g, ' $1').trim()}
            </button>
          ))}
        </div>

        {state.transition !== 'none' && (
          <div className="space-y-3 p-3 bg-neutral-800 rounded">
            <label className="text-neutral-400 text-sm block">
              Animation Duration: <span className="text-white font-mono">{state.transitionDuration.toFixed(2)}s</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={state.transitionDuration}
              onChange={(e) => onUpdateTransitionDuration(parseFloat(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-neutral-500">
              <span>0.1s</span>
              <span>5s</span>
            </div>
          </div>
        )}
      </div>

      {/* Export Button */}
      <Button
        onClick={onExport}
        disabled={isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-6 rounded-lg font-semibold flex items-center justify-center gap-2"
      >
        <Download className="w-5 h-5" />
        {isProcessing ? 'Exporting...' : 'Export Video'}
      </Button>
    </div>
  );
}
