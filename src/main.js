const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const fs = require('fs');

async function getSystemWallpaper() {
  return new Promise((resolve, reject) => {
    const wallpaperGetterPath = path.join(__dirname, '.NET', 'WallpaperGetter', 'bin', 'Debug', 'net9.0', 'WallpaperGetter.exe');
    
    execFile(wallpaperGetterPath, (error, stdout, stderr) => {
      if (error) {
        console.error('Error executing WallpaperGetter:', error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error('WallpaperGetter stderr:', stderr);
        reject(new Error(stderr));
        return;
      }

      const wallpaperPath = stdout.trim();
      
      try {
        const imageData = fs.readFileSync(wallpaperPath);
        const base64Image = imageData.toString('base64');
        const mimeType = wallpaperPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        resolve(`data:${mimeType};base64,${base64Image}`);
      } catch (fsError) {
        reject(fsError);
      }
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,
    maximizable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('src/wwwroot/index.html');
}

app.whenReady().then(() => {
  ipcMain.handle('get-system-wallpaper', async () => {
    try {
      return await getSystemWallpaper();
    } catch (error) {
      console.error('Error getting wallpaper:', error);
      throw error;
    }
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});