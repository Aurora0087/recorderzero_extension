import { useState, useEffect } from "react"; // Added imports
import { Mic, MicOff } from "lucide-react";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { checkUserMicState, setUserMicState } from "@/lib/utils";

interface AudioDevice {
  deviceId: string;
  label: string;
}

function MicButton() {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");
  const [hasPermission, setHasPermission] = useState(false);

  // --- 1. Fetch Devices & Check Permissions ---
  const getAudioDevices = async (forcedId?: string) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter((device) => device.kind === "audioinput");

      // Check if we have labels (indicates permission is granted)
      const hasLabels = audioInputs.some((d) => d.label.length > 0);
      setHasPermission(hasLabels);

      const formattedDevices = audioInputs.map((d) => ({
        deviceId: d.deviceId,
        label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`,
      }));

      setAudioDevices(formattedDevices);

      // Handle selection logic
      if (formattedDevices.length > 0) {
        // If a specific ID is requested (from storage) and exists, use it
        if (forcedId && formattedDevices.some(d => d.deviceId === forcedId)) {
            setSelectedAudioId(forcedId);
        } 
        // Otherwise, if nothing is selected, default to the first one or 'default'
        else if (!selectedAudioId) {
          const defaultDevice = formattedDevices.find((d) => d.deviceId === "default");
          const fallbackId = defaultDevice ? defaultDevice.deviceId : formattedDevices[0].deviceId;
          setSelectedAudioId(fallbackId);
        }
      }
    } catch (error) {
      console.error("Error fetching devices:", error);
    }
  };

  // --- 2. Request Browser Permission ---
  const requestAudioPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately
      setHasPermission(true);
      return true;
    } catch (error) {
      console.error("Permission denied", error);
      setAudioEnabled(false); // Force off if denied
      return false;
    }
  };

  // --- 3. Toggle Handler ---
  const handleAudioToggle = async () => {
    const newState = !audioEnabled;

    if (newState && !hasPermission) {
      // Trying to turn ON but missing permission
      const granted = await requestAudioPermission();
      if (granted) {
        setAudioEnabled(true);
        // Refresh devices to get actual labels now that we have permission
        await getAudioDevices(selectedAudioId); 
        setUserMicState({ isMicOn: true, selectedMicAudioId: selectedAudioId });
      }
    } else {
      // Normal toggle
      setAudioEnabled(newState);
      setUserMicState({ isMicOn: newState, selectedMicAudioId: selectedAudioId });
    }
  };

  // --- 4. Handle Dropdown Change ---
  const handleDeviceChange = (deviceId: string) => {
    setSelectedAudioId(deviceId);
    // Only update storage if mic is actually on, or update the ID preference anyway
    setUserMicState({ isMicOn: audioEnabled, selectedMicAudioId: deviceId });
  };

  // --- 5. Initialization ---
  useEffect(() => {
    const init = async () => {
      // Check stored state
      const userMicState = await checkUserMicState();
      setAudioEnabled(userMicState.isMicOn);
      await getAudioDevices(userMicState.selectedMicAudioId);
    };

    init();
    
    // Optional: Listen for device changes (plugging/unplugging)
    navigator.mediaDevices.addEventListener('devicechange', () => getAudioDevices(selectedAudioId));
    return () => navigator.mediaDevices.removeEventListener('devicechange', () => getAudioDevices(selectedAudioId));
  }, []);

  return (
    <div className="flex items-center gap-2 py-4 border-y">
      {/* Mic Toggle Button */}
      <Button
        variant={audioEnabled ? "default" : "outline"}
        size="icon"
        onClick={handleAudioToggle}
        title={audioEnabled ? "Mute Microphone" : "Enable Microphone"}
      >
        {audioEnabled ? (
          <Mic className="w-4 h-4" />
        ) : (
          <MicOff className="w-4 h-4" />
        )}
      </Button>

      {/* Device Select Dropdown */}
      <div className="relative flex-1">
        <Select
          disabled={!audioEnabled}
          value={selectedAudioId}
          onValueChange={handleDeviceChange}
        >
          <SelectTrigger className="w-full h-8 text-xs cursor-pointer">
            <SelectValue placeholder={hasPermission ? "Select Microphone" : "Permission needed"} />
          </SelectTrigger>
          <SelectContent>
            {audioDevices.length === 0 ? (
               <SelectItem value="no-device" disabled>No microphone found</SelectItem>
            ) : (
              audioDevices.map((device) => (
                <SelectItem key={device.deviceId} value={device.deviceId} className=" cursor-pointer">
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

export default MicButton;