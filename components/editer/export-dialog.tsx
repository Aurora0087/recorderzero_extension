"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, Loader } from "lucide-react"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { VideoEditorState } from "@/hooks/use-video-editor"

interface ExportDialogProps {
  isOpen: boolean
  isProcessing: boolean
  onExport: ({
    exportType,
  }: {
    exportType: "mp4" | "gif" | "webm"
  }) => Promise<void>
  onClose: () => void
  state: VideoEditorState
  duration: number
}

export default function ExportDialog({ isOpen, isProcessing, onExport, onClose, state, duration }: ExportDialogProps) {
  const [exportSettings, setExportSettings] = useState<{
    format: "mp4" | "gif" | "webm"
    quality: string
    fps: number
  }>({
    format: "mp4",
    quality: "high",
    fps: 24,
  })

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="overflow-hidden transition-transform">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>Configure your export settings and download your video.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Format Selection */}
          <div>
            <label className="text-sm font-medium block mb-2">Format</label>
            <Select
              value={exportSettings.format}
              onValueChange={(value: "mp4" | "gif" | "webm") => setExportSettings({ ...exportSettings, format: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mp4">MP4</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="webm">WEBM</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} disabled={isProcessing} variant="outline">
            Cancel
          </Button>
          <Button
            onClick={() => onExport({ exportType: exportSettings.format })}
            disabled={isProcessing}
            className="flex-1"
          >
            {isProcessing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
