# WaterVan

Water monitor for campervans/motorhomes.

Current development versions:
- Firmware: 8.5.0
- Android app: 0.10.0 beta

## Firmware update
The Android app sends the update command over BLE. WaterVan then downloads the signed release payload from this repository's GitHub Pages endpoint and verifies the MD5 before flashing. WaterVan must be connected to an Internet-enabled Wi-Fi network during the download.

Core water monitoring remains local and does not require Internet.
