import { getUserMediaPermissions } from "@/lib/utils";

browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('offscreen message recived', message, sender);
    switch (message.type) {
        case 'start-recording':
            console.log('offscreen start recording');
            setTimeout(() => {
                startRecording(message.data);
            }, 1000);
            
            break;
        case 'stop-recording':
            console.log('offscreen stop recording');
            stopRecording();
            break;
        default:
            break;
    }

    return true
})

let recorder: MediaRecorder | null = null;
let data: BlobPart[] = [];

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


async function startRecording(stremId: string) {
    if (!stremId) {
        console.warn("No stream ID provided.");
        return
    }
    try {
        await getUserMediaPermissions();
        if (recorder?.state === "recording") {
            throw new Error("Called startrecording while recording in progress.")
        }

        // use tabcaptured stemid
        const media = await navigator.mediaDevices.getUserMedia({
            audio: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: stremId
                }
            } as any,
            video: {
                mandatory: {
                    chromeMediaSource: "tab",
                    chromeMediaSourceId: stremId
                }
            } as any
        });

        // geting microphone audio
        const microPhone = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
        })

        // Mix microphone + tab audio

        const audioCtx = new AudioContext();
        const destination = audioCtx.createMediaStreamDestination();

        // mic → mixedDest + speakers
        const micSource = audioCtx.createMediaStreamSource(microPhone);
        micSource.connect(destination);
        micSource.connect(audioCtx.destination); // live play mic

        // tab audio → mixedDest + speakers
        const tabSource = audioCtx.createMediaStreamSource(media);
        tabSource.connect(destination);
        tabSource.connect(audioCtx.destination); // live play tab


        const combined = new MediaStream([
            media.getVideoTracks()[0],
            ...destination.stream.getAudioTracks()
        ]);

        recorder = new MediaRecorder(combined, { mimeType: "video/webm; codecs=vp9,opus" });
        data = [];
        // listen for data
        recorder.ondataavailable = (e) => data.push(e.data);

        // listen for stop recording
        recorder.onstop = async () => {
            console.log("Recording stopped");

            try {
                // Create blob and preview
                const blob = new Blob(data, { type: "video/webm" });
                console.log(data);

                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl);

                // Stop all tracks safely
                media.getTracks().forEach((t) => t.stop());
                microPhone.getTracks().forEach((t) => t.stop());
                combined.getTracks().forEach((t) => t.stop());

                // Disconnect and close AudioContext
                micSource.disconnect();
                tabSource.disconnect();
                destination.disconnect();
                audioCtx.close();

                // Release references
                recorder = null;
                data = [];

                console.log("All media and audio resources released.");
            } catch (err) {
                console.error("Error cleaning up after stop:", err);
            }

        };

        // start recording
        recorder.start();

    } catch (error) {
        console.error('Error while offscreen startrecoring, Error - ', error);

    }
}