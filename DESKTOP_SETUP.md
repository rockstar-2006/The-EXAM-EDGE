# 🖥️ Faculty Quest - Desktop Secure Exam Browser Setup

This guide explains how to run, test, and build the **downloadable Desktop Secure Exam Browser** for Windows, macOS, and Linux.

---

## 🚀 1. Install Desktop Dependencies

Open your command prompt or PowerShell in the root `Quiz` folder and install Electron & Electron Builder:

```bash
npm install --save-dev electron electron-builder concurrently wait-on
```

---

## 🛠️ 2. Run in Development Mode

To start the Vite dev server and launch the desktop exam window:

```bash
npm run electron:dev
```

When you start a quiz:
- The desktop window automatically engages **True Kiosk Mode**.
- System shortcuts (`Alt+Tab`, `PrintScreen`, `Ctrl+C/V`, `F12`, `F11`, `Alt+F4`, etc.) are intercepted.
- External monitor attachments are detected dynamically.
- Lost window focus immediately applies blur and generates security strikes matching the mobile security policy.

---

## 📦 3. Build the Downloadable Installer (`.exe`)

To package a standalone `.exe` installer that students can download:

```bash
npm run electron:build
```

The compiled installer will be generated in:
```
Quiz/dist-electron/FacultyQuest-Setup-1.0.0.exe
```

---

## 🛡️ Security Features Included:
- **`mainWindow.setContentProtection(true)`**: Blocks OS-level screen capture and OBS/Discord screen sharing.
- **Dynamic Multi-Display Interception**: Detects if an HDMI/external display is plugged in.
- **Global Hotkey Suppression**: Preempts copy/paste, app switching, and browser refresh shortcuts.
- **Automatic Sync with Proctoring Engine**: Connects seamlessly with `StudentSecureQuiz.tsx` for strike counting, screen blurring, and auto-submission.
