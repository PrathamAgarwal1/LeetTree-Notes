# 🌳 LeetTree Notes

A powerful, local-first Chrome extension designed to transform your LeetCode grind into a highly structured, retrievable, and visually stunning knowledge base. Stop losing track of your problem-solving patterns. Build a personalized algorithm study suite directly in your browser.

## ✨ Key Features

* **📥 Seamless LeetCode Integration:** A content script automatically overlays on LeetCode pages, providing a "Save to LeetTree" button to instantly scrape problem descriptions, metadata, and your current code.
* **🧠 Active Recall Mode:** Code blocks in the dashboard are blurred by default. Force yourself to remember the logic before peeking!
* **🎨 Built-in Pattern Whiteboard:** A fully-featured drawing canvas integrated right into the rich text editor. Sketch out Sliding Window state, DP transitions, and Graph traversals without leaving the app.
* **📂 Folder & Topic Hierarchy:** Organize problems by algorithmic pattern (e.g., "Two Pointers", "Dynamic Programming").
* **📝 Topic-Level Notes:** Save rich text and whiteboard diagrams directly to a folder (topic) to consolidate your high-level strategy for specific patterns.
* **🤖 "Suggested Practice" Engine:** A smart sorting algorithm that mathematically prioritizes problems you need to review based on:
  * Explicit "Needs Revision" flags.
  * Time-decay (older problems bubble up).
  * Inherent Problem Difficulty weighting.
* **🔒 100% Local Storage:** Extremely fast and completely offline. Your notes belong to you. Includes easy JSON Export/Import for backups.
* **💎 Premium Aesthetics:** A highly polished, reactive, minimalist dark-mode design system.

## 🚀 Installation (Developer Mode)

Since this extension relies heavily on deep browser integration and local storage APIs, it is run locally:

1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** in the top left corner.
5. Select the `LeetTree-Notes` folder.
6. The extension is now installed! Click the LeetTree icon in your extensions menu to open your Dashboard, or visit a LeetCode problem to see the overlay!

## 🛠️ Tech Stack

* **Core:** HTML5, Vanilla JS (ES6 Modules), CSS3
* **APIs:** Chrome Extensions API (`chrome.storage.local`, `chrome.runtime`, Message Passing)
* **Design:** Bespoke CSS Design System, CSS Variables, SVG Icons
* **Rich Text:** `contenteditable` combined with custom-built text actions and base64 image encoding.

## 🤝 Contributing

This is a personal learning suite developed iteratively. However, if you find a bug or have a suggestion, feel free to open an issue or submit a PR!

---
*Built to help you crush technical interviews and master data structures & algorithms.*
