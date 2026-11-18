# Justine Batuhan — portfolio

A local, responsive portfolio built with HTML, CSS, and JavaScript. No build step or database required.

## Preview

Run `node server.cjs` from this folder, then open http://127.0.0.1:4173. Stop the server with Ctrl+C. You can also open index.html directly.

## Customize

- Edit introduction, project description, and about text in `index.html`.
- Change colors and typography in `styles.css`.
- Adjust animations in `script.js`.
- The beach club artwork is an illustration, not a screenshot of the linked website.
- Add your actual project role, technologies, screenshots, and contact links when ready. These have intentionally not been invented.
- Google Fonts requires an internet connection; local fallback fonts work offline.

## Deploy later

Upload `index.html`, `styles.css`, `script.js`, and the `assets` folder to a static website host. The local preview server and this README are not needed for deployment. No secrets or credentials are required. The profile photo is an enhanced version of the provided portrait, stored in assets/justine-profile.png.


## Validation and security

Contact fields validate names, email format, message length, and invalid control characters. Inputs are encoded into a fixed-recipient email draft; this site has no message storage or backend delivery. Browser checks are usability checks, not server-side anti-spam protection.

The local preview server serves only an explicit public-file list, rejects other HTTP methods and foreign Host headers, checks resolved file paths, and sets CSP, nosniff, frame protection, referrer, and permissions headers. These HTTP headers must also be configured on the hosting provider when deploying static files; uploading files alone does not apply them. Use HTTPS on the deployed host.

Deploy `validation.js` and `qrcode.js` alongside `index.html`, `styles.css`, `script.js`, `access.js`, `access-config.js`, and the assets folder. Exclude server files, tests, screenshots, and this README from the public deployment.

Run the security regression checks with `node --test security.test.cjs`.

## Project activity indicators

Project cards display interactions and either download clicks or uses (live-project opens). Counts start at zero and are stored in localStorage for the current browser, including synchronization between tabs. They are not visitor-wide totals, unique users, completed downloads, or confirmed usage inside the linked projects. Clearing browser storage resets them. If storage is unavailable, counters work for the current page session. Shared analytics requires a backend or analytics service and instrumentation in the linked apps to measure actual use.

## Android app download

Sound Diary is listed under Work → App Development and uses the `Request access` flow (`SUPABASE-SETUP.md`).

## Public app downloads & QR codes

GovGuide Ph is listed under Work → App Development for direct public download with an auto-generated QR code (`qrcode.js`). Place your APK file at `assets/downloads/GovGuide-Ph.apk` and include it when deploying the `assets` folder.

To add more downloadable apps later, duplicate a `[data-app-qr]` card in `index.html`, set its `data-project-id`, `data-app-name`, `data-download-path`, and `data-download-filename` attributes, and add the file to `server.cjs` for local preview. When hosted online, each QR code automatically encodes your live site URL for that file.
