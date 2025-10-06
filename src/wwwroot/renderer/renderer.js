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

document.addEventListener('DOMContentLoaded', setWallpaperImage);