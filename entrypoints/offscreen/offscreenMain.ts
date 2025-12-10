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
        setTimeout(() => {
          startRecording(message.streamid);
        }, 1000);
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

async function startRecording(stremId: string) {
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

    // geting microphone audio
    const microPhone = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });

    // Mix microphone + tab audio

    const audioCtx = new AudioContext();
    const destination = audioCtx.createMediaStreamDestination();

    // mic → mixedDest + speakers
    const micSource = audioCtx.createMediaStreamSource(microPhone);
    micSource.connect(destination);

    const combined = new MediaStream([
      media.getVideoTracks()[0],
      ...destination.stream.getAudioTracks(),
    ]);

    recorder = new MediaRecorder(combined, {
      mimeType: "video/mp4",
    });
    // listen for data
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
    // listen for stop recording
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
        microPhone.getTracks().forEach((t) => t.stop());
        combined.getTracks().forEach((t) => t.stop());

        // Disconnect and close AudioContext
        micSource.disconnect();
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
    recorder.start(1000);
  } catch (error) {
    videoId = null;
    console.error("Error while offscreen startrecoring, Error - ", error);
  }
}
