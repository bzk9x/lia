using System;
using System.Runtime.InteropServices;
using Microsoft.Win32;

class Program
{
    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern int SystemParametersInfo(int uAction, int uParam, string lpvParam, int fuWinIni);

    private const int SPI_GETDESKWALLPAPER = 0x0073;
    private const int MAX_PATH = 260;

    static void Main(string[] args)
    {
        string wallpaperPath = GetWallpaperUsingSystemParametersInfo();
        
        if (!string.IsNullOrEmpty(wallpaperPath) && File.Exists(wallpaperPath))
        {
            Console.WriteLine(wallpaperPath);
            return;
        }

        string registryWallpaper = GetWallpaperFromRegistry();
        if (!string.IsNullOrEmpty(registryWallpaper) && File.Exists(registryWallpaper))
        {
            Console.WriteLine(registryWallpaper);
            return;
        }

        Environment.Exit(1);
    }

    static string GetWallpaperUsingSystemParametersInfo()
    {
        try
        {
            string wallpaper = new string('\0', MAX_PATH);
            SystemParametersInfo(SPI_GETDESKWALLPAPER, MAX_PATH, wallpaper, 0);
            wallpaper = wallpaper.Substring(0, wallpaper.IndexOf('\0'));
            return wallpaper;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            return string.Empty;
        }
    }

    static string GetWallpaperFromRegistry()
    {
        try
        {
            using (RegistryKey? key = Registry.CurrentUser.OpenSubKey(@"Control Panel\Desktop"))
            {
                if (key != null)
                {
                    object? wallpaperValue = key.GetValue("Wallpaper");
                    return wallpaperValue?.ToString() ?? string.Empty;
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error reading registry: {ex.Message}");
        }
        
        return string.Empty;
    }
}