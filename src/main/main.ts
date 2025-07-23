/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import { app, BrowserWindow, shell, ipcMain, screen, desktopCapturer } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

// Handle logout request from renderer
ipcMain.on('logout-user', () => {
  if (mainWindow) {
    mainWindow.webContents.send('force-logout');
  }
});

// Screenshot protection monitoring
let isMonitoring = false;
let monitoringInterval: NodeJS.Timeout | null = null;
let lastScreenshotCheck = 0;

ipcMain.on('start-protection', () => {
  if (!isMonitoring) {
    isMonitoring = true;
    startScreenshotProtection();
  }
});

ipcMain.on('stop-protection', () => {
  if (isMonitoring) {
    isMonitoring = false;
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }
  }
});

function startScreenshotProtection() {
  // Monitor for screen recording/capture attempts
  monitoringInterval = setInterval(async () => {
    try {
      // Check if screen capture is active by attempting to get desktop sources
      const sources = await desktopCapturer.getSources({ 
        types: ['screen'], 
        thumbnailSize: { width: 1, height: 1 } 
      });
      
      // On macOS, check if screen recording permission is granted
      if (process.platform === 'darwin') {
        const displays = screen.getAllDisplays();
        if (displays.length > 0) {
          // If we can get display info but sources is empty or restricted, 
          // it might indicate screen recording is active
          if (sources.length === 0) {
            mainWindow?.webContents.send('screenshot-detected');
          }
        }
      }
      
      // Additional check: Monitor for rapid screen capture attempts
      // This is a heuristic approach as direct detection is limited
      if (sources.length > 0) {
        const currentTime = Date.now();
        if (lastScreenshotCheck === 0) {
          lastScreenshotCheck = currentTime;
        } else {
          const timeDiff = currentTime - lastScreenshotCheck;
          if (timeDiff < 100) { // Very rapid successive calls might indicate recording
            mainWindow?.webContents.send('screenshot-detected');
          }
          lastScreenshotCheck = currentTime;
        }
      }
    } catch (error) {
      // If there's an error accessing desktop sources, it might indicate protection is active
      console.log('Desktop capture error (this might be normal):', error);
    }
  }, 1000); // Check every second
}

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug').default();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
      webSecurity: false, // Disabled for CORS testing – do not enable in production
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  // Enable content protection to prevent screenshots and screen recording
  if (process.platform === 'darwin' || process.platform === 'win32') {
    mainWindow.setContentProtection(true);
  }

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
