import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { storage } from "#imports";
import { RecordingState, RecordingType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function toggleCamStateInStore(
  isCurrentCamOn: boolean,
  tabId: number
) {
  await storage.setItem("local:isCamreRaOn", !isCurrentCamOn);
  await storage.setItem("local:camRecTabId", !isCurrentCamOn ? tabId : -1);
}

export async function toggleIsRecording(preValue: boolean) {
  await storage.setItem("local:isRecording", !preValue);
}

export async function checkRocordingStates(): Promise<RecordingState> {
  const isRecording =
    (await storage.getItem<boolean>("local:isRecording")) || false;
  const isCamEnable =
    (await storage.getItem<boolean>("local:isCamreRaOn")) || false;
  const recordingType =
    (await storage.getItem<RecordingType>("local:recordingType")) || "";
  const tabId = (await storage.getItem<number>("local:camRecTabId")) || -1;

  return [isRecording, recordingType, isCamEnable, tabId];
}

export async function changeRecordType(type: RecordingType) {
  await storage.setItem("local:recordingType", type);
}

export async function setRecordingVideoid(videoId: string | null) {
  await storage.setItem("local:recordingVideoId", videoId);
}

export async function getRecordingVideoid() {
  const videoId =
    (await storage.getItem<string>("local:recordingVideoId")) || null;
  return videoId;
}

export async function getCamRecTabId() {
  const tabId = (await storage.getItem<number>("local:camRecTabId")) || -1;

  return tabId;
}

export async function getIsCamOn() {
  const isRecording =
    (await storage.getItem<boolean>("local:isRecording")) || false;

  return isRecording;
}

export async function getUserMediaPermissions() {
  //request permission to use camera and microphone
  const permissions = await navigator.permissions.query({
    name: "camera",
  });
  if (permissions.state === "prompt") {
    await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  }

  if (permissions.state === "denied") {
    alert(
      "Camera permissions denied. Please enable them in your browser settings."
    );
    // Optionally show instructions in the UI
    return false;
  }
  return true;
}

export function makeId(length: number = 16) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Helper: Format time strings
export const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  const milliseconds = Math.floor((time % 1) * 100);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}.${String(milliseconds).padStart(2, "0")}`;
};

// Helper function to convert formatted time string (MM:SS.MS) back to seconds
export const deformatTime = (timeString: string): number | null => {
  try {
    const parts = timeString.split(":");
    if (parts.length !== 2) return null;

    const minutes = Number.parseInt(parts[0], 10);
    const [seconds, milliseconds] = parts[1]
      .split(".")
      .map((p) => Number.parseInt(p, 10));

    if (isNaN(minutes) || isNaN(seconds) || isNaN(milliseconds)) {
      return null;
    }

    return minutes * 60 + seconds + milliseconds / 100;
  } catch (error) {
    console.error("Error parsing time:", error);
    return null;
  }
};


const clipColors = ["#8CE4FF","#FEEE91","#FFA239","#FF5656","#4DFFBE","#FF76CE","#FF8F8F"]

export function getRandomColor() {
  return clipColors[Math.min(clipColors.length-1,Math.floor(Math.random() * 10))];
}