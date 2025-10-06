const { contextBridge, ipcRenderer } = require('electron');

// Create a logging API instead of modifying console
const logging = {
    log: (...args) => {
        console.log(...args);
        ipcRenderer.send('console-log', ...args);
    },
    error: (...args) => {
        console.error(...args);
        ipcRenderer.send('console-error', ...args);
    },
    warn: (...args) => {
        console.warn(...args);
        ipcRenderer.send('console-warn', ...args);
    }
};

// Expose APIs to renderer
contextBridge.exposeInMainWorld('api', {
    wallpaper: {
        getSystemWallpaper: () => ipcRenderer.invoke('get-system-wallpaper')
    },
    windowControls: {
        minimize: () => ipcRenderer.send('window-minimize'),
        close: () => ipcRenderer.send('window-close')
    },
    androidBuilder: {
        buildApp: (config) => ipcRenderer.invoke('build-android-app', config),
        saveApk: () => ipcRenderer.invoke('save-apk-file')
    },
    console: logging
});

contextBridge.exposeInMainWorld('androidBuilder', {
    buildApp: (config) => ipcRenderer.invoke('build-android-app', config),
    saveApk: () => ipcRenderer.invoke('save-apk-file')
});

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
      const element = document.getElementById(selector);
      if (element) element.innerText = text;
    };
  
    for (const dependency of ['chrome', 'node', 'electron']) {
      replaceText(`${dependency}-version`, process.versions[dependency]);
    }
  });