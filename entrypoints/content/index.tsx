import ReactDOM from "react-dom/client";
import { createShadowRootUi } from "#imports";
import Camera from "./Camera";
import tailwindCss from "@/assets/tailwind.css?inline"; 

export default defineContentScript({
  matches: ["https://*/*", "http://*/*"],
  cssInjectionMode: "ui", 

  async main(ctx) {
    let isMounted = false;

    const ui = await createShadowRootUi(ctx, {
      name: "wxt-cam-view",
      position: "inline",
      anchor: "body",
      append: "last",
      // Inject the Tailwind CSS string into the Shadow DOM
      css: tailwindCss, 
      
      onMount: (container, shadow, shadowContainer) => {
        // Create a wrapper div
        const wrapper = document.createElement("div");
        wrapper.id = "VidWeft-camera-wrapper";
        wrapper.className = "antialiased recorder-zero"; 

        const root = ReactDOM.createRoot(wrapper);
        root.render(<Camera />);
        container.append(wrapper);
        
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
        sendResponse(true);
        return true;
      }
      if (message.type === "UNMOUNT_CAM_UI") {
        if (isMounted) {
          ui.remove();
        }
        sendResponse(true);
        return true;
      }
    });
  },
});