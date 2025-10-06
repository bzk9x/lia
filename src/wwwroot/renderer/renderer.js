async function setWallpaperImage() {
    try {
        const wallpaperData = await window.wallpaper.getSystemWallpaper();
        const bgImage = document.getElementById('bg-image');
        if (bgImage) {
            bgImage.src = wallpaperData;
        }
    } catch (error) {
        console.error('Error setting wallpaper:', error);
    }
}

function setupWindowControls() {
    const minimizeButton = document.getElementById('window-control-minimize');
    const closeButton = document.getElementById('window-control-close');

    if (minimizeButton) {
        minimizeButton.addEventListener('click', () => {
            window.windowControls.minimize();
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            window.windowControls.close();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setWallpaperImage();
    setupWindowControls();
});