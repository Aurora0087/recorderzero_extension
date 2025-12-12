import {
  Upload,
  Video,
  Music,
  ImageIcon,
  ChevronDown,
  Download,
  Save,
  Image,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { GradientPicker } from "./gradient-picker";
import VideoClipDetailEditer from "./VideoClipDetailEditer";
import { VideoUpdateProps } from "@/hooks/use-video-editor";

interface MediaFile {
  name: string;
  type: "video" | "audio" | "image";
  file?: File;
  duration?: number;
}

interface RightMediaPanelProps {
  mediaFiles: MediaFile[];
  onMediaSelect: (file: File) => void;
  onUpdateBackground: (color: string) => void;
  onUpdateGradient: (
    gradient: Partial<{
      enabled: boolean;
      stops: { color: string; position: number }[];
      angle: number;
    }>
  ) => void;
  onExport: () => void;
  isProcessing: boolean;
  onUpdatePadding: (padding: number) => void;
  onUpdateBorderRadius: (radius: number) => void;
  onUpdateTransition: (transition: string) => void;
  onUpdateTransitionDuration: (duration: number) => void;
  selectedVideoId:string|null;
  state: VideoEditorState;
  clipUpdate:({ id, changeData }: VideoUpdateProps) => void
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
  isProcessing,
  onExport,
  selectedVideoId,
  clipUpdate
}: RightMediaPanelProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(
    null
  );

  const gradientPresets = [
    { name: "Mono", start: "#000000", end: "#ffffff" },
    { name: "Sunset", start: "#FF6B6B", end: "#FFA500" },
    { name: "Ocean", start: "#2196F3", end: "#1565C0" },
    { name: "Forest", start: "#4CAF50", end: "#1B5E20" },
    { name: "Purple", start: "#9C27B0", end: "#4A148C" },
  ];

  return (
    <div className="w-96 border m-1 ml-0 flex flex-col overflow-hidden bg-card rounded-md">
      {/* Header */}
      <div className="px-4 py-4 border-b grid grid-cols-2 justify-center items-center gap-2">
        <Button className=" w-full" variant="outline">
            <Save/>
          Save Locally
        </Button>
        <Button className=" w-full" onClick={onExport} disabled={isProcessing}>
          <Download />
          Export
        </Button>
      </div>

      {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scroll-area">

        {/* Background Controls */}
        <div className="border-b">
          <Button
            variant="ghost"
            onClick={() =>
              setExpandedSection(
                expandedSection === "background" ? null : "background"
              )
            }
            className="w-full rounded-none justify-between"
          >
            <span className="font-medium">Background</span>
            <ChevronDown
              className={`" transition-transform ${
                expandedSection === "background" ? "rotate-180" : "rotate-0"
              }`}
            />
          </Button>

          {expandedSection === "background" && (
            <div className="px-2 py-3 space-y-4 border-t">
              <Tabs defaultValue="solid_color" className="w-full">
                <TabsList className=" w-full flex flex-wrap">
                  <TabsTrigger value="solid_color">
                    <span className=" w-4 h-4 rounded-full bg-primary" />
                    Solid Color
                  </TabsTrigger>
                  <TabsTrigger value="gradients">
                    <span className=" w-4 h-4 rounded-full bg-linear-to-r from-background to-primary" />
                    Gradients
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <Image className=" w-4 h-4 text-primary"/>
                    Image
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="solid_color">
                  {/* Solid Colors */}
                  <div className="grid grid-cols-4 gap-2 p-4 border rounded-md">
                    {[
                      "#000000",
                      "#FFFFFF",
                      "#DC143C",
                      "#00FF9C",
                      "#071952",
                      "#F8FAB4",
                      "#F875AA",
                      "#4ED7F1",
                    ].map((color) => (
                      <Button
                        key={color}
                        onClick={() => {
                          onUpdateBackground(color);
                          onUpdateGradient({ enabled: false });
                        }}
                        className="w-full hover:scale-105"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="gradients">
                  <GradientPicker
                    gradientColor={state.backgroundGradient}
                    onUpdateGradient={onUpdateGradient}
                  />
                </TabsContent>
                <TabsContent value="image">
                  <div className="p-4 border rounded-md">
                    Coming soon
                  </div>
                </TabsContent>
              </Tabs>

              <Separator />

              {/* Padding */}
              <div>
                <label className="text-neutral-400 text-xs font-medium">
                  Padding: {state.padding}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={state.padding}
                  onChange={(e) =>
                    onUpdatePadding(Number.parseInt(e.target.value))
                  }
                  className="w-full h-1 rounded cursor-pointer accent-primary"
                />
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-neutral-400 text-xs font-medium">
                  Border Radius: {state.borderRadius}px
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.borderRadius}
                  onChange={(e) =>
                    onUpdateBorderRadius(Number.parseInt(e.target.value))
                  }
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
            onClick={() =>
              setExpandedSection(
                expandedSection === "transitions" ? null : "transitions"
              )
            }
            className="w-full rounded-none justify-between"
          >
            <span className="font-medium">Transitions</span>
            <ChevronDown
              className={`" transition-transform ${
                expandedSection === "transitions" ? "rotate-180" : "rotate-0"
              }`}
            />
          </Button>

          {expandedSection === "transitions" && (
            <div className="px-4 py-3 space-y-3 border-t border-neutral-800">
              <div className="grid grid-cols-2 gap-2">
                {[
                  "fade",
                  "slideLeft",
                  "slideRight",
                  "zoomIn",
                  "zoomOut",
                  "dissolve",
                  "wipeDown",
                  "wipeUp",
                ].map((transition) => (
                  <button
                    key={transition}
                    onClick={() => onUpdateTransition(transition)}
                    className={`px-3 py-2 rounded text-sm transition ${
                      state.transition === transition
                        ? "bg-blue-600 text-white"
                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                    }`}
                  >
                    {transition.replace(/([A-Z])/g, " $1").trim()}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-neutral-400 text-xs font-medium">
                  Duration: {state.transitionDuration}s
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="3"
                  step="0.1"
                  value={state.transitionDuration}
                  onChange={(e) =>
                    onUpdateTransitionDuration(
                      Number.parseFloat(e.target.value)
                    )
                  }
                  className="w-full h-1 bg-neutral-700 rounded appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          )}
        </div>
        {/* clip modifier */}
        {
            selectedVideoId && state.videos.length>0 &&(
                <VideoClipDetailEditer selectedClipId={selectedVideoId} state={state} clipUpdate={clipUpdate}/>
            )
        }
      </div>
      
    </div>
  );
}
