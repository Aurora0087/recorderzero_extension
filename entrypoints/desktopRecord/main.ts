import { db } from "@/db";
import { getRecordingVideoid, getUserMediaPermissions, makeId, setRecordingVideoid } from "@/lib/utils";

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('Desktop rec message message recived', message, sender);
    switch (message.type) {
        case 'start-recording-desktop':
            console.log('Desktop start recording');
            setTimeout(() => {
                startRecording(message.focuseTabId);
            }, 1000);

            break;
        case 'stop-recording-desktop':
            console.log('desktop stop recording');
            stopRecording();
            break;
        default:
            break;
    }

    return true
});

let recorder: MediaRecorder | null = null;
let recordingVideoId: string | null = null;

async function startRecording(focuseTabId: number) {
    browser.desktopCapture.chooseDesktopMedia(
        ["screen", "window"],
        async function (streamId: string) {
            if (!streamId) return;

            try {
                console.log("Desktop streamId", streamId);

                // Ensure video record reference exists
                recordingVideoId = await getRecordingVideoid();
                if (!recordingVideoId) {
                    const id = makeId();
                    await db.videos.add({
                        id,
                        name: `video-${id}`,
                        createdAt: new Date(),
                    });
                    await setRecordingVideoid(id);
                    recordingVideoId = id;
                }

                // ---- SCREEN / SYSTEM AUDIO STREAM ----
                const screenStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: streamId,
                        },
                    } as any,
                    video: {
                        mandatory: {
                            chromeMediaSource: "desktop",
                            chromeMediaSourceId: streamId,
                            width: { exact: 1920 },
                            height: { exact: 1080 },
                        },
                    } as any,
                });

                console.log("Screen stream:", screenStream);

                // ---- TRY TO GET MICROPHONE (may fail) ----
                let micStream: MediaStream | null = null;

                try {
                    micStream = await navigator.mediaDevices.getUserMedia({
                        audio: { echoCancellation: true, noiseSuppression: true },
                    });
                } catch (err) {
                    console.warn("⚠ No microphone detected or permission denied");
                }

                // ---- AUDIO MIXING ----
                const audioCtx = new AudioContext();
                const audioDest = audioCtx.createMediaStreamDestination();

                // MIC (optional)
                let micSource = null;
                if (micStream) {
                    micSource = audioCtx.createMediaStreamSource(micStream);
                    micSource.connect(audioDest);
                }

                // SYSTEM AUDIO (optional)
                const hasSystemAudio = screenStream.getAudioTracks().length > 0;
                let sysSource = null;

                if (hasSystemAudio) {
                    sysSource = audioCtx.createMediaStreamSource(screenStream);
                    sysSource.connect(audioDest);
                } else {
                    console.warn("⚠ No system audio detected in desktop capture");
                }

                // ---- BUILD FINAL STREAM ----
                const finalStream = new MediaStream([
                    ...screenStream.getVideoTracks(),
                    ...audioDest.stream.getAudioTracks(), // mixed audio (or empty)
                ]);

                // ---- INITIALIZE RECORDER ----
                recorder = new MediaRecorder(finalStream, { mimeType: "video/mp4" });

                recorder.ondataavailable = async (e) => {
                    if (!recordingVideoId) return;

                    const id = makeId();
                    const bytes = new Uint8Array(await e.data.arrayBuffer());

                    await db.chanks.add({
                        id,
                        videoId: recordingVideoId,
                        data: bytes,
                        createdAt: new Date(),
                    });
                };

                recorder.onstop = async () => {
                    console.log("Recording stopped");

                    try {
                        // Stop tracks
                        screenStream.getTracks().forEach((t) => t.stop());
                        micStream?.getTracks().forEach((t) => t.stop());
                        finalStream.getTracks().forEach((t) => t.stop());

                        // Disconnect audio nodes
                        micSource?.disconnect();
                        sysSource?.disconnect();
                        audioDest.disconnect();
                        audioCtx.close();

                        recorder = null;

                        if (recordingVideoId) {
                            const data = await db.chanks.where({
                                videoId: recordingVideoId,
                            });

                            console.log("Recording Data:", data);

                            const editPage = browser.runtime.getURL(
                                `/video-edited.html?vi=${recordingVideoId}`
                            );

                            window.open(editPage, "_blank");
                        }

                        await setRecordingVideoid(null);
                    } catch (err) {
                        console.error("Cleanup error:", err);
                    }
                };

                // Focus previous tab if needed
                if (focuseTabId) {
                    await browser.tabs.update(focuseTabId, { active: true });
                }

                // Start recording (small chunks)
                recorder.start(1000);
            } catch (error) {
                console.error("Error starting recorder:", error);
            }
        }
    );
}


async function stopRecording() {
    console.log('Stop recording');

    try {
        if (recorder === null) {
            return;
        }
        if (recorder.state === "inactive") {
            console.warn('Recorder is already stopped.');
            return;
        }

        recorder.stop(); // triggers the onstop event
    } catch (err) {
        console.error('Error stopping recording:', err);
    }
}