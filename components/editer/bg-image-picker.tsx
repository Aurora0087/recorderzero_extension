import * as React from "react";
import { Link, AlertCircle, Upload, Globe } from "lucide-react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface BgImagePickerProps {
  onImageUpdate: (imageUrl: string) => void;
}

export default function BgImagePicker({ onImageUpdate }: BgImagePickerProps) {
  const [url, setUrl] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [imageSrc, setImageSrc] = React.useState<string | null>(null);
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = React.useState<Area | null>(
    null
  );
  const [isProcessing, setIsProcessing] = React.useState(false);

  const validateImageUrl = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl, { method: "HEAD" });
      const contentType = response.headers.get("content-type");

      if (!contentType?.startsWith("image/")) {
        throw new Error("Not a valid image URL");
      }

      if (contentType === "image/gif") {
        throw new Error("GIFs are not allowed");
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid image URL");
      return false;
    }
  };

  const handleUrlSubmit = async () => {
    setError(null);
    if (!url) return;

    const isValid = await validateImageUrl(url);
    if (isValid) {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setImageSrc(url);
      setIsDialogOpen(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "image/gif") {
      setError("GIFs are not allowed");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setImageSrc(reader.result as string);
      setIsDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);

    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageSrc;

      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) throw new Error("Could not get canvas context");

      canvas.width = 1920;
      canvas.height = 1080;

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        1920,
        1080
      );

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resultUrl = URL.createObjectURL(blob);
            onImageUpdate(resultUrl);
            setIsDialogOpen(false);
            setImageSrc(null);
            setUrl("");
          }
          setIsProcessing(false);
        },
        "image/jpeg",
        1
      );
    } catch (err) {
      console.error("Error cropping image:", err);
      setError("Failed to process image");
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="grid gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium tracking-wider text-muted-foreground">
            <Globe className="size-4 text-primary" />
            <span>Paste image URL</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/image.jpg"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button variant="default" size="icon" onClick={handleUrlSubmit}>
              <Link className="size-4" />
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background text-muted-foreground px-2">Or</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium tracking-wider text-muted-foreground">
            <Upload className="size-4 text-primary" />
            <span>Upload from computer</span>
          </div>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-3 text-sm font-medium">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        { /* showZoomInAnimation for "https://github.com/ValentinH/react-easy-crop/issues/428" */}
        <DialogContent showZoomInAnimation={false} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop & Resize Image</DialogTitle>
            <DialogDescription>
              Drag to move and use the slider to zoom. Final image will be
              1920x1080.
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-[400px] w-full overflow-hidden bg-background">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1920 / 1080}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Zoom Level</span>
                <span className="text-muted-foreground text-xs">
                  {zoom.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={5}
                step={0.1}
                className="h-1"
                onValueChange={([val]) => setZoom(val)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isProcessing}
              className="min-w-[120px]"
            >
              {isProcessing ? "Processing..." : "Save Background"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
