import { Clock, Crop, ExternalLink, Hash, Info, Pen, Volume2, VolumeOff } from "lucide-react";
import { Separator } from "../ui/separator";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { deformatTime, formatTime } from "@/lib/utils";
import { CgArrowTopRight } from "react-icons/cg";
import { IoColorPalette } from "react-icons/io5";
import { FcTimeline } from "react-icons/fc";
import { ImFilm } from "react-icons/im";
import { toast } from "sonner";
import { VideoUpdateProps } from "@/hooks/use-video-editor";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";

function VideoClipDetailEditer({
  state,
  clipUpdate,
  selectedClipId,
}: {
  state: VideoEditorState;
  clipUpdate: ({ id, changeData }: VideoUpdateProps) => void;
  selectedClipId: string;
}) {
    const [selectedVideoClip, setSelectedVideoClip] = useState<null | VideoTimeLineClip>(null)
  const [editableFields, setEditableFields] = useState({
    name: "",
    startTime: "",
    cropStart: "",
    cropEnd: "",
    color: "#000000",
  })

  useEffect(() => {
    const vc = state.videos.find((a) => a.id === selectedClipId)
    if (vc) {
      setSelectedVideoClip(vc)
      setEditableFields({
        name: vc.name,
        startTime: formatTime(vc.startTime),
        cropStart: formatTime(vc.clipedVideoStartTime),
        cropEnd: formatTime(vc.clipedVideoEndTime),
        color: vc.timeLineColor,
      })
    }
  }, [selectedClipId, state])

  if (!selectedVideoClip) {
    return <div className="h-24 animate-pulse bg-muted/50 m-4 rounded-lg" />
  }

  const handleNameUpdate = () => {
    if (editableFields.name.trim().length < 1) return
    clipUpdate({
      id: selectedVideoClip.id,
      changeData: { name: editableFields.name },
    })
    toast.success("Clip name updated")
  }

  const handleColorUpdate = (color: string) => {
    setEditableFields((prev) => ({ ...prev, color }))
    clipUpdate({
      id: selectedVideoClip.id,
      changeData: { timeLineColor: color },
    })
  }

  const handleTimeUpdate = (type: "startTime" | "cropStart" | "cropEnd") => {
    const value = editableFields[type]
    const seconds = deformatTime(value)

    if (seconds === null) {
      toast.error("Invalid time format (MM:SS.MS)")
      return
    }

    let changeData: Partial<VideoTimeLineClip> = {}

    if (type === "startTime") {
      changeData = { startTime: seconds }
    } else if (type === "cropStart") {
      changeData = { clipedVideoStartTime: seconds }
    } else if (type === "cropEnd") {
      if (seconds <= selectedVideoClip.clipedVideoStartTime) {
        toast.error("End time must be after start time")
        return
      }
      changeData = { clipedVideoEndTime: seconds }
    }

    clipUpdate({ id: selectedVideoClip.id, changeData })
    toast.success("Time updated")
  }

  return (
    <div className="flex flex-col h-full text-foreground border rounded-md">
      <div className="p-4 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between group">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: selectedVideoClip.timeLineColor + "20" }}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedVideoClip.timeLineColor }} />
            </div>
            <div>
              <h2 className="text-sm font-medium leading-none truncate max-w-[140px]">{selectedVideoClip.name}</h2>
              <p className="text-[10px] text-muted-foreground font-mono mt-1 line-clamp-1">
                ID: {selectedVideoClip.id}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <a href={selectedVideoClip.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        <Separator className="bg-border/50" />

        {/* General Settings */}
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <Label htmlFor="clip-name" className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              Clip Name
            </Label>
            <div className="relative">
              <Input
                id="clip-name"
                value={editableFields.name}
                onChange={(e) => setEditableFields((prev) => ({ ...prev, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleNameUpdate()}
                className="bg-muted/30 border-border/50 focus:border-primary/50 transition-colors h-9 pr-8"
              />
              <Pen className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              Timeline Color
            </Label>
            <div className="flex items-center gap-2 bg-muted/30 border border-border/50 p-1.5">
              <div className="relative w-8 h-8 border border-border/50 overflow-hidden shrink-0">
                <input
                  type="color"
                  value={editableFields.color}
                  onChange={(e) => handleColorUpdate(e.target.value)}
                  className="absolute inset-0 w-[150%] h-[150%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                />
              </div>
              <code className="text-xs font-mono text-muted-foreground grow px-2 uppercase">
                {editableFields.color}
              </code>
              <IoColorPalette className="h-4 w-4 text-muted-foreground/50 mr-1" />
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Audio Section */}
        <div className="space-y-3">
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">Audio Control</Label>
          <Button
            variant="secondary"
            className="w-full justify-start gap-3 h-10 bg-muted/40 hover:bg-muted/60 border-border/50"
            onClick={() => clipUpdate({ id: selectedVideoClip.id, changeData: { muted: !selectedVideoClip.muted } })}
          >
            {selectedVideoClip.muted ? (
              <VolumeOff className="h-4 w-4 text-destructive" />
            ) : (
              <Volume2 className="h-4 w-4 text-primary" />
            )}
            <span className="text-sm font-medium">{selectedVideoClip.muted ? "Audio Muted" : "Audio Active"}</span>
          </Button>
        </div>

        <Separator className="bg-border/50" />

        {/* Timeline Position */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Timeline Position</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="start-pos" className="text-[10px] text-muted-foreground">
              Start Timestamp
            </Label>
            <div className="relative">
              <Input
                id="start-pos"
                value={editableFields.startTime}
                onChange={(e) => setEditableFields((prev) => ({ ...prev, startTime: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleTimeUpdate("startTime")}
                className="bg-muted/30 border-border/50 h-9 font-mono text-xs"
              />
              <Badge
                variant="outline"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-5 text-xs rounded-md bg-background"
              >
                MIN
              </Badge>
            </div>
          </div>
        </div>

        <Separator className="bg-border/50" />

        {/* Trimming/Cropping Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crop className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider">Source Trimming</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="crop-start" className="text-[10px] text-muted-foreground">
                In Point
              </Label>
              <Input
                id="crop-start"
                value={editableFields.cropStart}
                onChange={(e) => setEditableFields((prev) => ({ ...prev, cropStart: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleTimeUpdate("cropStart")}
                className="bg-muted/30 border-border/50 h-9 font-mono text-xs"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="crop-end" className="text-[10px] text-muted-foreground">
                Out Point
              </Label>
              <Input
                id="crop-end"
                value={editableFields.cropEnd}
                onChange={(e) => setEditableFields((prev) => ({ ...prev, cropEnd: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && handleTimeUpdate("cropEnd")}
                className="bg-muted/30 border-border/50 h-9 font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/10 rounded-md">
            <Info className="h-3 w-3 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-tight">
              Total source duration:{" "}
              <span className="text-foreground font-mono">{formatTime(selectedVideoClip.maxTime)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-auto p-4 bg-muted/20 border-t border-border/50">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
          <Hash className="h-3 w-3" />
          Meta Information
        </div>
        <div className="mt-2 grid grid-cols-2 gap-y-1 text-[10px]">
          <span className="text-muted-foreground">Format</span>
          <span className="text-foreground text-right">{selectedVideoClip.type}</span>
        </div>
      </div>
    </div>
  );
}

export default VideoClipDetailEditer;
