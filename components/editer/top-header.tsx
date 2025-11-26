import { Settings, Download, Command } from "lucide-react"
import { Button } from "../ui/button"

interface TopHeaderProps {
  onExport: () => void
  isProcessing: boolean
}

export default function TopHeader({ onExport, isProcessing }: TopHeaderProps) {
  return (
    <div className="border-b px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button size="icon">
          <Command/>
        </Button>
        <h1 className="text-xl font-bold text-white">Recorder Zero</h1>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline">Save</Button>
        <Button
          onClick={onExport}
          disabled={isProcessing}
        >
          <Download />
          Export
        </Button>
      </div>
    </div>
  )
}
