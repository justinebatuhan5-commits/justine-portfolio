# Shared download counter (Firebase Firestore)

The GovGuide Ph "Download clicks" number is shared across all visitors once this is set up. Until then it falls back to per-browser counts.

## 1. Create the Firebase project
1. Open https://console.firebase.google.com and click **Add project** (Analytics not needed).
2. **Build → Firestore Database → Create database**. Choose a region near you (e.g. `asia-southeast1`) and start in **production mode**.
3. **Project settings (gear) → General → Your apps → Web (`</>`)**. Register an app (no hosting). Copy `projectId` and `apiKey` from the config shown.

## 2. Paste the public config
Edit `firebase-config.js`:

```js
window.PortfolioFirebaseConfig=Object.freeze({
 projectId:'your-project-id',
 apiKey:'AIza...'
});
```

These two values are public identifiers, not secrets. The rules below are what protect the data.

## 3. Publish the security rules
**Firestore Database → Rules**: paste the contents of `firestore.rules` and **Publish**. Visitors can then only read the `govguide-ph` counter and add exactly 1 to it. They cannot set other numbers, list, or delete.

## 4. Restrict the API key (recommended)
Google Cloud Console → **APIs & Services → Credentials** → your browser key → **Website restrictions**: add `https://justinebatuhan5-commits.github.io/*` (and your custom domain, if any). Under API restrictions, allow **Cloud Firestore API** only.

## 5. Deploy
Publish `firebase-config.js` together with the other site files. The first download click creates the `downloads/govguide-ph` document automatically.

## Limits
- It counts clicks on Download APK or the QR dialog's Download button, not completed downloads or installs.
- Each browser counts once per 24 hours. Someone who clears storage or uses another browser can still add more, so treat it as a rough total.
- To add another app later, add its id to the two lists in `firestore.rules` and give its card `data-app-qr`.
