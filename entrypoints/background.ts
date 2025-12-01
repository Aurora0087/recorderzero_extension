import {
  checkRocordingStates,
  getCamRecTabId,
  getRecordingVideoid,
  makeId,
  setRecordingVideoid,
  toggleCamStateInStore,
} from "@/lib/utils";
import { storage } from "#imports";
import { RecordingType } from "@/lib/types";
import { db } from "@/db";

export default defineBackground(() => {
  // for recording tab
  async function recordTabState(start = true) {
    try {
      // set our offscreen doc
      const existingContext = await browser.runtime.getContexts({});
      const offscreenDocument = existingContext.find(
        (c) => c.contextType === "OFFSCREEN_DOCUMENT"
      );

      // if an offscreen doc is not open already, create it.
      if (!offscreenDocument) {
        await browser.offscreen.createDocument({
          url: "offscreen.html",
          reasons: [browser.offscreen.Reason.USER_MEDIA],
          justification: "Recording from current tab.",
        });
      }

      if (start) {
        // tabCapture API to get strem

        let tabId = await getCamRecTabId();

        console.log("tabId - ", tabId);

        // Ensure video record reference exists
        let recordingVideoId = await getRecordingVideoid();
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

        const [currentTab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        tabId = currentTab?.id || -1;

        if (!tabId) {
          console.warn("No active tab found");
          return;
        }
        const streamid = await browser.tabCapture.getMediaStreamId({
          targetTabId: tabId,
        });

        // send this to offscreen doc
        browser.runtime.sendMessage({
          type: "start-tab-recording",
          target: "offscreen",
          streamid,
          videoId: recordingVideoId,
          tabId,
        });
      } else {
        // stop tab recording
        await setRecordingVideoid(null);
        browser.runtime.sendMessage({
          type: "stop-tab-recording",
          target: "offscreen",
        });
      }
    } catch (error) {
      console.error("Error while recording Tab", error);
    }
  }

  // for recording screen / desktop
  async function recordScreenState(start = true) {
    const desktopRecPath = browser.runtime.getURL("/desktopRecord.html");

    // get active current tab
    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    const currentTabId = currentTab?.id;

    if (!currentTabId) {
      console.warn("No active tab found");
      return;
    }

    // find existing pinned recorder tab
    let pinnedTab = (
      await browser.tabs.query({
        url: desktopRecPath,
      })
    )[0];

    if (start) {
      // if recorder tab doesn't exist, create it
      if (!pinnedTab) {
        pinnedTab = await browser.tabs.create({
          url: desktopRecPath,
          pinned: true,
          active: true,
          index: 0,
        });

        // ensure the page is fully loaded before messaging
        await waitForTabLoaded(pinnedTab.id!);
      }

      await browser.tabs.sendMessage(pinnedTab.id!, {
        type: "start-recording-desktop",
        focuseTabId: currentTabId,
        pinnedTabId: pinnedTab.id,
      });
    } else {
      await browser.tabs.sendMessage(pinnedTab.id!, {
        type: "stop-recording-desktop",
        focuseTabId: currentTabId,
        pinnedTabId: pinnedTab.id,
      });
    }
  }

  // Wait until tab is fully loaded before messaging
  function waitForTabLoaded(tabId: number): Promise<void> {
    return new Promise((resolve) => {
      const listener = (updatedTabId: number, changeInfo: any) => {
        if (updatedTabId === tabId && changeInfo.status === "complete") {
          browser.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };
      browser.tabs.onUpdated.addListener(listener);
    });
  }

  async function startRecording() {
    const recordingType =
      (await storage.getItem<RecordingType>("local:recordingType")) || "";

    if (recordingType.includes("tab")) {
      recordTabState();
    } else {
      recordScreenState();
    }
  }

  async function stopRecording() {
    await toggleCamStateInStore(true, -1);
    recordTabState(false);
    //recordScreenState(false);
  }

  // watch for recording tab id change
  // send message to mount or remove cam shadow ui in page
  storage.watch<number>(
    "local:camRecTabId",
    (newCamRecTabId, oldCamRecTabId) => {
      if (oldCamRecTabId !== -1 && oldCamRecTabId !== null) {
        browser.tabs.sendMessage(oldCamRecTabId, { type: "UNMOUNT_CAM_UI" });
      }
      if (newCamRecTabId === -1) {
        return;
      } else {
        (async () => {
          const tab = await browser.tabs.query({
            active: true,
            currentWindow: true,
          });
          if (!tab || tab[0].id === undefined) {
            return;
          }
          const tabId = tab[0].id;
          if (newCamRecTabId === tabId) {
            browser.tabs.sendMessage(newCamRecTabId, { type: "MOUNT_CAM_UI" });
          }
        })();
      }
    }
  );

  //watch for start recording and stop recording
  storage.watch<boolean>("local:isRecording", async (newValue, oldValue) => {
    if (newValue === null) {
      return;
    }
    if (newValue) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  // watch for change url in camRecTabId
  // if url change mount cam shadow ui in page
  browser.tabs.onUpdated.addListener(async function (tabId, changeInfo, tab) {
    const camTabId = await getCamRecTabId();
    if (camTabId === tabId) {
      if (changeInfo.status === "complete") {
        try {
          await browser.tabs.sendMessage(tabId, { type: "MOUNT_CAM_UI" });
          console.log("Sent MOUNT_CAM_UI to", tabId);
        } catch (e) {
          console.warn("Failed to send MOUNT_CAM_UI:", e);
        }
      }
    } else {
      try {
        await browser.tabs.sendMessage(tabId, { type: "UNMOUNT_CAM_UI" });
      } catch (error) {
        console.log("Unable to send Unmount cam ui. error - ", error);
      }
    }
  });

  // watch for current active tab
  browser.tabs.onActivated.addListener(
    async (activeInfo: globalThis.Browser.tabs.OnActivatedInfo) => {
      console.log("Tab activeed : ", activeInfo);

      const recordState = await checkRocordingStates();
      if (recordState[0] && recordState[1] === "record_screen") {
        const activeTab = await browser.tabs.get(activeInfo.tabId);

        console.log("Active Tab Details : ", activeTab);

        if (!activeTab || !activeTab.id) {
          return;
        }

        const tabUrl = activeTab.url;

        const blockedUrls = ["brave://extensions", "chrome://extensions"];

        if (
          tabUrl &&
          activeTab.status === "complete" &&
          !blockedUrls.some((url) => tabUrl.startsWith(url))
        ) {
          await storage.setItem("local:camRecTabId", activeTab.id);
        }
      }
    }
  );
});
