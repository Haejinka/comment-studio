# Back up and move drafts

[← Home](../README.md) · [Quick start](QUICK_START.md)

Automatic saving keeps your current work in the app or browser where you created it. A backup gives you a separate file you can keep, move, or restore.

## Export a backup

1. Open **Draft backups** near the bottom of the sidebar.
2. Choose **Export backup**.
3. Save `comment-studio-drafts.json` somewhere you can find it.

The file includes all comments, uploaded avatars, formatting, presets, and comment export settings. Keep the JSON file unchanged.

## Restore a backup

1. Open the app where you want the drafts.
2. Open **Draft backups → Import backup**.
3. Select your JSON backup file.

> [!IMPORTANT]
> Import replaces the current drafts and presets. Export the current working set first if you want to keep it too.

The editor validates the backup before importing it. A file with an unsupported version, invalid records, or more than 500 comments is rejected. Backup file size is limited to 30 MB.

## Move from the browser to Windows

| In your browser editor                                          | In the Windows app                        |
| --------------------------------------------------------------- | ----------------------------------------- |
| Open the browser profile and address where you made the drafts. | Open Comment Studio.                      |
| Choose **Draft backups → Export backup**.                       | Choose **Draft backups → Import backup**. |
| Save the JSON file.                                             | Select that JSON file.                    |

Your browser’s original drafts remain in that browser. The Windows app starts with its own profile, so it cannot automatically read browser drafts.

## Move to another computer

Export a backup, transfer the JSON file using your preferred method, and import it into Comment Studio on the other computer. Uploaded avatars are included, so you do not have to find those photos again.

The app interface’s Light/Dark preference is local to each app/browser profile and is not part of the draft backup.

## Where automatic drafts live

- **Windows:** the app’s WebView2 profile under Windows AppData.
- **Browser:** storage for the exact hostname and browser profile you used.

`localhost:5173` and `127.0.0.1:5173` are separate browser origins and therefore keep separate drafts. Private/incognito windows, clearing browser data, or deleting an app profile can remove those local drafts. A JSON backup is the portable copy.

## Update without losing your work

1. Export a backup.
2. Close the running app.
3. Download and open/install the new version from [Releases](https://github.com/Haejinka/comment-studio/releases).
4. If necessary, import your backup.

[Get help with a missing draft](TROUBLESHOOTING.md#my-drafts-are-missing)
