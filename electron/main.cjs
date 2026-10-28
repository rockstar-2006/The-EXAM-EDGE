const { app, BrowserWindow, globalShortcut, screen, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// 🔒 1. CRITICAL: Block Remote Debugging, Automation Ports, and Accessibility scraping
app.commandLine.appendSwitch('disable-remote-debugging');
app.commandLine.appendSwitch('disable-renderer-accessibility');

// Sanitize process arguments — reject hackers trying `--remote-debugging-port` or `--inspect`
const forbiddenArgs = [
  '--remote-debugging-port',
  '--remote-debugging-pipe',
  '--inspect',
  '--inspect-brk',
  '--inspect-port',
  '--remote-allow-origins',
  '--enable-automation'
];

for (const arg of process.argv) {
  if (forbiddenArgs.some(flag => arg.toLowerCase().startsWith(flag))) {
    console.error('⛔ Security Alert: Prohibited debugging argument detected:', arg);
    app.exit(1);
  }
}

// 🛡️ 2. Single Instance Lock (Prevents running multiple side-by-side exam processes)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let isExamActive = false;

// 🔍 3. Anti-Virtual Machine & Sandbox Detection
function detectVirtualMachine() {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // In dev mode allow running locally
    return false;
  }

  try {
    if (process.platform === 'win32') {
      // Check system manufacturer & model for VM signatures
      const output = execSync('wmic computersystem get manufacturer,model /format:csv', { timeout: 3000 })
        .toString()
        .toLowerCase();
      const bios = execSync('wmic bios get serialnumber,version /format:csv', { timeout: 3000 })
        .toString()
        .toLowerCase();

      const vmKeywords = ['vmware', 'virtualbox', 'vbox', 'qemu', 'kvm', 'xen', 'parallels', 'hyper-v', 'virtual'];
      for (const kw of vmKeywords) {
        if (output.includes(kw) || bios.includes(kw)) {
          return true;
        }
      }
    }
  } catch (err) {
    // If WMIC is blocked or fails, proceed safely
    console.warn('VM check non-blocking warning:', err.message);
  }
  return false;
}

function createWindow() {
  // Reject Virtual Machines in production
  if (detectVirtualMachine()) {
    dialog.showErrorBox(
      'Security Environment Violation',
      'This examination application cannot be executed inside a Virtual Machine, Sandbox, or Hypervisor. Please run directly on physical host hardware.'
    );
    app.exit(1);
    return;
  }

  // Completely eliminate application menu bar
  Menu.setApplicationMenu(null);

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;

  mainWindow = new BrowserWindow({
    x: 0,
    y: 0,
    width: width,
    height: height,
    autoHideMenuBar: true,
    show: false, // Don't show until maximized and ready to prevent small initial box
    kiosk: true,
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: process.env.NODE_ENV === 'development',
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Enable display protection against OBS / Screen Recorders
  try {
    mainWindow.setContentProtection(true);
  } catch (e) {
    console.warn('setContentProtection failed or not supported:', e);
  }

  // Load the web app directly into Student Login for the desktop exam app
  const startUrl = process.env.ELECTRON_START_URL || 'http://localhost:8080/#/student/login';
  if (!app.isPackaged) {
    mainWindow.loadURL(startUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/student/login'
    });
  }

  // Once ready to show, explicitly lock full monitor bounds and maximize
  mainWindow.once('ready-to-show', () => {
    mainWindow.setBounds({ x: 0, y: 0, width, height });
    mainWindow.maximize();
    mainWindow.setFullScreen(true);
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.show();
    mainWindow.focus();
  });

  // Monitor focus loss during active exams
  mainWindow.on('blur', () => {
    if (isExamActive && mainWindow) {
      mainWindow.webContents.send('proctoring:violation', {
        type: 'focus-loss',
        reason: 'Lost window focus or attempted to switch applications'
      });
      setTimeout(() => {
        if (isExamActive && mainWindow) {
          mainWindow.setAlwaysOnTop(true, 'screen-saver');
          mainWindow.focus();
        }
      }, 500);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 🛡️ STRICT EXAM LOCKDOWN (Active hotkey interception during test)
function enableExamLockdown() {
  if (!mainWindow) return;
  isExamActive = true;

  console.log('🔒 EXAM LOCKDOWN ACTIVATED');

  // Multi-monitor verification
  const displays = screen.getAllDisplays();
  if (displays.length > 1) {
    mainWindow.webContents.send('proctoring:violation', {
      type: 'multi-monitor',
      reason: 'Multiple monitors detected. Disconnect external displays.'
    });
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  mainWindow.setBounds({ x: 0, y: 0, width, height });
  mainWindow.maximize();
  mainWindow.setFullScreen(true);
  mainWindow.setKiosk(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.focus();

  // Block cheating and window-switching hotkeys at the OS level
  const blockedKeys = [
    'CommandOrControl+C',
    'CommandOrControl+V',
    'CommandOrControl+X',
    'CommandOrControl+A',
    'Alt+Tab',
    'Alt+F4',
    'Alt+Space',
    'Alt+Esc',
    'CommandOrControl+W',
    'CommandOrControl+Q',
    'CommandOrControl+R',
    'CommandOrControl+N',
    'CommandOrControl+T',
    'CommandOrControl+M',
    'F5',
    'F11',
    'F12',
    'CommandOrControl+Shift+I',
    'CommandOrControl+Shift+J',
    'CommandOrControl+Shift+C',
    'PrintScreen'
  ];

  blockedKeys.forEach((shortcut) => {
    try {
      globalShortcut.register(shortcut, () => {
        if (isExamActive && mainWindow) {
          mainWindow.webContents.send('proctoring:violation', {
            type: 'blocked-shortcut',
            reason: `Prohibited shortcut attempt: ${shortcut}`
          });
          mainWindow.focus();
        }
      });
    } catch (err) {
      console.warn(`Could not register globalShortcut ${shortcut}:`, err);
    }
  });
}

// 🔓 RELEASE LOCKDOWN AFTER SUBMIT
function disableExamLockdown() {
  if (!mainWindow) return;
  isExamActive = false;

  console.log('🔓 EXAM LOCKDOWN RELEASED');

  globalShortcut.unregisterAll();
  mainWindow.setClosable(true);
}

// IPC Communication with Frontend
ipcMain.on('exam:start-lockdown', () => {
  enableExamLockdown();
});

ipcMain.on('exam:end-lockdown', () => {
  disableExamLockdown();
});

// ❌ Clean Exit Handler (Allowed outside active exam)
ipcMain.on('app:close', () => {
  if (isExamActive) {
    dialog.showErrorBox(
      'Action Prohibited',
      'You cannot exit the application while an examination is actively in progress. Please complete and submit your exam first.'
    );
    return;
  }
  if (mainWindow) {
    mainWindow.setClosable(true);
    mainWindow.close();
  }
  app.quit();
});

ipcMain.handle('exam:check-environment', () => {
  const displays = screen.getAllDisplays();
  return {
    isMultiDisplay: displays.length > 1,
    displayCount: displays.length,
    isDesktopApp: true
  };
});

app.whenReady().then(() => {
  screen.on('display-added', () => {
    if (isExamActive && mainWindow) {
      mainWindow.webContents.send('proctoring:violation', {
        type: 'multi-monitor',
        reason: 'External monitor plugged in during active assessment!'
      });
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
