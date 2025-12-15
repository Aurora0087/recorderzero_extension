import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { getRandomColor, getUserMediaPermissions } from "@/lib/utils";
import { ArrowRight, Pen, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IoColorFill } from "react-icons/io5";
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
  const [drawingColor,setDrawingColor] = useState("#8CE4FF");

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
      target.style.outline = `2px solid ${drawingColor}`;

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

  // --- 3. Handle draw on page ---
  useEffect(()=>{
    const canvasId = "recorderzero-canvas";
    const wrapperId = "recorderzero-canvas-wrapper";
    // 1. Get or Create Canvas Elements
    let wrapper = document.getElementById(wrapperId) as HTMLDivElement;
    let canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = wrapperId;
      // High z-index but below the Camera UI (which is z-[999999])
      // Using arbitrary value for Tailwind compatibility or inline style
      wrapper.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        z-index: 9999; 
        pointer-events: none;
        overflow: hidden;
      `;
      document.body.appendChild(wrapper);

      canvas = document.createElement("canvas");
      canvas.id = canvasId;
      canvas.style.cssText = `
        width: 100%;
        height: 100%;
        display:"block";
      `;
      wrapper.appendChild(canvas);
    }

    // 2. Helper to resize both Wrapper and Canvas to full document size
    const updateDimensions = () => {
      if (!wrapper || !canvas) return;

      // Calculate the full scrollable size of the page
      const fullWidth = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.documentElement.clientWidth
      );
      
      const fullHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.documentElement.clientHeight
      );

      // FIX 2: Set pixel dimensions on the WRAPPER too, not just the canvas
      wrapper.style.width = `${fullWidth}px`;
      wrapper.style.height = `${fullHeight}px`;

      // Resize canvas if needed
      if (canvas.width !== fullWidth || canvas.height !== fullHeight) {
        // Optional: Save existing drawing data before resizing
        const ctx = canvas.getContext("2d");
        const imgData = canvas.width > 0 ? ctx?.getImageData(0, 0, canvas.width, canvas.height) : null;
        
        canvas.width = fullWidth;
        canvas.height = fullHeight;

        // Restore drawing data
        if (imgData && ctx) ctx.putImageData(imgData, 0, 0);
        
        // Re-apply context settings after resize (canvas resets context on resize)
        if (ctx) {
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineWidth = 4;
          ctx.strokeStyle = "red";
        }
      }
    };

    // 3. Logic Handling
    if (!isDrawOn) {
      wrapper.style.pointerEvents = "none";
      return;
    }

    wrapper.style.pointerEvents = "auto";
    
    // Initial sizing
    updateDimensions();

    // Resize listener (covers window resize)
    window.addEventListener("resize", updateDimensions);
    
    // FIX 3: Observer for DOM changes (covers infinite scroll or dynamic content)
    const resizeObserver = new ResizeObserver(() => updateDimensions());
    resizeObserver.observe(document.body);

     // --- Drawing Logic (Context Setup) ---
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = drawingColor;
    }

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let snapshot: ImageData | null = null;

    const getCoords = (e: MouseEvent) => {
      // Use pageX/Y because wrapper is absolute positioned relative to the document
      return { x: e.pageX, y: e.pageY };
    };

    const drawArrow = (fromX: number, fromY: number, toX: number, toY: number) => {
      if (!ctx) return;
      const headLength = 20; 
      const angle = Math.atan2(toY - fromY, toX - fromX);

      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(toX, toY);
      
      ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(toX, toY);
      ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
      
      ctx.stroke();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!ctx) return;
      isDrawing = true;
      const { x, y } = getCoords(e);
      startX = x;
      startY = y;
      
      ctx.beginPath();

      if (drawType === "Pen") {
        ctx.moveTo(x, y);
      } else if (drawType === "Arrow") {
        snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDrawing || !ctx) return;
      const { x, y } = getCoords(e);

      if (drawType === "Pen") {
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (drawType === "Arrow") {
        if (snapshot) ctx.putImageData(snapshot, 0, 0);
        drawArrow(startX, startY, x, y);
      }
    };

    const handleMouseUp = () => {
      isDrawing = false;
      ctx?.closePath();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp); 

    return () => {
      window.removeEventListener("resize", updateDimensions);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
      
      if (wrapper) wrapper.style.pointerEvents = "none";
    };
    
  },[isDrawOn,drawType,drawingColor])

  // --- 4. Handle Dragging ---
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

  function turnOfDrawing() {
    setIsDrawOn(false);
  }

  function changeDrawingColor(){
    let color = getRandomColor();

    while (color===drawingColor) {
      color = getRandomColor();
    }

    setDrawingColor(color);
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
            variant={isBlurOn ? "default":"secondary"}
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
            variant={isDrawOn ? "default":"secondary"}
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
            <>
            <Button
              title="Change drawing Color"
              size="icon-sm"
              variant="secondary"
              className="recorder-zero"
              onClick={changeDrawingColor}
            >
              <IoColorFill style={{color:drawingColor}} className="w-3 h-3" />
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
