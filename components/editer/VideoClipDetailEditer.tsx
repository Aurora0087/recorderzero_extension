import { Clock, Crop, Pen } from "lucide-react";
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

function VideoClipDetailEditer({
  state,
  clipUpdate,
  selectedClipId,
}: {
  state: VideoEditorState;
  clipUpdate: ({ id, changeData }: VideoUpdateProps) => void;
  selectedClipId: string;
}) {
  const [selectedVideoClip, setSelectedVideoClip] =
    useState<null | VideoTimeLineClip>(null);
  const [editableFildInput, setEditableFildInput] = useState({
    id: "idNotGiven",
    clipedVideoEndTime: "0",
    clipedVideoStartTime: "0",
    color: "#000000",
    name: "noname",
    strtTime: "0",
  });

  useEffect(() => {
    const vc = state.videos.find((a) => a.id === selectedClipId);
    if (vc) {
      setSelectedVideoClip(vc);
      setEditableFildInput({
        id: vc.id,
        clipedVideoEndTime: vc.clipedVideoEndTime.toString(),
        clipedVideoStartTime: vc.clipedVideoStartTime.toString(),
        color: vc.timeLineColor,
        name: vc.name,
        strtTime: vc.startTime.toString(),
      });
    }
  }, [selectedClipId, state]);

  if (selectedVideoClip === null) {
    return <div className="h-24 animate-pulse bg-accent m-4 rounded-md"></div>;
  }

  function changeName(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      //verify is it same file extention

      //name len>1
      if (!selectedVideoClip) {
        toast.warning("Video clip not Selected.");
        return;
      }
      clipUpdate({
        id: selectedVideoClip.id,
        changeData: { name: editableFildInput.name },
      });
      toast.success("Video Clip's Name Changes.");
    }
  }

  function changeClipColor(newColor: string) {
    if (!selectedVideoClip) {
      toast.warning("Video clip not Selected.");
      return;
    }
    clipUpdate({
      id: selectedVideoClip.id,
      changeData: { timeLineColor: newColor },
    });
  }

  //position in time line
  const updateRenderVideoClip = ({
    start = null,
    end = null,
  }: {
    start?: string | null;
    end?: string | null;
  }) => {
    if (!start && !end) {
      toast.error("Values not given in UpdateRenderVideoClip.");
      return;
    }

    // Process start time
    if (start) {
      const startTime = deformatTime(start);
      if (startTime === null) {
        toast.error("Invalid start time format. Use MM:SS.MS");
        return;
      }
      if (startTime < 0) {
        toast.error("Start time cannot be negative");
        return;
      }
      clipUpdate({ id: selectedVideoClip.id, changeData: { startTime } });
      toast.success(`Start time updated to ${start}`);
      return;
    }

    // Process end time
    if (end) {
      const endTime = deformatTime(end);
      if (endTime === null) {
        toast.error("Invalid end time format. Use MM:SS.MS");
        return;
      }
      if (endTime <= selectedVideoClip.minTime + selectedVideoClip.startTime) {
        toast.error("End time must be after start time");
        return;
      }
      if (endTime > selectedVideoClip.maxTime + selectedVideoClip.startTime) {
        toast.error(
          `End time cannot exceed ${formatTime(selectedVideoClip.maxTime)}`
        );
        return;
      }
      clipUpdate({
        id: selectedVideoClip.id,
        changeData: { clipedVideoEndTime: endTime },
      });
      toast.success(`End time updated to ${end}`);
      return;
    }
  };

  function changePositionInTimeLine(
    e: React.KeyboardEvent<HTMLInputElement>,
    type: "position-start" | "position-end" | "crop-start" | "crop-end"
  ) {
    if (e.key === "Enter") {
      if (!selectedVideoClip) {
        toast.warning("Video clip not Selected.");
        return;
      }
      if (type === "position-start") {
        updateRenderVideoClip({
          start: editableFildInput.clipedVideoStartTime,
        });
      } else if (type === "position-end") {
        updateRenderVideoClip({ end: editableFildInput.clipedVideoEndTime });
      } else if (type === "crop-start") {
      } else if (type === "crop-end") {
      }
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className=" flex items-center justify-between">
        <div className="flex gap-4 items-center">
          <ImFilm className=" text-red-400 w-4 h-4" />
          <span className="font-bold text-base">{selectedVideoClip.name}</span>
        </div>
        <div className=" flex items-center gap-2">
          <a
            href={selectedVideoClip.url}
            target="_blank"
            className="hover:text-primary"
            title="Open Orginal File in New tab"
          >
            <CgArrowTopRight className=" w-6 h-6" />
          </a>
        </div>
      </div>

      <Separator />
      {/* inside timeline */}
      <div className=" space-y-2">
        <div className=" font-bold flex gap-2 items-center">
          <FcTimeline className=" w-4 h-4" />
          Position Inside Timeline
        </div>
        <div className=" grid grid-cols-2 gap-2">
          <div className=" grid gap-2">
            <span className=" text-white/50">Start From</span>
            <InputGroup>
              <InputGroupInput
                defaultValue={formatTime(selectedVideoClip.startTime)}
                onChange={(e) => {
                  setEditableFildInput((pre) => {
                    return { ...pre, clipedVideoStartTime: e.target.value };
                  });
                }}
                onKeyDown={(e) => changePositionInTimeLine(e, "position-start")}
              />
              <InputGroupAddon align="inline-start">
                <Clock />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">min</InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
      <Separator />
      {/* croped video from orginal */}
      <div className=" space-y-2">
        <div className=" font-bold flex gap-2 items-center">
          {" "}
          <Crop className=" w-4 h-4" />
          Croped Video from Orginal Video
        </div>
        <div className=" grid grid-cols-2 gap-2">
          <div className=" grid gap-2">
            <span className=" text-white/50">From</span>
            <InputGroup>
              <InputGroupInput
                defaultValue={formatTime(
                  selectedVideoClip.clipedVideoStartTime
                )}
                onChange={(e) => {
                  setEditableFildInput((pre) => {
                    return { ...pre, clipedVideoStartTime: e.target.value };
                  });
                }}
              />
              <InputGroupAddon align="inline-start">
                <Clock />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">min</InputGroupAddon>
            </InputGroup>
          </div>

          <div className=" grid gap-2">
            <span className=" text-white/50">To</span>
            <InputGroup>
              <InputGroupInput
                defaultValue={formatTime(
                  selectedVideoClip.clipedVideoEndTime +
                    selectedVideoClip.startTime
                )}
                onChange={(e) => {
                  setEditableFildInput((pre) => {
                    return { ...pre, clipedVideoEndTime: e.target.value };
                  });
                }}
                onKeyDown={(e) => changePositionInTimeLine(e, "position-end")}
              />
              <InputGroupAddon align="inline-start">
                <Clock />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">min</InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
      <Separator />
      <div className=" space-y-2">
        <div className="flex justify-between items-center gap-1">
          <span className="font-bold">Selected Video</span>
          <span className=" text-white/20 text-xs line-clamp-1">
            {"ID : " + selectedVideoClip.id}
          </span>
        </div>
        <div className=" grid gap-2">
          <div className=" grid gap-2">
            <span className=" text-white/50">Name</span>
            <InputGroup>
              <InputGroupInput
                defaultValue={editableFildInput.name}
                onChange={(e) => {
                  setEditableFildInput((pre) => {
                    return { ...pre, name: e.target.value };
                  });
                }}
                onKeyDown={(e) => changeName(e)}
              />
              <InputGroupAddon align="inline-start">
                <Pen />
              </InputGroupAddon>
              {selectedVideoClip.name !== editableFildInput.name ? (
                <InputGroupAddon
                  title="Enter to save new name"
                  align="inline-end"
                >
                  <div className=" w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </InputGroupAddon>
              ) : null}
            </InputGroup>
          </div>
          <div className=" grid gap-2">
            <span className=" text-white/50">Clip Color</span>
            <InputGroup>
              <InputGroupInput
                className=" transition-all"
                type="color"
                defaultValue={editableFildInput.color}
                onChange={(e) => {
                  changeClipColor(e.target.value);
                }}
              />

              <InputGroupAddon align="inline-start">
                <IoColorPalette />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {selectedVideoClip.timeLineColor}
              </InputGroupAddon>
            </InputGroup>
          </div>
          <div className=" grid gap-2">
            <span className=" text-white/50">Orginal Video Length</span>
            <InputGroup>
              <InputGroupInput
                disabled
                value={formatTime(selectedVideoClip.maxTime)}
              />
              <InputGroupAddon align="inline-start">
                <Clock />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">min</InputGroupAddon>
            </InputGroup>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoClipDetailEditer;
