import { Upload, Video, Music, ImageIcon, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Button } from "../ui/button"
import { Separator } from "../ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { GradientPicker } from "./gradient-picker"

interface MediaFile {
    name: string
    type: "video" | "audio" | "image"
    file?: File
    duration?: number
}

interface RightMediaPanelProps {
    mediaFiles: MediaFile[]
    onMediaSelect: (file: File) => void
    onUpdateBackground: (color: string) => void
    onUpdateGradient: (gradient: Partial<{ enabled: boolean; stops: { color: string; position: number; }[]; angle: number; }>) => void
    onUpdatePadding: (padding: number) => void
    onUpdateBorderRadius: (radius: number) => void
    onUpdateTransition: (transition: string) => void
    onUpdateTransitionDuration: (duration: number) => void
    state: VideoEditorState
}

export default function RightMediaPanel({
    mediaFiles,
    onMediaSelect,
    onUpdateBackground,
    onUpdateGradient,
    onUpdatePadding,
    onUpdateBorderRadius,
    onUpdateTransition,
    onUpdateTransitionDuration,
    state,
}: RightMediaPanelProps) {
    const [activeTab, setActiveTab] = useState("all")
    const [expandedSection, setExpandedSection] = useState<string | null>("media")

    const allMedia = [
        { name: "Clip_001.mp4", type: "video", duration: "0:45" },
        { name: "Intro.mp4", type: "video", duration: "0:12" },
        { name: "Background.mp3", type: "audio", duration: "2:30" },
        { name: "Logo.png", type: "image" },
        { name: "Scene_02.mp4", type: "video", duration: "1:20" },
    ]

    const filteredMedia = allMedia.filter((m) => {
        if (activeTab === "all") return true
        if (activeTab === "video") return m.type === "video"
        if (activeTab === "audio") return m.type === "audio"
        if (activeTab === "image") return m.type === "image"
        return true
    })

    const gradientPresets = [
        { name: "Mono", start: "#000000", end: "#ffffff" },
        { name: "Sunset", start: "#FF6B6B", end: "#FFA500" },
        { name: "Ocean", start: "#2196F3", end: "#1565C0" },
        { name: "Forest", start: "#4CAF50", end: "#1B5E20" },
        { name: "Purple", start: "#9C27B0", end: "#4A148C" },
    ]

    return (
        <div className="w-96 border-l flex flex-col overflow-hidden bg-card">
            {/* Header */}
            <div className="px-4 py-4 border-b">
                <h2 className="text-lg font-semibold text-white mb-3">Media</h2>
                <Button className=" w-full">
                    <Upload />
                    Import Media
                </Button>
            </div>



            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Media Files */}
                <div className="border-b">
                    <Button
                        variant="ghost"
                        onClick={() => setExpandedSection(expandedSection === "media" ? null : "media")}
                        className="w-full rounded-none justify-between"
                    >
                        <span className="text-white font-medium">Media Files</span>
                        <div className=" flex justify-center items-center gap-2">
                            <span className="text-neutral-500 text-sm">{filteredMedia.length}</span>
                            <ChevronDown className={`" transition-transform ${expandedSection === "media" ? "rotate-180" : "rotate-0"}`} />
                        </div>

                    </Button>

                    {expandedSection === "media" && (
                        <div className="px-2 py-2 space-y-2 border-t">
                            {/* Tabs */}
                            <div className="px-4 py-3 border-b flex gap-2 overflow-x-auto">
                                {["All", "Video", "Audio", "Image"].map((tab, i) => (
                                    <Button
                                        key={i}
                                        onClick={() => setActiveTab(tab.toLowerCase())}
                                        variant={
                                            activeTab === tab.toLowerCase() ? "default" : "secondary"
                                        }
                                    >
                                        {tab.toLocaleLowerCase() === "video" && <Video />}
                                        {tab.toLocaleLowerCase() === "audio" && <Music />}
                                        {tab.toLocaleLowerCase() === "image" && <ImageIcon />}
                                        {tab}
                                    </Button>
                                ))}
                            </div>
                            {filteredMedia.map((media, idx) => (
                                <Button
                                    key={idx}
                                    variant="outline"
                                    className="w-full justify-baseline"
                                >
                                    <div className="flex items-center gap-3">
                                        {media.type === "video" && <Video className="text-red-400 shrink-0" />}
                                        {media.type === "audio" && <Music className="text-yellow-400 shrink-0" />}
                                        {media.type === "image" && <ImageIcon className="text-green-400 shrink-0" />}
                                        <div className="flex-1 min-w-0 flex items-center">
                                            <p className="text-white text-sm truncate">{media.name}</p>
                                            {media.duration && <p className="text-neutral-400 text-xs ml-4">{media.duration}</p>}
                                        </div>
                                    </div>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Background Controls */}
                <div className="border-b">
                    <Button
                        variant="ghost"
                        onClick={() => setExpandedSection(expandedSection === "background" ? null : "background")}
                        className="w-full rounded-none justify-between"
                    >
                        <span className="font-medium">Background</span>
                        <ChevronDown className={`" transition-transform ${expandedSection === "background" ? "rotate-180" : "rotate-0"}`} />
                    </Button>

                    {expandedSection === "background" && (
                        <div className="px-2 py-3 space-y-4 border-t">
                            <Tabs defaultValue="solid_color" className="w-full">
                                <TabsList className=" w-full">
                                    <TabsTrigger value="solid_color"><span className=" w-4 h-4 rounded-full bg-primary" />Solid Color</TabsTrigger>
                                    <TabsTrigger value="gradients"><span className=" w-4 h-4 rounded-full bg-linear-to-r from-background to-primary" />Gradients</TabsTrigger>
                                </TabsList>
                                <TabsContent value="solid_color">
                                    {/* Solid Colors */}
                                    <div className="grid grid-cols-4 gap-2 my-4">
                                        {["#000000", "#FFFFFF", "#DC143C", "#00FF9C", "#071952", "#F8FAB4", "#F875AA", "#4ED7F1"].map(
                                            (color) => (
                                                <Button
                                                    key={color}
                                                    onClick={() => {
                                                        onUpdateBackground(color);
                                                        onUpdateGradient({ enabled: false })
                                                    }}
                                                    className="w-full hover:scale-105"
                                                    style={{ backgroundColor: color }}
                                                    title={color}
                                                />
                                            ),
                                        )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="gradients">
                                    <GradientPicker gradientColor={state.backgroundGradient} onUpdateGradient={onUpdateGradient} />
                                </TabsContent>
                            </Tabs>

                            <Separator />

                            {/* Padding */}
                            <div>
                                <label className="text-neutral-400 text-xs font-medium">Padding: {state.padding}px</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="150"
                                    value={state.padding}
                                    onChange={(e) => onUpdatePadding(Number.parseInt(e.target.value))}
                                    className="w-full h-1 rounded cursor-pointer accent-primary"
                                />
                            </div>

                            {/* Border Radius */}
                            <div>
                                <label className="text-neutral-400 text-xs font-medium">Border Radius: {state.borderRadius}px</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={state.borderRadius}
                                    onChange={(e) => onUpdateBorderRadius(Number.parseInt(e.target.value))}
                                    className="w-full h-1 rounded cursor-pointer accent-primary"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Transitions */}
                <div className="border-b">
                    <Button
                        variant="ghost"
                        onClick={() => setExpandedSection(expandedSection === "transitions" ? null : "transitions")}
                        className="w-full rounded-none justify-between"
                    >
                        <span className="font-medium">Transitions</span>
                        <ChevronDown className={`" transition-transform ${expandedSection === "transitions" ? "rotate-180" : "rotate-0"}`} />
                    </Button>

                    {expandedSection === "transitions" && (
                        <div className="px-4 py-3 space-y-3 border-t border-neutral-800">
                            <div className="grid grid-cols-2 gap-2">
                                {["fade", "slideLeft", "slideRight", "zoomIn", "zoomOut", "dissolve", "wipeDown", "wipeUp"].map(
                                    (transition) => (
                                        <button
                                            key={transition}
                                            onClick={() => onUpdateTransition(transition)}
                                            className={`px-3 py-2 rounded text-sm transition ${state.transition === transition
                                                ? "bg-blue-600 text-white"
                                                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                                }`}
                                        >
                                            {transition.replace(/([A-Z])/g, " $1").trim()}
                                        </button>
                                    ),
                                )}
                            </div>

                            <div>
                                <label className="text-neutral-400 text-xs font-medium">Duration: {state.transitionDuration}s</label>
                                <input
                                    type="range"
                                    min="0.2"
                                    max="3"
                                    step="0.1"
                                    value={state.transitionDuration}
                                    onChange={(e) => onUpdateTransitionDuration(Number.parseFloat(e.target.value))}
                                    className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
