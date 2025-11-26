import ReactDOM from "react-dom/client";
import { createShadowRootUi } from "#imports";
import Camera from "./Camera";

export default defineContentScript({
  matches: ["https://*/*","http://*/*"],
  async main(ctx) {

    let isMounted = false;

    const ui = await createShadowRootUi(ctx, {
      name: "wxt-cam-view",
      position: "overlay",
      anchor: "body",
      append: "last",
      onMount: (container) => {
        // Don't mount react app directly on <body>
        const wrapper = document.createElement("div");
        wrapper.setAttribute("allow", "camera; microphone;");
        wrapper.id = "VidWeft-camera-wrapper";
        container.append(wrapper);

        const root = ReactDOM.createRoot(wrapper);
        root.render(<Camera />);
        isMounted = true;
        return { root, wrapper };
      },
      onRemove: (elements) => {
        elements?.root.unmount();
        elements?.wrapper.remove();
        isMounted = false;
      },
    });

    browser.runtime.onMessage.addListener((message, _, sendResponse) => {
      if (message.type === "MOUNT_CAM_UI") {
        if (!isMounted) {
          ui.mount();
        }
        sendResponse(true)
        return true;
      }
      if (message.type === "UNMOUNT_CAM_UI") {
        if (isMounted) {
          ui.remove();
        }
        sendResponse(true)
        return true;
      }
    });
  },
});