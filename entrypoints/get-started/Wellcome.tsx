import { useState } from "react";
import {
  Mic,
  Video,
  Monitor,
  Maximize2,
  Eye,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const [permissions, setPermissions] = useState({
    microphone: false,
    camera: false,
  });

  const [requested, setRequested] = useState({
    microphone: false,
    camera: false,
  });

  const [completed, setCompleted] = useState(false);

  const requestMicrophonePermission = async () => {
    try {
      setRequested((prev) => ({ ...prev, microphone: true }));
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissions((prev) => ({ ...prev, microphone: true }));
    } catch (error) {
      console.error("Microphone permission denied:", error);
    }
  };

  const requestCameraPermission = async () => {
    try {
      setRequested((prev) => ({ ...prev, camera: true }));
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissions((prev) => ({ ...prev, camera: true }));
    } catch (error) {
      console.error("Camera permission denied:", error);
    }
  };

  const handleContinue = () => {
    setCompleted(true);
    localStorage.setItem("recorderzero_onboarded", "true");
    localStorage.setItem(
      "recorderzero_permissions",
      JSON.stringify(permissions)
    );
    window.close();
  };

  if (completed) {
    return (
      <div className="dark min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20">
            <Eye className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-3xl font-bold mb-3 text-foreground">
            You're All Set!
          </h1>
          <p className="text-muted-foreground mb-6">
            RecorderZero is ready to record your screen with crystal-clear audio
            and video.
          </p>
          <p className="text-sm text-muted-foreground">
            Look for the RecorderZero icon in your extension menu to start
            recording.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative w-screen overflow-x-hidden bg-background dark">
      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground text-balance">
            Welcome to RecorderZero
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Start recording your browser tab, fullscreen, or individual windows
            with crystal-clear audio and video.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Monitor className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Tab Recording
            </h3>
            <p className="text-sm text-muted-foreground">
              Capture just the tab you're working on
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Maximize2 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Fullscreen Recording
            </h3>
            <p className="text-sm text-muted-foreground">
              Record your entire screen
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              Window Recording
            </h3>
            <p className="text-sm text-muted-foreground">
              Record a single application window
            </p>
          </div>
        </div>

        {/* Permission Requests */}
        <div className="space-y-4 mb-12">
          <h2 className="text-xl font-semibold text-foreground mb-6">
            Grant Permissions
          </h2>

          {/* Microphone Permission */}
          <div className="rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Microphone Access
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Capture audio from your microphone while recording
                  </p>
                </div>
              </div>
              <Button
                onClick={requestMicrophonePermission}
                disabled={permissions.microphone}
                variant={permissions.camera ? "secondary" : "default"}
              >
                {permissions.microphone
                  ? "✓ Granted"
                  : requested.microphone
                  ? "Allow"
                  : "Request"}
              </Button>
            </div>
          </div>

          {/* Camera Permission */}
          <div className="rounded-lg border border-border bg-card/50 p-6 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Camera Access
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Include your webcam feed during screen recordings
                  </p>
                </div>
              </div>
              <Button
                onClick={requestCameraPermission}
                disabled={permissions.camera}
                variant={permissions.camera ? "secondary" : "default"}
              >
                {permissions.camera
                  ? "✓ Granted"
                  : requested.camera
                  ? "Allow"
                  : "Request"}
              </Button>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-6 mb-8">
          <p className="text-sm text-foreground">
            <span className="font-semibold">💡 Tip:</span> You can grant
            permissions now or later. RecorderZero will ask for permissions when
            you start recording features that require them.
          </p>
        </div>

        {/* CTA Button */}
        <Button onClick={handleContinue} className="w-full">
          Continue to RecorderZero
        </Button>

        {/* Skip Link */}
        <div className="text-center mt-4">
          <Button
            onClick={handleContinue}
            variant="secondary"
            className=" w-full"
          >
            I'll set up permissions manually later
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-sm mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-muted-foreground">
          <p>
            RecorderZero • Record. Share. Inspire. | Privacy-first screen
            recording
          </p>
        </div>
      </footer>
    </div>
  );
}
