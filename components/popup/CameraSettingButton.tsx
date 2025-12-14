import { useState, useEffect } from "react";
import { Video, VideoOff } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
//import { checkUserCameraState, setUserCameraState } from "@/lib/utils";

interface VideoDevice {
  deviceId: string;
  label: string;
}

function CameraSettingsButton() {
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [videoDevices, setVideoDevices] = useState<VideoDevice[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [hasPermission, setHasPermission] = useState(false);

  // --- 1. Fetch Devices & Check Permissions ---
  const getVideoDevices = async (forcedId?: string) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // Filter for video inputs (webcams)
      const videoInputs = devices.filter((device) => device.kind === "videoinput");

      // Check if we have labels (indicates permission is granted)
      const hasLabels = videoInputs.some((d) => d.label.length > 0);
      setHasPermission(hasLabels);

      const formattedDevices = videoInputs.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Camera ${d.deviceId.slice(0, 5)}...`,
      }));

      setVideoDevices(formattedDevices);

      // Handle selection logic
      if (formattedDevices.length > 0) {
        // If a specific ID is requested (from storage) and exists, use it
        if (forcedId && formattedDevices.some(d => d.deviceId === forcedId)) {
            setSelectedCameraId(forcedId);
        } 
        // Otherwise, if nothing is selected, default to the first one or 'default'
        else if (!selectedCameraId) {
          const defaultDevice = formattedDevices.find((d) => d.deviceId === "default");
          const fallbackId = defaultDevice ? defaultDevice.deviceId : formattedDevices[0].deviceId;
          setSelectedCameraId(fallbackId);
        }
      }
    } catch (error) {
      console.error("Error fetching video devices:", error);
    }
  };

  // --- 2. Request Browser Permission ---
  const requestCameraPermission = async () => {
    try {
      // Request video stream specifically
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error("Camera permission denied", error);
      setCameraEnabled(false); // Force off if denied
      return false;
    }
  };

  // --- 3. Toggle Handler ---
  const handleCameraToggle = async () => {
    const newState = !cameraEnabled;

    if (newState && !hasPermission) {
      // Trying to turn ON but missing permission
      const granted = await requestCameraPermission();
      if (granted) {
        setCameraEnabled(true);
        // Refresh devices to get actual labels now that we have permission
        await getVideoDevices(selectedCameraId); 
        //setUserCameraState({ isCameraOn: true, selectedCameraId: selectedCameraId });
      }
    } else {
      // Normal toggle
      setCameraEnabled(newState);
      //setUserCameraState({ isCameraOn: newState, selectedCameraId: selectedCameraId });
    }
  };

  // --- 4. Handle Dropdown Change ---
  const handleDeviceChange = (deviceId: string) => {
    setSelectedCameraId(deviceId);
    // Only update storage if camera is actually on, or update the ID preference anyway
    //setUserCameraState({ isCameraOn: cameraEnabled, selectedCameraId: deviceId });
  };

  // --- 5. Initialization ---
  useEffect(() => {
    const init = async () => {
      // Check stored state
      /*const userCameraState = await checkUserCameraState();
      setCameraEnabled(userCameraState.isCameraOn);
      await getVideoDevices(userCameraState.selectedCameraId);*/
    };

    init();
    
    // Optional: Listen for device changes (plugging/unplugging)
    const handleDeviceChange = () => getVideoDevices(selectedCameraId);
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
  }, []);

  return (
    <div className="flex items-center gap-2 pb-4 border-y border-t-0"> 
      {/* Added border-t-0 so it stacks nicely under the Mic button without double borders */}
      
      {/* Camera Toggle Button */}
      <Button
        variant={cameraEnabled ? "default" : "outline"}
        size="icon"
        onClick={handleCameraToggle}
        title={cameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
      >
        {cameraEnabled ? (
          <Video className="w-4 h-4" />
        ) : (
          <VideoOff className="w-4 h-4" />
        )}
      </Button>

      {/* Device Select Dropdown */}
      <div className="relative flex-1">
        <Select
          disabled={!cameraEnabled}
          value={selectedCameraId}
          onValueChange={handleDeviceChange}
        >
          <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
            <SelectValue placeholder={hasPermission ? "Select Camera" : "Permission needed"} />
          </SelectTrigger>
          <SelectContent>
            {videoDevices.length === 0 ? (
               <SelectItem value="no-device" disabled>No camera found</SelectItem>
            ) : (
              videoDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId} className="cursor-pointer">
                  {device.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default CameraSettingsButton;