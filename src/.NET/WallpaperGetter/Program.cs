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
        Console.WriteLine("Getting system wallpaper path...\n");

        string wallpaperPath = GetWallpaperUsingSystemParametersInfo();
        
        if (!string.IsNullOrEmpty(wallpaperPath))
        {
            Console.WriteLine($"Wallpaper Path: {wallpaperPath}");
            
            if (File.Exists(wallpaperPath))
            {
                FileInfo fileInfo = new FileInfo(wallpaperPath);
                Console.WriteLine($"File Size: {fileInfo.Length / 1024.0:F2} KB");
                Console.WriteLine($"Last Modified: {fileInfo.LastWriteTime}");
            }
            else
            {
                Console.WriteLine("Note: File path retrieved but file does not exist at this location.");
            }
        }
        else
        {
            Console.WriteLine("Could not retrieve wallpaper using SystemParametersInfo.");
        }

        Console.WriteLine("\n--- Alternative Method (Registry) ---");
        string registryWallpaper = GetWallpaperFromRegistry();
        
        if (!string.IsNullOrEmpty(registryWallpaper))
        {
            Console.WriteLine($"Registry Wallpaper: {registryWallpaper}");
        }
        else
        {
            Console.WriteLine("Could not retrieve wallpaper from registry.");
        }

        Console.WriteLine("\nPress any key to exit...");
        Console.ReadKey();
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