import { getUserMediaPermissions } from "@/lib/utils";
import { useEffect, useRef, useState } from "react"

export default function Camera() {

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // handel cam streming
  useEffect(() => {
        let stream: MediaStream | null = null

        const startCamera = async () => {
            try {

                await getUserMediaPermissions();

                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                })
                if (videoRef.current) {
                    videoRef.current.srcObject = stream
                }
            } catch (err) {
                console.error("Camera access denied:", err)
                alert("Please allow camera access in your browser settings.")
            }
        }

        const stopCamera = () => {
            if (stream) {
                stream.getTracks().forEach((t) => t.stop())
                stream = null
            }
    }
    startCamera();
    return () => {
      stopCamera();
    };
    }, [])

  // Handle dragging
    useEffect(() => {
        const wrapper = wrapperRef.current
        if (!wrapper) return

        const handleMouseDown = (e: MouseEvent) => {
            setIsDragging(true)
            const rect = wrapper.getBoundingClientRect()
            setOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
          wrapper.style.transition = "none";
          wrapper.style.cursor = "grabbing";
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !wrapper) return
            e.preventDefault()
            const newX = e.clientX - offset.x
            const newY = e.clientY - offset.y
            wrapper.style.left = `${newX}px`
            wrapper.style.top = `${newY}px`
            wrapper.style.right = "auto"
        }

      const handleMouseUp = () => {
        setIsDragging(false); 
        wrapper.style.cursor = "grab";
      }

        wrapper.addEventListener("mousedown", handleMouseDown)
        document.addEventListener("mousemove", handleMouseMove)
        document.addEventListener("mouseup", handleMouseUp)

        return () => {
            wrapper.removeEventListener("mousedown", handleMouseDown)
            document.removeEventListener("mousemove", handleMouseMove)
            document.removeEventListener("mouseup", handleMouseUp)
        }
    }, [isDragging, offset])
  return (
    <div
      ref={wrapperRef}
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        width: "200px",
        height: "200px",
        borderRadius: "50%",
        overflow: "hidden",
        zIndex: 9999999,
        border: "2px solid rgba(87, 199, 133, 1)",
        margin: "0px",
        padding:"0px",
        cursor: "grab",
        pointerEvents: "auto",
        display: "flex",
        placeContent: "center",
        background: "linear-gradient(135deg,rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)",
      }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{
          margin: "0px",
          padding: "0px",
          height: "101%",
          width: "101%",
          objectFit: "cover",
          pointerEvents: "none",
          border:"none"
        }}
      />
    </div>
  )
}
