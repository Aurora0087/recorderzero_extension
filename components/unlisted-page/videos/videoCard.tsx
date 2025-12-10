import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  MoreHorizontalIcon,
  Edit3Icon,
  PencilIcon,
  TrashIcon,
  AlertTriangleIcon,
  Download,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { deleteVideoAndChank, updateVideoName } from "@/db/querys";

function VideoCard({
  video,
  reLoadFun,
}: {
  video: {
    preview: string | null;
    id: string;
    name: string;
    createdAt: Date;
  };
  reLoadFun: () => void;
}) {
  const [playVideo, setPlayVideo] = useState(false);
  const [showNewNameDialog, setShowNewNameDialog] = useState(false);
  const [showDeleteSureDialog, setShowDeleteSureDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<
    "mp4" | "webm" | "mov" | "gif"
  >("mp4");
  const [isDownloading, setIsDownloading] = useState(false);
  const [newName, setNewName] = useState(video.name);

  const videoRef = useRef<HTMLVideoElement>(null);

  async function renameVideo(newName: string) {
    if (newName.trim()) {
      const res = await updateVideoName({ vid: video.id, newName });
      if (res.status === 200) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }

      setShowNewNameDialog(false);
      reLoadFun();
    }
  }

  async function deleteVideo() {
    const res = await deleteVideoAndChank({ vId: video.id });
    if (res.status === 200) {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
    setShowDeleteSureDialog(false);
    reLoadFun();
  }

  function downloadVideo(format: "mp4" | "webm" | "mov" | "gif") {
    setIsDownloading(true);
    // Simulate download
    setTimeout(() => {
      toast.success(`Downloaded ${video.name} as ${format.toUpperCase()}`);
      setShowDownloadDialog(false);
      setIsDownloading(false);
    }, 1000);
  }

  function gotoEditPage() {
    const videoEditerPath = browser.runtime.getURL(
      `/video-edited.html?vi=${video.id}`
    );
    window.open(videoEditerPath, "_self");
  }

  useEffect(() => {
    return () => {
      if (video.preview) {
        URL.revokeObjectURL(video.preview);
      }
    };
  }, [video.preview]);

  // Control video playback
  useEffect(() => {
    if (videoRef.current) {
      if (playVideo) {
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset to start
      }
    }
  }, [playVideo]);

  return (
    <>
      <Card
        onMouseEnter={() => setPlayVideo(true)}
        onMouseLeave={() => setPlayVideo(false)}
        onClick={() => gotoEditPage()}
        className="h-fit w-full overflow-hidden pt-0 pb-4 group hover:bg-accent/10 cursor-pointer gap-2 border border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg"
      >
        <div className="aspect-video overflow-hidden grid place-content-center bg-muted/50">
          {video.preview ? (
            <video
              ref={videoRef}
              src={video.preview}
              className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
              muted
              loop
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-3xl mb-2">📹</div>
                <p className="text-sm">No preview available</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 flex justify-between w-full gap-2 items-start">
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-lg line-clamp-1 text-foreground">
              {video.name}
            </CardTitle>
            <span className="text-xs opacity-60 font-medium">
              {video.createdAt.toDateString()}
            </span>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Open menu"
                  size="icon"
                  className="rounded-full h-8 w-8 hover:bg-secondary/80 transition-colors"
                >
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Video Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => gotoEditPage()}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit3Icon className="h-4 w-4" />
                  <span>Edit Video</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowNewNameDialog(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Rename Video</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setShowDownloadDialog(true)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Video</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteSureDialog(true)}
                  className="flex items-center gap-2 cursor-pointer text-destructive hover:text-destructive"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      <Dialog open={showNewNameDialog} onOpenChange={setShowNewNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <PencilIcon className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>Rename Video</DialogTitle>
            </div>
            <DialogDescription>
              Enter a new name for your video
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Enter new video name..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renameVideo(newName);
                }
              }}
              className="col-span-3"
            />
          </div>
          <DialogFooter className="gap-2 flex-row">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => renameVideo(newName)}
              className="bg-primary hover:bg-primary/90"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showDeleteSureDialog}
        onOpenChange={setShowDeleteSureDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              </div>
              <DialogTitle>Delete Video</DialogTitle>
            </div>
            <DialogDescription>
              Are you sure you want to delete this video? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 my-4">
            <p className="text-sm font-medium text-destructive">
              🎬 "{video.name}" will be permanently deleted
            </p>
          </div>
          <DialogFooter className="gap-2 flex-row">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => deleteVideo()}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDownloadDialog} onOpenChange={setShowDownloadDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle>Download Video</DialogTitle>
            </div>
            <DialogDescription>
              Choose a format to download your video
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {["mp4", "webm", "mov", "gif"].map((format) => (
              <button
                key={format}
                onClick={() =>
                  setSelectedFormat(format as "mp4" | "webm" | "mov" | "gif")
                }
                className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer font-medium ${
                  selectedFormat === format
                    ? "border-primary bg-primary/10"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold uppercase">
                      {format}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format === "mp4" && "Best compatibility"}
                      {format === "webm" && "Web optimized"}
                      {format === "mov" && "Apple compatible"}
                      {format === "gif" && "Animated GIF"}
                    </div>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      selectedFormat === format
                        ? "border-secondary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {selectedFormat === format && (
                      <div className="h-2 w-2 bg-secondary rounded-full"></div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter className="gap-2 flex-row">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() => downloadVideo(selectedFormat)}
              disabled={isDownloading}
            >
              {isDownloading ? "Downloading..." : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VideoCard;
