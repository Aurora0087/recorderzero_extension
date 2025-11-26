import { Play, Crop as Crop2, Type, Frame, Wand2, Volume2, Settings } from "lucide-react"
import { Button } from "../ui/button"

export default function LeftSidebar() {
  const tools = [
    { icon: Play, label: "Play", active: true },
    { icon: Crop2, label: "Crop" },
    { icon: Type, label: "Text" },
    { icon: Frame, label: "Frames" },
    { icon: Wand2, label: "Effects" },
    { icon: Volume2, label: "Audio" },
    { icon: Settings, label: "Settings" },
  ]

  return (
    <div className="w-fit px-4 border-r flex flex-col items-center py-4 gap-4">
      {tools.map((tool, idx) => {
        const Icon = tool.icon
        return (
          <Button
                key={idx}
                variant={tool.active ? "default" : "ghost"}
                size="icon"
            title={tool.label}
          >
            <Icon size={24} />
          </Button>
        )
      })}
    </div>
  )
}
