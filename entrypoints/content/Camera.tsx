import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  getCamPositionOnPage,
  getIsFullRoundedCam,
  getRandomColor,
  getUserMediaPermissions,
  setCamPositionOnPage,
  setIsFullRoundedCamLocaly,
} from "@/lib/utils";
import { ArrowRight, Eraser, Pen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IoColorFill } from "react-icons/io5";
import { LuCircleDashed } from "react-icons/lu";
import { MdBlurOff, MdBlurOn } from "react-icons/md";
import { TbSquareRounded } from "react-icons/tb";

type DrawingObject = {
  id: number;
  type: "Pen" | "Arrow";
  color: string;
  path: { x: number; y: number }[];
};

export default function Camera() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ref to store all drawings without triggering re-renders constantly
  // We use a Ref because event listeners need instant access to the latest data
  const drawingsRef = useRef<DrawingObject[]>([]);

  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullRoundedCam, setIsFullRoundedCam] = useState(true);

  const [isBlurOn, setIsBlurOn] = useState(false);
  const [blurType, setBlurType] = useState<"BlurElement" | "RemoveBlur">(
    "BlurElement"
  );

  const [isDrawOn, setIsDrawOn] = useState(false);
  const [drawType, setDrawType] = useState<"Pen" | "Arrow" | "Eraser">("Pen");
  const [drawingColor, setDrawingColor] = useState("#8CE4FF");

  const [isRecording, setIsRecording] = useState(false);

  // --- Helper: Math for Hit Detection ---
  // Calculates distance from a point (p) to a line segment (v, w)
  function distanceToSegment(
    p: { x: number; y: number },
    v: { x: number; y: number },
    w: { x: number; y: number }
  ) {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(
      p.x - (v.x + t * (w.x - v.x)),
      p.y - (v.y + t * (w.y - v.y))
    );
  }

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
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.error("Camera denied:", err);
      }
    };
    function stopCamera() {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    }

    async function setCamPositionBasedOnStoredData() {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const positions = await getCamPositionOnPage();
      wrapper.style.left = `${positions.x}px`;
      wrapper.style.top = `${positions.y}px`;
      wrapper.style.right = "auto";
      const isRounded = await getIsFullRoundedCam();
      setIsFullRoundedCam(isRounded);
    }
    setCamPositionBasedOnStoredData();
    startCamera();
    storage.watch<boolean>("local:isRecording", (newV, oldV) => {
      setIsRecording(newV || false);
    });
    return () => {
      stopCamera();
      storage.unwatch();
    };
  }, []);

  // --- 2. Handle Blur Logic ---
  useEffect(() => {
    if (!isBlurOn) return;
    let lastElement: HTMLElement | null = null;
    let originalOutline = "";

    function handleMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        wrapperRef.current?.contains(target) ||
        target.tagName === "BODY" ||
        target.tagName === "HTML"
      )
        return;
      if (lastElement && lastElement !== target)
        lastElement.style.outline = originalOutline;
      lastElement = target;
      originalOutline = target.style.outline;
      target.style.outline = `2px solid ${drawingColor}`;
    }

    function handleMouseOut(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target === lastElement) {
        target.style.outline = originalOutline;
        lastElement = null;
      }
    }

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName.toUpperCase() === "WXT-CAM-VIEW") return;
      if (
        target.closest(".recorder-zero") ||
        (wrapperRef.current && wrapperRef.current.contains(target as Node))
      )
        return;

      e.preventDefault();
      e.stopPropagation();

      if (blurType === "BlurElement") {
        target.style.filter = "blur(12px)";
        target.dataset.recorderBlur = "true";
      } else {
        target.style.filter = "none";
        delete target.dataset.recorderBlur;
      }
    }

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick, true);

    return () => {
      if (lastElement) lastElement.style.outline = originalOutline;
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseout", handleMouseOut);
      document.removeEventListener("click", handleClick, true);
    };
  }, [isBlurOn, blurType, drawingColor]);

  // --- 3. Handle Drawing & Erasing ---
  useEffect(() => {
    const canvasId = "recorderzero-canvas";
    const wrapperId = "recorderzero-canvas-wrapper";
    let wrapper = document.getElementById(wrapperId) as HTMLDivElement;
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    // Create Canvas if missing
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = wrapperId;
      wrapper.style.cssText = `position: absolute; top: 0; left: 0; z-index: 9999; pointer-events: none; overflow: hidden;`;
      document.body.appendChild(wrapper);

      canvas = document.createElement("canvas");
      canvas.id = canvasId;
      canvas.style.cssText = `width: 100%; height: 100%; display: block;`;
      wrapper.appendChild(canvas);
    }

    // Resize Logic
    const updateDimensions = () => {
      if (!wrapper || !canvas) return;
      const fullWidth = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth
      );
      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.documentElement.clientHeight
      );

      // set new width and height
      wrapper.style.width = `${fullWidth}px`;
      wrapper.style.height = `${fullHeight}px`;

      if (canvas.width !== fullWidth || canvas.height !== fullHeight) {
        canvas.width = fullWidth;
        canvas.height = fullHeight;
        renderAllDrawings();
      }
    };

    const ctx = canvas.getContext("2d");

    // --- RENDER FUNCTION ---
    // Clears canvas and redraws stored objects + current active drawing
    const renderAllDrawings = (
      currentPath?: { x: number; y: number }[],
      currentType?: "Pen" | "Arrow"
    ) => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;

      // 1. Draw stored items
      drawingsRef.current.forEach((item) => {
        ctx.strokeStyle = item.color;
        ctx.beginPath();
        if (item.type === "Pen") {
          if (item.path.length > 0) {
            ctx.moveTo(item.path[0].x, item.path[0].y);
            for (let i = 1; i < item.path.length; i++)
              ctx.lineTo(item.path[i].x, item.path[i].y);
          }
        } else if (item.type === "Arrow") {
          drawArrowShape(
            ctx,
            item.path[0].x,
            item.path[0].y,
            item.path[1].x,
            item.path[1].y
          );
        }
        ctx.stroke();
      });

      // 2. Draw current active item (being dragged)
      if (currentPath && currentType) {
        ctx.strokeStyle = drawingColor;
        ctx.beginPath();
        if (currentType === "Pen") {
          ctx.moveTo(currentPath[0].x, currentPath[0].y);
          for (let i = 1; i < currentPath.length; i++)
            ctx.lineTo(currentPath[i].x, currentPath[i].y);
        } else if (currentType === "Arrow") {
          drawArrowShape(
            ctx,
            currentPath[0].x,
            currentPath[0].y,
            currentPath[1].x,
            currentPath[1].y
          );
        }
        ctx.stroke();
      }
    };

    // Helper to draw arrow geometry
    const drawArrowShape = (
      context: CanvasRenderingContext2D,
      fromX: number,
      fromY: number,
      toX: number,
      toY: number
    ) => {
      const headLength = 20;
      const angle = Math.atan2(toY - fromY, toX - fromX);
      context.moveTo(fromX, fromY);
      context.lineTo(toX, toY);

      // Arrow head
      context.lineTo(
        toX - headLength * Math.cos(angle - Math.PI / 6),
        toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      context.moveTo(toX, toY);
      context.lineTo(
        toX - headLength * Math.cos(angle + Math.PI / 6),
        toY - headLength * Math.sin(angle + Math.PI / 6)
      );
    };

    if (!isDrawOn) {
      wrapper.style.pointerEvents = "none";
      return;
    }

    wrapper.style.pointerEvents = "auto";
    wrapper.style.cursor = drawType === "Eraser" ? "crosshair" : "default";

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(document.body);

    // --- Interaction Logic ---
    let isDrawing = false;
    let currentPath: { x: number; y: number }[] = [];

    const getCoords = (e: MouseEvent) => ({ x: e.pageX, y: e.pageY });

    const handleMouseDown = (e: MouseEvent) => {
      const coords = getCoords(e);

      if (drawType === "Eraser") {
        const hitThreshold = 6;

        const hitIndex = drawingsRef.current.findIndex((item) => {
          if (item.type === "Arrow") {
            // Check distance to straight line
            return (
              distanceToSegment(coords, item.path[0], item.path[1]) <
              hitThreshold
            );
          } else {
            // Check distance to any segment in the pen path
            for (let i = 0; i < item.path.length - 1; i++) {
              if (
                distanceToSegment(coords, item.path[i], item.path[i + 1]) <
                hitThreshold
              )
                return true;
            }
            return false;
          }
        });

        if (hitIndex !== -1) {
          // Remove item and redraw
          drawingsRef.current.splice(hitIndex, 1);
          renderAllDrawings();
        }
        return;
      }

      // --- START DRAWING ---
      isDrawing = true;
      currentPath = [coords];
      // For arrow, we need at least start point. End point updates on move.
      if (drawType === "Arrow") currentPath.push(coords);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing) return;
      const coords = getCoords(e);

      if (drawType === "Pen") {
        currentPath.push(coords);
      } else if (drawType === "Arrow") {
        // Update the end point (index 1)
        currentPath[1] = coords;
      }

      // Render stored items + current path
      if (drawType && drawType !== "Eraser") {
        renderAllDrawings(currentPath, drawType);
      }
    };

    const handleMouseUp = () => {
      if (!isDrawing) return;
      isDrawing = false;

      // Save the finished shape
      if (currentPath.length > 1) {
        drawingsRef.current.push({
          id: Date.now(),
          type: drawType as "Pen" | "Arrow",
          color: drawingColor,
          path: currentPath,
        });
      }
      renderAllDrawings();
      currentPath = [];
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    // Initial render in case we toggle visibility
    renderAllDrawings();

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      if (wrapper) wrapper.style.pointerEvents = "none";
    };
  }, [isDrawOn, drawType, drawingColor]);

  // --- 4. Dragging Logic (Unchanged) ---
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function handleMouseDown(e: MouseEvent) {
      if (!wrapper) return;
      if ((e.target as HTMLElement).closest("button")) return;
      setIsDragging(true);
      const rect = wrapper.getBoundingClientRect();
      setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      wrapper.style.transition = "none";
      wrapper.style.cursor = "grabbing";
    }

    function handleMouseMove(e: MouseEvent) {
      if (!isDragging || !wrapper) return;

      e.preventDefault();

      let newX = e.clientX - offset.x;
      let newY = e.clientY - offset.y;

      // Boundaries
      const rect = wrapper.getBoundingClientRect();
      const maxX = window.innerWidth - rect.width;
      const maxY = window.innerHeight - rect.height;

      // Keep inside window
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      wrapper.style.left = `${newX}px`;
      wrapper.style.top = `${newY}px`;
      wrapper.style.right = "auto";
    }

    function handleMouseUp(e: MouseEvent) {
      if (!isDragging || !wrapper) return;
      setIsDragging(false);
      wrapper.style.cursor = "grab";
      const newX = e.clientX - offset.x;
      const newY = e.clientY - offset.y;
      setCamPositionOnPage(newX, newY);
    }

    wrapper.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      wrapper.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, offset]);

  // --- UI Handlers ---

  function changeGlurType() {
    if (!isBlurOn) {
      setIsBlurOn(true);
      setIsDrawOn(false);
    } else if (isBlurOn && blurType === "BlurElement")
      setBlurType("RemoveBlur");
    else if (isBlurOn && blurType === "RemoveBlur") setBlurType("BlurElement");
  }

  function changeDrawType() {
    if (!isDrawOn) {
      setIsBlurOn(false);
      setIsDrawOn(true);
      setDrawType("Pen");
    } else if (isDrawOn && drawType === "Pen") setDrawType("Arrow");
    else if (isDrawOn && drawType === "Arrow") setDrawType("Pen");
    else if (isDrawOn && drawType === "Eraser") setDrawType("Pen"); // Cycle back if eraser
  }

  function activateEraser() {
    if (!isDrawOn) {
      setIsBlurOn(false);
      setIsDrawOn(true);
    }
    setDrawType("Eraser");
  }

  function turnOfDrawing() {
    setIsDrawOn(false);
  }

  function changeDrawingColor() {
    let color = getRandomColor();
    while (color === drawingColor) color = getRandomColor();
    setDrawingColor(color);
    if (drawType === "Eraser") setDrawType("Pen"); // Switch back to pen if user picks color
  }

  async function changeCameraShape() {
    const newShapeState = !isFullRoundedCam;
    await storage.setItem<boolean>("local:isFullRoundedTabCam",newShapeState);
    setIsFullRoundedCam(newShapeState);
    
  }

  return (
    <div
      ref={wrapperRef}
      className="recorder-zero dark pointer-events-auto fixed z-999999 w-fit h-fit cursor-grab group flex items-center flex-col gap-1"
    >
      <div
        className={
          (isFullRoundedCam ? "rounded-full" : " rounded-xl") +
          ` recorder-zero w-52 h-52 overflow-hidden border-2 border-primary p-0 m-0 pointer-events-auto flex place-content-center bg-black`
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

      <Badge>
        {isRecording ? (
          <>
            <div className="animate-pulse bg-red-400 w-2 h-2 rounded-full" />
            Recording
          </>
        ) : (
          "Preview"
        )}
      </Badge>

      <div className="recorder-zero border transition-all h-0 p-1 opacity-0 group-hover:h-full group-hover:opacity-100 relative min-w-54 w-full bg-background rounded-full shadow flex justify-between items-center gap-1 overflow-hidden">
        <Button
          title="Change shape"
          size="icon-sm"
          variant="secondary"
          className="rounded-full recorder-zero"
          onClick={changeCameraShape}
        >
          {isFullRoundedCam ? <TbSquareRounded /> : <LuCircleDashed />}
        </Button>

        <ButtonGroup>
          <Button
            title="Blur element"
            size="icon-sm"
            variant={isBlurOn ? "default" : "secondary"}
            className="rounded-full recorder-zero"
            onClick={changeGlurType}
          >
            {blurType === "BlurElement" ? <MdBlurOn /> : <MdBlurOff />}
          </Button>
          {isBlurOn && (
            <Button
              title="Stop Blurring"
              size="icon-sm"
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
            variant={
              isDrawOn && drawType !== "Eraser" ? "default" : "secondary"
            }
            className="rounded-full recorder-zero"
            onClick={changeDrawType}
          >
            {drawType === "Arrow" ? (
              <ArrowRight className="w-4 h-4" />
            ) : (
              <Pen className="w-4 h-4" />
            )}
          </Button>

          {isDrawOn && (
            <>
              <Button
                title="Change drawing Color"
                size="icon-sm"
                variant="secondary"
                className="recorder-zero"
                onClick={changeDrawingColor}
              >
                <IoColorFill
                  style={{ color: drawingColor }}
                  className="w-3 h-3"
                />
              </Button>

              <Button
                title="Erase a drawing"
                size="icon-sm"
                variant={drawType === "Eraser" ? "default" : "secondary"}
                className="recorder-zero"
                onClick={activateEraser}
              >
                <Eraser className="w-3 h-3" />
              </Button>

              <Button
                title="Stop Drawing"
                size="icon-sm"
                className="rounded-full recorder-zero"
                onClick={turnOfDrawing}
              >
                <X className="w-3 h-3" />
              </Button>
            </>
          )}
        </ButtonGroup>
      </div>
    </div>
  );
}
