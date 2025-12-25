import { Download, Save, Image, Paintbrush, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { GradientPicker } from "./gradient-picker";
import VideoClipDetailEditer from "./VideoClipDetailEditer";
import { VideoUpdateProps } from "@/hooks/use-video-editor";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TbBackground } from "react-icons/tb";
import { RxCorners, RxPadding } from "react-icons/rx";
import { MdAnimation, MdDataObject } from "react-icons/md";
import { Input } from "../ui/input";

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
  selectedVideoId: string | null;
  state: VideoEditorState;
  clipUpdate: ({ id, changeData }: VideoUpdateProps) => void;
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
  clipUpdate,
}: RightMediaPanelProps) {

  const solidecolorpalade = ["#000000", "#FFFFFF", "#DC143C", "#00FF9C", "#071952", "#F8FAB4", "#F875AA", "#4ED7F1","#EDFFF0","#FFBBE1","#BADFDB","#D2FF72","#6256CA","#FF6600","#6DE1D2","#706D54"]

  return (
   <div className="flex my-1 w-100 mr-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="border-b border-border/50 bg-linear-to-b from-card to-card/80 p-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            className="h-10 gap-2 font-medium shadow-sm transition-all hover:shadow bg-transparent"
            variant="outline"
          >
            <Save className="h-4 w-4" />
            Save Locally
          </Button>
          <Button
            className="h-10 gap-2 font-medium shadow-sm transition-all hover:shadow"
            onClick={onExport}
            disabled={isProcessing}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <Accordion type="single" collapsible className="space-y-2">
          <AccordionItem
            value="bg"
            className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm transition-shadow hover:shadow"
          >
            <AccordionTrigger className="cursor-pointer px-2 py-1.5 flex items-center hover:no-underline hover:bg-accent/50 transition-colors data-[state=open]:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <TbBackground className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Background</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-4 pt-2">
                <Tabs defaultValue="solid_color" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-muted/50">
                    <TabsTrigger
                      value="solid_color"
                      className="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <span className="h-3 w-3 rounded-full bg-primary" />
                      Solid
                    </TabsTrigger>
                    <TabsTrigger
                      value="gradients"
                      className="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <span className="h-3 w-3 rounded-full bg-linear-to-r from-primary to-background" />
                      Gradient
                    </TabsTrigger>
                    <TabsTrigger
                      value="image"
                      className="gap-2 text-xs data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <ImageIcon className="h-3 w-3" />
                      Image
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="solid_color" className="space-y-4 pt-4">
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Custom Color</p>
                      <div className="flex items-center gap-3">
                        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border-2 border-input shadow-sm transition-all hover:border-ring focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                          <div className="absolute inset-0 z-0 h-full w-full" />
                          <Input
                            type="color"
                            className="absolute -left-[50%] -top-[50%] h-[200%] w-[200%] cursor-pointer border-0 p-0 opacity-0"
                            onChange={(e) => {
                              onUpdateBackground(e.target.value)
                              onUpdateGradient({ enabled: false })
                            }}
                            value={state.backgroundColor}
                          />
                          <div style={{background:state.backgroundColor}} className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <Paintbrush className="h-4 w-4" />
                          </div>
                        </div>

                        <Input
                          placeholder="#000000"
                          className="h-8 font-mono text-sm uppercase shadow-sm"
                          maxLength={7}
                          onChange={(e) => {
                            const val = e.target.value
                            if (/^#[0-9A-F]{6}$/i.test(val)) {
                              onUpdateBackground(val)
                              onUpdateGradient({ enabled: false })
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div className="h-px bg-border" />

                    <div className="space-y-3">
                      <p className="text-xs font-medium text-muted-foreground">Presets</p>
                      <div className="grid grid-cols-4 gap-2">
                        {solidecolorpalade.map(
                          (color) => (
                            <Button
                              key={color}
                              onClick={() => {
                                onUpdateBackground(color)
                                onUpdateGradient({ enabled: false })
                              }}
                              variant="outline"
                              className="h-8 w-full border-2 p-0 shadow-sm transition-all hover:scale-105 hover:border-ring hover:shadow"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="gradients" className="pt-4">
                    <GradientPicker gradientColor={state.backgroundGradient} onUpdateGradient={onUpdateGradient} />
                  </TabsContent>

                  <TabsContent value="image" className="pt-4">
                    <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 p-8 text-center">
                      <p className="text-sm text-muted-foreground">Coming soon</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="padding-radius"
            className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm transition-shadow hover:shadow"
          >
            <AccordionTrigger className="cursor-pointer px-2 py-1.5 flex items-center hover:no-underline hover:bg-accent/50 transition-colors data-[state=open]:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <RxCorners className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Padding & Radius</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-5 px-4 pb-4 pt-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Padding</label>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {state.padding}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={state.padding}
                  onChange={(e) => onUpdatePadding(Number.parseInt(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Border Radius</label>
                  <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {state.borderRadius}px
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.borderRadius}
                  onChange={(e) => onUpdateBorderRadius(Number.parseInt(e.target.value))}
                  className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="transitions"
            className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm transition-shadow hover:shadow"
          >
            <AccordionTrigger className="cursor-pointer px-2 py-1.5 flex items-center hover:no-underline hover:bg-accent/50 transition-colors data-[state=open]:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <MdAnimation className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Transitions</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-2">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {["fade", "slideLeft", "slideRight", "zoomIn", "zoomOut", "dissolve", "wipeDown", "wipeUp"].map(
                    (transition) => (
                      <Button
                        key={transition}
                        onClick={() => onUpdateTransition(transition)}
                        variant={state.transition === transition ? "default" : "outline"}
                        className="h-10 text-sm font-medium shadow-sm transition-all hover:scale-[1.02] hover:shadow"
                      >
                        {transition.replace(/([A-Z])/g, " $1").trim()}
                      </Button>
                    ),
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-muted-foreground">Duration</label>
                    <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                      {state.transitionDuration}s
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="3"
                    step="0.1"
                    value={state.transitionDuration}
                    onChange={(e) => onUpdateTransitionDuration(Number.parseFloat(e.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-secondary accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem
            value="selected-clip"
            className="overflow-hidden rounded-lg border border-border/50 bg-card shadow-sm transition-shadow hover:shadow"
          >
            <AccordionTrigger className=" cursor-pointer px-2 py-1.5 flex items-center hover:no-underline hover:bg-accent/50 transition-colors data-[state=open]:bg-accent/30">
              <div className="flex items-center gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <MdDataObject className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold">Selected Clip</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 py-2">
              {selectedVideoId && state.videos.length > 0 ? (
                <VideoClipDetailEditer selectedClipId={selectedVideoId} state={state} clipUpdate={clipUpdate} />
              ) : (
                <div className="rounded-lg border border-dashed border-border/50 bg-muted/30 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No clip selected</p>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
