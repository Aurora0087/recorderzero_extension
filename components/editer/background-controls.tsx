import { useState } from 'react';
import { Button } from '../ui/button';

interface BackgroundControlsProps {
  backgroundColor: string;
  backgroundGradient: {
    enabled: boolean;
    color1: string;
    color2: string;
    angle: number;
  };
  padding: number;
  borderRadius: number;
  onBackgroundChange: (color: string) => void;
  onGradientChange: (gradient: Partial<{ enabled: boolean; color1: string; color2: string; angle: number }>) => void;
  onPaddingChange: (padding: number) => void;
  onBorderRadiusChange: (radius: number) => void;
}

const PRESET_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#1a1a1a' },
  { name: 'White', value: '#ffffff' },
  { name: 'Blue', value: '#1e40af' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Green', value: '#059669' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Orange', value: '#ea580c' },
];

const PRESET_GRADIENTS = [
  { name: 'Dark Blue', color1: '#000033', color2: '#0055cc' },
  { name: 'Sunset', color1: '#ff6b35', color2: '#f7931e' },
  { name: 'Ocean', color1: '#001a4d', color2: '#0066cc' },
  { name: 'Forest', color1: '#0d3b1a', color2: '#228B22' },
  { name: 'Purple Pink', color1: '#5a189a', color2: '#c77dff' },
  { name: 'Monochrome', color1: '#1a1a1a', color2: '#808080' },
];

