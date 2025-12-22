"use client"

import { useState } from "react"
import { ChevronDown, Plus, Trash2, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "../ui/input"

interface ColorStop {
  id: string
  color: string
  position: number
}

interface Gradient {
  name: string
  stops: ColorStop[]
  angle: number
}

const PRESET_GRADIENTS: Gradient[] = [
  // --- Classics (Your Originals) ---
  {
    name: "Sunset",
    stops: [
      { id: "1", color: "#FF6B6B", position: 0 },
      { id: "2", color: "#FFA500", position: 50 },
      { id: "3", color: "#FFD700", position: 100 },
    ],
    angle: 90,
  },
  {
    name: "Ocean",
    stops: [
      { id: "1", color: "#006BA6", position: 0 },
      { id: "2", color: "#0496FF", position: 100 },
    ],
    angle: 135,
  },
  {
    name: "Forest",
    stops: [
      { id: "1", color: "#134E5E", position: 0 },
      { id: "2", color: "#71B280", position: 100 },
    ],
    angle: 45,
  },
  {
    name: "Purple Dream",
    stops: [
      { id: "1", color: "#667EEA", position: 0 },
      { id: "2", color: "#764BA2", position: 100 },
    ],
    angle: 90,
  },

  // --- Vibrant & Trendy ---
  {
    name: "Cyberpunk",
    stops: [
      { id: "1", color: "#F11712", position: 0 },
      { id: "2", color: "#0099F7", position: 100 },
    ],
    angle: 135,
  },
  {
    name: "Inferno",
    stops: [
      { id: "1", color: "#f12711", position: 0 },
      { id: "2", color: "#f5af19", position: 100 },
    ],
    angle: 90,
  },
  {
    name: "Social Vibes",
    stops: [
      { id: "1", color: "#833ab4", position: 0 },
      { id: "2", color: "#fd1d1d", position: 50 },
      { id: "3", color: "#fcb045", position: 100 },
    ],
    angle: 135,
  },
  {
    name: "Electric Violet",
    stops: [
      { id: "1", color: "#4776E6", position: 0 },
      { id: "2", color: "#8E54E9", position: 100 },
    ],
    angle: 90,
  },

  // --- Nature & Earth ---
  {
    name: "Northern Lights",
    stops: [
      { id: "1", color: "#43cea2", position: 0 },
      { id: "2", color: "#185a9d", position: 100 },
    ],
    angle: 60,
  },
  {
    name: "Lush Garden",
    stops: [
      { id: "1", color: "#D3CCE3", position: 0 },
      { id: "2", color: "#E9E4F0", position: 100 },
    ],
    angle: 180,
  },
  {
    name: "Morning Sky",
    stops: [
      { id: "1", color: "#FF5F6D", position: 0 },
      { id: "2", color: "#FFC371", position: 100 },
    ],
    angle: 45,
  },

  // --- Dark & Moody ---
  {
    name: "Deep Space",
    stops: [
      { id: "1", color: "#000000", position: 0 },
      { id: "2", color: "#434343", position: 100 },
    ],
    angle: 180,
  },
  {
    name: "Midnight City",
    stops: [
      { id: "1", color: "#232526", position: 0 },
      { id: "2", color: "#414345", position: 100 },
    ],
    angle: 120,
  },
  {
    name: "Vampire",
    stops: [
      { id: "1", color: "#870000", position: 0 },
      { id: "2", color: "#190A05", position: 100 },
    ],
    angle: 160,
  },

  // --- Pastel & Soft ---
  {
    name: "Cotton Candy",
    stops: [
      { id: "1", color: "#ff9a9e", position: 0 },
      { id: "2", color: "#fecfef", position: 99 },
      { id: "3", color: "#fecfef", position: 100 },
    ],
    angle: 0,
  },
  {
    name: "Fresh Mint",
    stops: [
      { id: "1", color: "#00b09b", position: 0 },
      { id: "2", color: "#96c93d", position: 100 },
    ],
    angle: 90,
  },
  {
    name: "Cloudy Day",
    stops: [
      { id: "1", color: "#bdc3c7", position: 0 },
      { id: "2", color: "#2c3e50", position: 100 },
    ],
    angle: 180,
  },

  // --- Metallic & Special ---
  {
    name: "Gold Rush",
    stops: [
      { id: "1", color: "#BF953F", position: 0 },
      { id: "2", color: "#FCF6BA", position: 50 },
      { id: "3", color: "#B38728", position: 100 },
    ],
    angle: 135,
  },
  {
    name: "Silver Surfer",
    stops: [
      { id: "1", color: "#E0E0E0", position: 0 },
      { id: "2", color: "#7D7D7D", position: 100 },
    ],
    angle: 45,
  },
  {
    name: "Rose Water",
    stops: [
      { id: "1", color: "#E55D87", position: 0 },
      { id: "2", color: "#5FC3E4", position: 100 },
    ],
    angle: 90,
  },
]

export function GradientPicker({
  gradientColor,
  onUpdateGradient,
}: {
  gradientColor: {
    enabled: boolean
    stops: { color: string; position: number }[]
    angle: number
  }
  onUpdateGradient: (
    gradient: Partial<{ enabled: boolean; stops: { color: string; position: number }[]; angle: number }>,
  ) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  // Convert gradientColor.stops to internal format with IDs
  const [internalStops, setInternalStops] = useState<ColorStop[]>(() =>
    gradientColor.stops.map((stop, index) => ({
      id: `stop-${index}`,
      ...stop,
    })),
  )

  // Current gradient state
  const gradient: Gradient = {
    name: "Custom",
    stops: internalStops,
    angle: gradientColor.angle,
  }

  const selectedStop = gradient.stops.find((stop) => stop.id === selectedStopId) || null

  const generateGradientCSS = () => {
    const stopString = gradient.stops
      .sort((a, b) => a.position - b.position)
      .map((stop) => `${stop.color} ${stop.position}%`)
      .join(", ")
    return `linear-gradient(${gradient.angle}deg, ${stopString})`
  }

  const handleSelectPreset = (preset: Gradient) => {
    setInternalStops(preset.stops)
    onUpdateGradient({
      enabled: true,
      stops: preset.stops.map(({ color, position }) => ({ color, position })),
      angle: preset.angle,
    })
    setIsExpanded(false)
  }

  const handleColorChange = (color: string) => {
    const newStops = gradient.stops.map((stop) => (stop.id === selectedStopId ? { ...stop, color } : stop))
    setInternalStops(newStops)
    onUpdateGradient({
      stops: newStops.map(({ color, position }) => ({ color, position })),
    })
  }

  const handlePositionChange = (position: number) => {
    const newStops = gradient.stops.map((stop) => (stop.id === selectedStopId ? { ...stop, position } : stop))
    setInternalStops(newStops)
    onUpdateGradient({
      stops: newStops.map(({ color, position }) => ({ color, position })),
    })
  }

  const handleAngleChange = (angle: number) => {
    onUpdateGradient({ angle, enabled: true })
  }

  const addColorStop = () => {
    const newId = Date.now().toString()
    const newPosition =
      gradient.stops.length > 0
        ? (gradient.stops[gradient.stops.length - 1].position + gradient.stops[0].position) / 2
        : 50
    const newStops = [...gradient.stops, { id: newId, color: "#000000", position: newPosition }]
    setInternalStops(newStops)
    onUpdateGradient({
      stops: newStops.map(({ color, position }) => ({ color, position })),
    })
    setSelectedStopId(newId)
  }

  const removeColorStop = (id: string) => {
    if (gradient.stops.length > 2) {
      const newStops = gradient.stops.filter((stop) => stop.id !== id)
      setInternalStops(newStops)
      onUpdateGradient({
        stops: newStops.map(({ color, position }) => ({ color, position })),
      })
      setSelectedStopId(newStops[0]?.id || null)
    }
  }

  return (
    <div className="w-full space-y-4 rounded-2xl">

      <div className="space-y-2">
        <h3 className="text-xs font-medium tracking-wider text-muted-foreground">Preview</h3>
        <div className="group relative overflow-hidden rounded-md">
          <div
            className="w-full aspect-video transition-transform duration-300 group-hover:scale-105"
            style={{ background: generateGradientCSS() }}
          />
          <div className="absolute inset-0 rounded-2xl ring-1 ring-black/5" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium tracking-wider text-muted-foreground">Presets</h3>
        <div className="relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex w-full items-center justify-between rounded-md border border-border/60 bg-muted/30 px-2 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:border-border hover:bg-muted/50 hover:shadow-md"
          >
            <span className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md border border-border/50 shadow-sm"
                style={{ background: generateGradientCSS() }}
              />
              {gradient.name}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            />
          </button>

          {isExpanded && (
            <div className="absolute top-full z-20 mt-2 max-h-80 w-full space-y-1 overflow-y-auto rounded-xl border border-border/50 bg-card/95 p-2 shadow-2xl backdrop-blur-md">
              {PRESET_GRADIENTS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handleSelectPreset(preset)}
                  className="flex w-full items-center gap-3 rounded-lg p-3 transition-colors hover:bg-muted/60"
                >
                  <div
                    className="h-12 w-12 shrink-0 rounded-lg border border-border/50 shadow-sm"
                    style={{
                      background: `linear-gradient(${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.position}%`).join(", ")})`,
                    }}
                  />
                  <span className="text-sm font-medium text-foreground">{preset.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium tracking-wider text-muted-foreground">Angle</label>
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {gradient.angle}°
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          value={gradient.angle}
          onChange={(e) => handleAngleChange(Number(e.target.value))}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary transition-all [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground">Color Stops</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addColorStop}
          >
            <Plus className="h-4 w-4" />
            Add Stop
          </Button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto rounded-xl bg-muted/20 p-1">
          {gradient.stops
            .sort((a, b) => a.position - b.position)
            .map((stop) => (
              <div
                key={stop.id}
                onClick={() => setSelectedStopId(stop.id)}
                className={`group flex items-center gap-3 rounded-lg border p-2 cursor-pointer transition-all ${
                  selectedStopId === stop.id
                    ? "border-primary/50 bg-primary/10 shadow-md ring-2 ring-primary/20"
                    : "border-border/40 bg-card/50 hover:border-border hover:bg-card hover:shadow-sm"
                }`}
              >
                <div
                  className="h-8 w-8 shrink-0 rounded-md border-2 border-white/20 shadow-md ring-1 ring-black/5"
                  style={{ backgroundColor: stop.color }}
                />
                <div className="flex-1">
                  <div className="text-xs font-mono font-semibold text-foreground">{stop.color.toUpperCase()}</div>
                  <div className="text-xs font-medium text-muted-foreground">{stop.position}%</div>
                </div>
                {gradient.stops.length > 2 && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeColorStop(stop.id)
                    }}
                    size="icon-sm"
                    variant="destructive"
                    className="opacity-0 transition-all group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
        </div>
      </div>

      {selectedStop && (
        <div className="space-y-4 p-1">
          <div className="space-y-2">
            <p className="text-xs font-medium tracking-wider text-muted-foreground">Color</p>
            <div className="grid grid-cols-[1fr_4fr] gap-2">
                <Input
                  type="color"
                  value={selectedStop.color}
                  onChange={(e) => handleColorChange(e.target.value)}
                  />
              <Input
                type="text"
                value={selectedStop.color}
                onChange={(e) => handleColorChange(e.target.value)}
                className="uppercase"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs tracking-wider text-muted-foreground">Position</label>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {selectedStop.position}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedStop.position}
              onChange={(e) => handlePositionChange(Number(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary transition-all [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
            />
          </div>
        </div>
      )}
    </div>
  )
}
