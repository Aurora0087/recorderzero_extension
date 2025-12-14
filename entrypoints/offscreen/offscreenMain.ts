import { db } from "@/db";
import { getUserMediaPermissions, makeId } from "@/lib/utils";

let recorder: MediaRecorder | null = null;
let videoId: string | null = null;
let tabId: number = -1;

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.type) {
    case "start-tab-recording":
      if (message.videoId && message.tabId > 0) {
        videoId = message.videoId;
        tabId = message.tabId;
        startRecording({
          stremId: message.streamid,
          isMicOn: message.mic.isEnabled,
          micDeviceId: message.mic.deviceId,
        });
      }

      break;
    case "stop-tab-recording":
      stopRecording();
      break;
    default:
      break;
  }
  return true;
});

async function stopRecording() {
  console.log("Stop recording");

  try {
    if (recorder === null) {
      return;
    }
    if (recorder.state === "inactive") {
      console.warn("Recorder is already stopped.");
      return;
    }

    recorder.stop(); // triggers the onstop event
  } catch (err) {
    console.error("Error stopping recording:", err);
  }
}

async function startRecording({
  stremId,
  isMicOn = false,
  micDeviceId = "",
}: {
  stremId: string;
  isMicOn?: boolean;
  micDeviceId?: string;
}) {
  await getUserMediaPermissions();
  if (!stremId) {
    console.warn("No stream ID provided.");
    return;
  }
  try {
    if (recorder?.state === "recording") {
      throw new Error("Called startrecording while recording in progress.");
    }

    // use tabcaptured stemid
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: stremId,
        },
      } as any,
      video: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: stremId,
        },
      } as any,
    });

    const tracks: MediaStreamTrack[] = [media.getVideoTracks()[0]];
    const audioCtx = new AudioContext();
    // Mix microphone + tab audio

    const destination = audioCtx.createMediaStreamDestination();

    let microPhone: MediaStream | null = null;
    let micSource: MediaStreamAudioSourceNode | null = null;
    if (isMicOn) {
      // geting microphone audio
      microPhone = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: micDeviceId },
      });

      // mic → mixedDest
      micSource = audioCtx.createMediaStreamSource(microPhone);
      micSource.connect(destination);
      tracks.push(...destination.stream.getAudioTracks());
    }

    const combined = new MediaStream(tracks);

    recorder = new MediaRecorder(combined, {
      mimeType: "video/mp4",
    });
    // listening for data
    recorder.ondataavailable = async (e) => {
      if (!videoId || tabId < 1) return;

      const id = makeId();
      const bytes = new Uint8Array(await e.data.arrayBuffer());

      await db.chanks.add({
        id,
        videoId: videoId,
        data: bytes,
        createdAt: new Date(),
      });
    };
    // listening for stop recording
    recorder.onstop = async () => {
      try {
        if (videoId) {
          const editPage = browser.runtime.getURL(
            `/video-edited.html?vi=${videoId}`
          );

          window.open(editPage, "_blank");
        }

        // Stop all tracks safely
        media.getTracks().forEach((t) => t.stop());
        if (microPhone) {
          microPhone.getTracks().forEach((t) => t.stop());
        }
        combined.getTracks().forEach((t) => t.stop());

        // Disconnect and close AudioContext
        if (micSource) {
          micSource.disconnect();
        }
        destination.disconnect();
        audioCtx.close();

        // Release references
        recorder = null;

        console.log("All media and audio resources released.");
      } catch (err) {
        console.error("Error cleaning up after stop:", err);
      } finally {
        tabId = -1;
      }
    };

    // start recording
    // 1s chunk
    recorder.start(1000);
  } catch (error) {
    videoId = null;
    console.error("Error while offscreen startrecoring, Error - ", error);
  }
}