export default function BackgroundControls({
  backgroundColor,
  backgroundGradient,
  padding,
  borderRadius,
  onBackgroundChange,
  onGradientChange,
  onPaddingChange,
  onBorderRadiusChange,
}: BackgroundControlsProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const getBackgroundStyle = () => {
    if (backgroundGradient.enabled) {
      return {
        background: `linear-gradient(${backgroundGradient.angle}deg, ${backgroundGradient.color1}, ${backgroundGradient.color2})`,
      };
    }
    return { backgroundColor };
  };

  return (
    <div className="space-y-4">
      {/* Background Color */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-white font-semibold mb-4">Background</h3>

        {/* Solid Color / Gradient Toggle */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Button
            onClick={() => onGradientChange({ enabled: false })}
            className='w-full'
          >
            Solid Color
          </Button>
          <Button
            onClick={() => onGradientChange({ enabled: true })}
            className='w-full'
          >
            Gradient
          </Button>
        </div>

        {/* Solid Color Controls */}
        {!backgroundGradient.enabled && (
          <>
            {/* Preset Colors */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => onBackgroundChange(color.value)}
                  className={`aspect-square rounded-lg border-2 transition-all ${
                    backgroundColor === color.value
                      ? 'border-blue-400 ring-2 ring-blue-400'
                      : 'border-neutral-700 hover:border-neutral-600'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>

            {/* Custom Color Picker */}
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full px-3 py-2 rounded border border-neutral-700 text-neutral-400 text-sm hover:border-neutral-600 transition-colors"
              >
                {showColorPicker ? 'Hide Custom Color' : 'Custom Color'}
              </Button>

              {showColorPicker && (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundChange(e.target.value)}
                    className="w-12 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => onBackgroundChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono"
                    placeholder="#000000"
                  />
                </div>
              )}
            </div>

            {/* Color Preview */}
            <div className="mt-4 p-3 rounded bg-secondary flex items-center gap-3">
              <div
                className="w-12 h-12 rounded border border-neutral-600"
                style={{ backgroundColor }}
              />
              <div>
                <p className="text-neutral-400 text-xs">Current Color</p>
                <p className="text-white font-mono text-sm">{backgroundColor}</p>
              </div>
            </div>
          </>
        )}

        {/* Gradient Controls */}
        {backgroundGradient.enabled && (
          <div className="space-y-4">
            {/* Preset Gradients */}
            <div>
              <p className="text-neutral-400 text-xs mb-2">Preset Gradients</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_GRADIENTS.map((grad) => (
                  <button
                    key={grad.name}
                    onClick={() =>
                      onGradientChange({
                        color1: grad.color1,
                        color2: grad.color2,
                      })
                    }
                    className="px-3 py-2 rounded border-2 border-neutral-700 hover:border-neutral-600 transition-colors text-xs font-medium text-neutral-400 hover:text-white"
                    style={{
                      background: `linear-gradient(90deg, ${grad.color1}, ${grad.color2})`,
                      color: 'white',
                      textShadow: '0 0 4px rgba(0,0,0,0.8)',
                    }}
                  >
                    {grad.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Gradient Colors */}
            <div className="space-y-2">
              <label className="text-neutral-400 text-sm block">Color 1</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundGradient.color1}
                  onChange={(e) => onGradientChange({ color1: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundGradient.color1}
                  onChange={(e) => onGradientChange({ color1: e.target.value })}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-neutral-400 text-sm block">Color 2</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundGradient.color2}
                  onChange={(e) => onGradientChange({ color2: e.target.value })}
                  className="w-12 h-10 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={backgroundGradient.color2}
                  onChange={(e) => onGradientChange({ color2: e.target.value })}
                  className="flex-1 px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-white text-sm font-mono"
                />
              </div>
            </div>

            {/* Gradient Angle */}
            <div className="space-y-2">
              <label className="text-neutral-400 text-sm block">
                Angle: <span className="text-white font-mono">{backgroundGradient.angle}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                value={backgroundGradient.angle}
                onChange={(e) => onGradientChange({ angle: parseInt(e.target.value) })}
                className="w-full cursor-pointer"
              />
            </div>

            {/* Gradient Preview */}
            <div
              className="w-full h-20 rounded border border-neutral-600"
              style={{
                background: `linear-gradient(${backgroundGradient.angle}deg, ${backgroundGradient.color1}, ${backgroundGradient.color2})`,
              }}
            />
          </div>
        )}
      </div>

      {/* Padding Controls */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
        <h3 className="text-white font-semibold mb-4">Video Padding</h3>

        <div className="space-y-3">
          {/* Slider */}
          <div>
            <label className="text-neutral-400 text-sm block mb-2">
              Padding: <span className="text-white font-mono">{padding}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="150"
              value={padding}
              onChange={(e) => onPaddingChange(parseInt(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>0px</span>
              <span>150px</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-neutral-400 text-xs mb-2">Quick Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 20, 40, 60].map((value) => (
                <button
                  key={value}
                  onClick={() => onPaddingChange(value)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                    padding === value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  {value}px
                </button>
              ))}
            </div>
          </div>

          {/* Padding Visualization */}
          <div className="mt-4 p-3 bg-neutral-800 rounded">
            <p className="text-neutral-400 text-xs mb-2">Preview</p>
            <div
              className="rounded"
              style={{
                padding: `${Math.min(padding, 40)}px`,
                aspectRatio: '16/9',
                ...getBackgroundStyle(),
              }}
            >
              <div
                className="w-full h-full bg-linear-to-br from-blue-500/50 to-purple-500/50 flex items-center justify-center"
                style={{ borderRadius: `${borderRadius}px` }}
              >
                <p className="text-white text-xs">Video</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Border Radius Controls */}
      <div className="bg-neutral-900 rounded-lg p-4 border border-neutral-800">
        <h3 className="text-white font-semibold mb-4">Video Border Radius</h3>

        <div className="space-y-3">
          {/* Slider */}
          <div>
            <label className="text-neutral-400 text-sm block mb-2">
              Border Radius: <span className="text-white font-mono">{borderRadius}px</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={borderRadius}
              onChange={(e) => onBorderRadiusChange(parseInt(e.target.value))}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-xs text-neutral-500 mt-1">
              <span>0px</span>
              <span>100px</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-neutral-400 text-xs mb-2">Quick Presets</p>
            <div className="grid grid-cols-4 gap-2">
              {[0, 10, 20, 50].map((value) => (
                <button
                  key={value}
                  onClick={() => onBorderRadiusChange(value)}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                    borderRadius === value
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-neutral-600'
                  }`}
                >
                  {value}px
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius Visualization */}
          <div className="mt-4 p-3 bg-neutral-800 rounded">
            <p className="text-neutral-400 text-xs mb-2">Preview</p>
            <div className="bg-neutral-700 rounded p-2">
              <div
                className="w-full bg-linear-to-br from-blue-500/50 to-purple-500/50 flex items-center justify-center"
                style={{
                  aspectRatio: '16/9',
                  borderRadius: `${borderRadius}px`,
                }}
              >
                <p className="text-white text-xs">Video</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
