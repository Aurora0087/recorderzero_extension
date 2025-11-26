import { useState } from "react"
import { ChevronDown, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"

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
]

export function GradientPicker({
    gradientColor,
    onUpdateGradient
}: {
    gradientColor: {
        enabled: boolean
        stops: { color: string; position: number }[]
        angle: number
    }
    onUpdateGradient: (gradient: Partial<{ enabled: boolean; stops: { color: string; position: number }[]; angle: number }>) => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
    
    // Convert gradientColor.stops to internal format with IDs
    const [internalStops, setInternalStops] = useState<ColorStop[]>(() => 
        gradientColor.stops.map((stop, index) => ({
            id: `stop-${index}`,
            ...stop
        }))
    )

    // Current gradient state
    const gradient: Gradient = {
        name: "Custom",
        stops: internalStops,
        angle: gradientColor.angle
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
            angle: preset.angle
        })
        setIsExpanded(false)
    }

    const handleColorChange = (color: string) => {
        const newStops = gradient.stops.map((stop) => 
            stop.id === selectedStopId ? { ...stop, color } : stop
        )
        setInternalStops(newStops)
        onUpdateGradient({
            stops: newStops.map(({ color, position }) => ({ color, position }))
        })
    }

    const handlePositionChange = (position: number) => {
        const newStops = gradient.stops.map((stop) => 
            stop.id === selectedStopId ? { ...stop, position } : stop
        )
        setInternalStops(newStops)
        onUpdateGradient({
            stops: newStops.map(({ color, position }) => ({ color, position }))
        })
    }

    const handleAngleChange = (angle: number) => {
        onUpdateGradient({ angle,enabled:true })
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
            stops: newStops.map(({ color, position }) => ({ color, position }))
        })
        setSelectedStopId(newId)
    }

    const removeColorStop = (id: string) => {
        if (gradient.stops.length > 2) {
            const newStops = gradient.stops.filter((stop) => stop.id !== id)
            setInternalStops(newStops)
            onUpdateGradient({
                stops: newStops.map(({ color, position }) => ({ color, position }))
            })
            setSelectedStopId(newStops[0]?.id || null)
        }
    }

    return (
        <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-6">
            {/* Preview */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Preview</h3>
                <div
                    className="h-40 w-full rounded-lg border border-border shadow-lg"
                    style={{ background: generateGradientCSS() }}
                />
            </div>

            {/* Gradient Selection */}
            <div className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">Presets</h3>
                <div className="relative">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex w-full items-center justify-between rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/80"
                    >
                        {gradient.name}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {isExpanded && (
                        <div className="absolute top-full z-10 mt-2 w-full space-y-2 rounded-lg border border-border bg-card p-2 shadow-lg">
                            {PRESET_GRADIENTS.map((preset) => (
                                <button
                                    key={preset.name}
                                    onClick={() => handleSelectPreset(preset)}
                                    className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-muted"
                                >
                                    <div
                                        className="h-10 w-10 rounded border border-border"
                                        style={{
                                            background: `linear-gradient(${preset.angle}deg, ${preset.stops.map((s) => `${s.color} ${s.position}%`).join(", ")})`,
                                        }}
                                    />
                                    <span className="text-sm font-medium">{preset.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Angle Control */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-foreground">Angle</label>
                    <span className="text-sm font-medium text-muted-foreground">{gradient.angle}°</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="360"
                    value={gradient.angle}
                    onChange={(e) => handleAngleChange(Number(e.target.value))}
                    className="w-full accent-primary rounded h-1 cursor-pointer"
                />
            </div>

            {/* Color Stops */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground">Color Stops</h3>
                    <Button variant="outline" size="sm" onClick={addColorStop} className="gap-1 bg-transparent">
                        <Plus className="h-4 w-4" />
                        Add
                    </Button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                    {gradient.stops
                        .sort((a, b) => a.position - b.position)
                        .map((stop) => (
                            <div
                                key={stop.id}
                                onClick={() => setSelectedStopId(stop.id)}
                                className={`flex items-center gap-2 rounded-lg border p-2 cursor-pointer transition-colors ${
                                    selectedStopId === stop.id ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <div className="h-8 w-8 rounded border border-border" style={{ backgroundColor: stop.color }} />
                                <div className="flex-1 space-y-1">
                                    <div className="text-xs font-medium text-foreground">{stop.position}%</div>
                                </div>
                                {gradient.stops.length > 2 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            removeColorStop(stop.id)
                                        }}
                                        className="p-1 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                </div>
            </div>

            {/* Color & Position Controls */}
            {selectedStop && (
                <div className="space-y-4 border-t border-border pt-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Color</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={selectedStop.color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="h-10 w-16 cursor-pointer rounded border border-border"
                            />
                            <input
                                type="text"
                                value={selectedStop.color}
                                onChange={(e) => handleColorChange(e.target.value)}
                                className="flex-1 rounded border border-border bg-muted px-3 py-2 text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-foreground">Position</label>
                            <span className="text-sm font-medium text-muted-foreground">{selectedStop.position}%</span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={selectedStop.position}
                            onChange={(e) => handlePositionChange(Number(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>
            )}
        </div>
    )
}