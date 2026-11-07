# Troubleshooting

[← Home](../README.md) · [Quick start](QUICK_START.md) · [Report a bug](https://github.com/Haejinka/comment-studio/issues/new?template=bug_report.yml)

Choose the section that matches what you see.

<details>
<summary><strong>The app will not open</strong></summary>

Use the Windows x64 download from [Releases](https://github.com/Haejinka/comment-studio/releases/latest). These builds target 64-bit Windows 10/11 on Intel/AMD PCs.

Try the installer if you used the standalone executable. The app needs Microsoft Edge WebView2, which the installer can download when missing. That first runtime installation needs internet access. You do not need Node.js, Rust, or a command window to run the downloaded app.

If it still fails, include the exact error and Windows version in a bug report.

</details>

## Windows says the publisher is unknown

The current release is not digitally signed. An unknown-publisher notice can appear for that reason. Signed builds are not included in this release.

Use the assets attached to this repository’s [Releases page](https://github.com/Haejinka/comment-studio/releases). `SHA256SUMS.txt` lists the checksums of those assets for users who want to verify their download. If your organization manages the computer, follow its software-installation policy.

## I cannot find my exported PNG

In the Windows app, **Export image** opens a Save As dialog. The file goes into the folder you choose. If a name already exists in the suggested folder, the app offers a numbered default name, such as `comment (2).png`.

In the browser edition, use your browser’s Downloads list. It controls the download folder and duplicate-name suffixes.

Cancelling the Windows dialog means no file is saved. The app reports cancellation instead of success.

## Copy image does not work

The Windows app uses native image clipboard access. Try **Export image** instead if another app is holding the clipboard or your destination does not accept image pasting.

The browser edition depends on Clipboard API support and permission. If image copying is unavailable or denied, it can download the PNG instead. Copy image copies an image; **Copy text** is a separate action.

## The export has a black or white rectangle behind it

Open **Export settings** and choose **Background → Transparent**. A viewer may display transparent pixels against its own white or black background. Import the PNG over footage or another colored layer to check the alpha transparency.

The workspace grid is only a preview aid; it is not exported.

## The exported image is too small or too large

Change **Resolution** in Export settings. Preview zoom does not change the exported resolution. Try 2× first, then 3× or 4× if you need more pixels.

A 64-megapixel limit prevents oversized captures. For an unusually long comment, reduce the resolution or shorten the text.

## A font or emoji looks different

Emoji comes from the operating system. The TikTok reply heading uses Proxima Nova Semibold when installed and otherwise uses bundled Inter. Proxima is not redistributed with the app.

Uploaded avatars and bundled Inter fonts do not need a remote CDN. If an avatar fails to decode, replace it with a PNG or JPG and retry.

## My drafts are missing

Make sure you opened the same app/browser profile and address. The Windows app, `localhost:5173`, and `127.0.0.1:5173` each keep their own drafts.

Import a previously exported JSON backup through **Draft backups → Import backup**. [Backup and migration guide →](BACKUPS.md)

## My spreadsheet will not import

Save the spreadsheet as **CSV**, not `.xlsx`, and keep a `text` column in the first row. CSV UTF-8 is a useful choice for emoji and accented names.

Start with the [sample file](../samples/sample-comments.csv). Check exact platform/template names in the [CSV reference](BULK_AND_CSV.md#csv-column-reference). Import is limited to 500 rows per file.

## A bulk export is slow or uses too much memory

Export a smaller selection or lower the resolution. The app renders items one at a time and reports progress, but the ZIP is held in memory while it is being created.

A ZIP manifest lists individual rendering failures, if any. Do not treat a failed item as an exported image.

## Report a reproducible problem

Include:

- The app version and whether you used Windows or the browser edition.
- The selected platform/template and light/dark settings.
- A short sequence of steps that reproduces the issue.
- The exact error text and a screenshot, if useful.

Use sample text and a placeholder avatar when possible; an exported backup can contain original text and uploaded photos.
