import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { getUserMediaPermissions } from "@/lib/utils";
import { ArrowRight, Pen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LuCircleDashed } from "react-icons/lu";
import { MdBlurOff, MdBlurOn } from "react-icons/md";
import { TbSquareRounded } from "react-icons/tb";

export default function Camera() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullRoundedCam, setIsFullRoundedCam] = useState(true);

  const [isBlurOn, setIsBlurOn] = useState(false);
  const [blurType, setBlurType] = useState<"BlurElement" | "RemoveBlur">(
    "BlurElement"
  );

  const [isDrawOn, setIsDrawOn] = useState(false);
  const [drawType, setDrawType] = useState<"Pen" | "Arrow">("Pen");

  // --- 1. Handle Camera Streaming ---
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        await getUserMediaPermissions();
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    };
    startCamera();
    return () => stopCamera();
  }, []);

  // --- 2. Handle Blur/Hover Highlighting Logic ---
  useEffect(() => {
    if (!isBlurOn) return;

    let lastElement: HTMLElement | null = null;
    let originalOutline = "";

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Prevent highlighting the camera widget itself or the body/html
      if (
        wrapperRef.current?.contains(target) ||
        target.tagName === "BODY" ||
        target.tagName === "HTML"
      ) {
        return;
      }

      // Restore the previous element's style before highlighting new one
      if (lastElement && lastElement !== target) {
        lastElement.style.outline = originalOutline;
      }

      // Save current state
      lastElement = target;
      originalOutline = target.style.outline;

      // Apply Green Border
      target.style.outline = "2px solid oklch(0.7227 0.1920 149.5793)";

      console.log("Hovered Element:", target);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Clean up style when leaving the element
      if (target === lastElement) {
        target.style.outline = originalOutline;
        lastElement = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Don't blur the camera widget
      if (target.tagName.toUpperCase() === "WXT-CAM-VIEW") return;
      if (target.closest(".recorder-zero")) {
        return;
      }

      if (wrapperRef.current && wrapperRef.current.contains(target as Node)) {
        return;
      }

      // Prevent the website's default action
      e.preventDefault();
      e.stopPropagation();

      // Apply or Remove Blur based on blurType state
      if (blurType === "BlurElement") {
        target.style.filter = "blur(12px)";
        target.dataset.recorderBlur = "true";
      } else {
        target.style.filter = "none";
        delete target.dataset.recorderBlur;
      }

      console.log(`Action: ${blurType} on`, target);
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);

    document.addEventListener("click", handleClick, true);

    return () => {
      if (lastElement) {
        lastElement.style.outline = originalOutline;
      }
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isBlurOn, blurType]);

  // --- 3. Handle Dragging ---
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleMouseDown = (e: MouseEvent) => {
      // Prevent drag if clicking buttons inside the widget
      if ((e.target as HTMLElement).closest("button")) return;

      setIsDragging(true);
      const rect = wrapper.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      wrapper.style.transition = "none";
      wrapper.style.cursor = "grabbing";
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !wrapper) return;
      e.preventDefault();
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      wrapper.style.left = `${newX}px`;
      wrapper.style.top = `${newY}px`;
      wrapper.style.right = "auto";
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      wrapper.style.cursor = "grab";
    };

    wrapper.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      wrapper.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, offset]);

  function changeGlurType() {
    if (!isBlurOn) {
      setIsBlurOn(true);
      setIsDrawOn(false);
    } else if (isBlurOn && blurType === "BlurElement") {
      setBlurType("RemoveBlur");
    } else if (isBlurOn && blurType === "RemoveBlur") {
      setBlurType("BlurElement");
    }
  }

  function changeDrawType() {
    if (!isDrawOn) {
      setIsBlurOn(false);
      setIsDrawOn(true);
    } else if (isDrawOn && drawType === "Pen") {
      setDrawType("Arrow");
    } else if (isDrawOn && drawType === "Arrow") {
      setDrawType("Pen");
    }
  }

  return (
    <div
      ref={wrapperRef}
      className="recorder-zero dark pointer-events-auto fixed top-4 right-4 z-999999 w-fit h-fit cursor-grab group font-sans"
    >
      <div
        className={
          (isFullRoundedCam ? "rounded-full" : " rounded-xl") +
          ` recorder-zero w-48 h-48 overflow-hidden border-2 border-primary p-0 m-0 pointer-events-auto flex place-content-center bg-black`
        }
        style={{
          background:
            "linear-gradient(135deg,rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          controls={false}
          style={{
            margin: "0px",
            padding: "0px",
            height: "100%",
            width: "100%",
            objectFit: "cover",
            pointerEvents: "none",
            border: "none",
            transform: "scaleX(-1)",
          }}
        />
      </div>

      {/* Control Bar */}
      <div className="recorder-zero mt-1 border transition-all h-0 p-0 opacity-0 group-hover:h-full group-hover:p-1 group-hover:opacity-100 relative w-full bg-background rounded-full shadow flex justify-between items-center gap-2 overflow-hidden">
        <Button
          title="change cam's shape"
          size="icon-sm"
          variant="secondary"
          className="rounded-full w-8 h-8 recorder-zero"
          onClick={() => setIsFullRoundedCam((pre) => !pre)}
        >
          {isFullRoundedCam ? <TbSquareRounded /> : <LuCircleDashed />}
        </Button>

        <ButtonGroup>
          <Button
            title="Blur element"
            size="icon-sm"
            variant={isBlurOn ? "secondary" : "default"}
            className="rounded-full recorder-zero"
            onClick={changeGlurType}
          >
            {blurType === "BlurElement" ? <MdBlurOn /> : <MdBlurOff />}
          </Button>
          {isBlurOn && (
            <Button
              title="Stop Blurring"
              size="icon-sm"
              variant="destructive"
              className="rounded-full recorder-zero"
              onClick={() => setIsBlurOn(false)}
            >
              <X />
            </Button>
          )}
        </ButtonGroup>

        <ButtonGroup>
          <Button
            title="Draw"
            size="icon-sm"
            variant={isDrawOn ? "secondary" : "default"}
            className="rounded-full recorder-zero"
            onClick={changeDrawType}
          >
            {drawType === "Pen" ? (
              <Pen className="w-4 h-4" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>
          {isDrawOn && (
            <Button
              title="Stop Drawing"
              size="icon-sm"
              variant="destructive"
              className="rounded-full recorder-zero"
              onClick={() => setIsDrawOn(false)}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </ButtonGroup>
      </div>
    </div>
  );
}
