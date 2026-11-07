# Windows app guide

[← Comment Studio](README.md)

## Download and open

- [**Windows installer**](https://github.com/Haejinka/comment-studio/releases/latest/download/Comment-Studio-Setup.exe) — install for your Windows account.
- [**Standalone executable**](https://github.com/Haejinka/comment-studio/releases/latest/download/Comment-Studio.exe) — open directly without installation.

The app targets Windows 10/11 x64 (Intel/AMD) and uses Microsoft Edge WebView2. The installer can download that runtime if it is missing. Normal editing and exporting work offline. The downloaded app does not need Node.js, Rust, Vite, or a terminal.

Current builds are unsigned. [Installation help →](docs/TROUBLESHOOTING.md#windows-says-the-publisher-is-unknown)

## Get started

Choose a platform and template, enter a username and comment, optionally upload a profile photo, and click **Export image**. Windows opens a Save As dialog. The default PNG has a transparent background and 2× resolution.

- The header’s **Light / Dark** controls change the editor and Windows title bar.
- The preview’s sun/moon controls change the comment image.
- **Copy image** and **Copy text** use the Windows clipboard.
- Repeated exports suggest available numbered filenames.
- Cancelling Save As reports cancellation rather than claiming success.

## Move existing browser drafts

In the browser editor, open **Draft backups → Export backup**. Open the Windows app and choose **Draft backups → Import backup**, then select the JSON file.

Import replaces current drafts and presets. Export those first if you want to retain them. The browser and Windows app keep separate local profiles.

## Guides

- [Illustrated quick start](docs/QUICK_START.md)
- [All editor controls](docs/USER_GUIDE.md)
- [Bulk mode and CSV](docs/BULK_AND_CSV.md)
- [Backups and migration](docs/BACKUPS.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Build and test the source](docs/DEVELOPMENT.md)

For the no-install executable, drafts stay in the app’s WebView2 profile under Windows AppData. Moving the executable does not carry those drafts to a different computer; use a JSON backup for that.
