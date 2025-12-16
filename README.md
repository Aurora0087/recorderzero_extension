***

# 🎥 RecorderZero

**RecorderZero** is a modern, feature-rich Chrome Extension for screen recording. It allows users to record their screen or specific tabs while providing a powerful floating camera overlay with real-time annotation and privacy tools.

Built with **React**, **TypeScript**, **Tailwind CSS**, and **WXT**.

## ✨ Key Features

### 🔴 Recording
- **Flexible Sources:** Record full screen or specific browser tabs.
- **Audio Control:** Toggle microphone on/off and select specific audio input devices.
- **Persistent State:** Remembers your microphone and camera preferences between sessions.

### 📸 Floating Camera Overlay
- **Always on Top:** Injected via Shadow DOM to float over any website without CSS conflicts.
- **Draggable:** Move the camera anywhere on the screen.
- **Shape Shifting:** Toggle between **Circle** and **Square** camera views.
- **Mirroring:** Auto-mirrored video feed for a natural webcam experience.

### 🛠️ On-Screen Tools
- **Privacy Blur:** Click any HTML element on the page to blur it (useful for hiding sensitive data like emails or API keys).
- **Annotation Suite:**
  - **Pen:** Freehand drawing.
  - **Arrow:** Drag-to-create arrows for pointing out details.
  - **Color Picker:** Randomize or select drawing colors.
  - **Smart Eraser:** Vector-based eraser (removes specific objects/strokes rather than pixels).

## 🛠️ Tech Stack

- **Framework:** [WXT](https://wxt.dev/) (Web Extension Tools)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Injected via Shadow DOM)
- **Icons:** Lucide React & React Icons
- **Build Tool:** Vite

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Aurora0087/recorderzero_extension.git
   cd recorderzero_extension
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Run Development Server**
   This will start the WXT dev server and automatically open a fresh Chrome instance with the extension installed.
   ```bash
   pnpm dev
   ```

### Building for Production
To generate the `dist` folder for publication:
```bash
pnpm build
```

## 🧠 How It Works

### 1. Shadow DOM Injection
The floating camera UI is injected into the webpage using a **Shadow Root**. This ensures that:
- The website's CSS does not break the RecorderZero UI.
- RecorderZero's Tailwind CSS does not bleed into the website.

*Note: Tailwind CSS is imported with the `?inline` query in Vite to inject the raw CSS string into the Shadow Root.*

### 2. The Annotation Layer
When drawing is enabled, a full-screen `<canvas>` overlay is created.
- **Vector Storage:** Unlike standard paint apps, drawings are stored as objects (paths).
- **Hit Detection:** The eraser calculates the mathematical distance from the mouse to the vector lines, allowing users to erase entire objects (arrows/strokes) with a single click.

### 3. Element Blurring
The "Blur" tool uses event delegation on the `document`.
- **Capture Phase:** It intercepts clicks using `{ capture: true }` to prevent links/buttons from triggering while in "Blur Mode."
- **CSS Filter:** Applies `filter: blur(12px)` to the targeted DOM element.

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.