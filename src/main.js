const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { execFile, exec } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const copyFile = promisify(fs.copyFile);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

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
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  // Set Content Security Policy
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'"]
      }
    });
  });

  // Set up console logging from renderer
  ipcMain.on('console-log', (event, ...args) => {
    console.log('Renderer:', ...args);
  });

  ipcMain.on('console-error', (event, ...args) => {
    console.error('Renderer Error:', ...args);
  });

  ipcMain.on('console-warn', (event, ...args) => {
    console.warn('Renderer Warning:', ...args);
  });

  // Window controls
  ipcMain.on('window-minimize', () => {
    win.minimize();
  });

  ipcMain.on('window-close', () => {
    win.close();
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

  ipcMain.handle('build-android-app', async (event, config) => {
    try {
      const templatesDir = path.join(__dirname, 'android', 'templates');
      const androidDir = path.join(__dirname, 'android', 'lia');
      const appPackagePath = path.join(androidDir, 'app', 'src', 'main', 'java', 'com', 'lia', config.package);
      
      // Create package directory if it doesn't exist
      await fs.promises.mkdir(appPackagePath, { recursive: true });
      
      // Read template files
      const manifestTemplate = await readFile(path.join(templatesDir, 'other', 'manifest_template.xml'), 'utf8');
      const mainActivityTemplate = await readFile(path.join(templatesDir, 'kotlin', 'main_process_template.kt'), 'utf8');
      const layoutTemplate = await readFile(path.join(templatesDir, 'layout', 'layout_template.xml'), 'utf8');

      // Update strings.xml with app name
      const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${config.name}</string>
</resources>`;
      await writeFile(path.join(androidDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), stringsXml);

      // Replace placeholders in MainActivity
      const modifiedMainActivity = mainActivityTemplate
        .replace(/package com\.lia/, `package com.lia.${config.package}`)
        .replace(/setContentView\(R\.layout\.activity_main\)/, `setContentView(R.layout.activity_main)
        val webView = findViewById<WebView>(R.id.webview)
        webView.settings.javaScriptEnabled = true
        webView.webViewClient = WebViewClient()
        webView.loadUrl("${config.url}")`);

      // Write modified files
      await writeFile(path.join(appPackagePath, 'MainActivity.kt'), modifiedMainActivity);

      // Update build.gradle.kts with application ID
      const buildGradlePath = path.join(androidDir, 'app', 'build.gradle.kts');
      let buildGradle = await readFile(buildGradlePath, 'utf8');
      buildGradle = buildGradle.replace(
        /applicationId = "([^"]+)"/,
        `applicationId = "com.lia.${config.package}"`
      );
      await writeFile(buildGradlePath, buildGradle);

      // Run gradle build
      return new Promise((resolve, reject) => {
        const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
        console.log('Starting Gradle build...');
        
        const buildProcess = exec(
          `cd "${androidDir}" && ${gradlew} clean assembleDebug`,
          { maxBuffer: 1024 * 1024 * 10 }, // Increase buffer size for gradle output
          (error, stdout, stderr) => {
            if (error) {
              console.error('Build error:', error);
              console.error('Build output:', stdout);
              console.error('Build stderr:', stderr);
              reject(error);
              return;
            }
            console.log('Build completed successfully');
            resolve(path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'));
          }
        );

        // Log real-time build output
        buildProcess.stdout.on('data', (data) => {
          console.log('Gradle:', data.toString());
        });

        buildProcess.stderr.on('data', (data) => {
          console.error('Gradle Error:', data.toString());
        });
      });
    } catch (error) {
      console.error('Build process error:', error);
      throw error;
    }
  });

  ipcMain.handle('save-apk-file', async () => {
    const apkPath = path.join(__dirname, 'android', 'lia', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    
    const { filePath } = await dialog.showSaveDialog({
      defaultPath: 'app.apk',
      filters: [{ name: 'Android Package', extensions: ['apk'] }]
    });

    if (filePath) {
      await copyFile(apkPath, filePath);
      return filePath;
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