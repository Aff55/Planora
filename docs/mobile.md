# Planora Mobile

Planora Mobile is a native Expo/React Native client, not a WebView. It shares the API and validation contracts with the web app while using native navigation, secure token storage, file sharing, system themes, and notifications.

## Run Locally

Start the API, then Expo:

```powershell
npm.cmd run dev:api
npm.cmd run dev:mobile
```

Use Expo Go or an Android/iOS emulator from the Expo terminal UI.

Development builds allow an API URL to be changed at login and in Settings:

- iOS simulator: `http://localhost:4000/api`
- Android emulator: `http://10.0.2.2:4000/api`
- Physical phone: use the computer's LAN address, such as `http://192.168.1.20:4000/api`

Production builds use `EXPO_PUBLIC_API_URL`. It must be an HTTPS URL and cannot be replaced from the UI.

## Product Coverage

The mobile app mirrors the web product:

- Authentication, session restore, profile, preferences, export, AI-data clearing, one-device/all-device logout, and verified account deletion.
- Dashboard, tasks, recurrence, subtasks, calendar, search, and recommendation feedback.
- Quick and custom life logs with editable history.
- Mood, sleep, water, and journal records with deletion controls.
- Privacy-gated companion context, short daily conversations, and learning status.
- Light, dark, and system themes.
- Native date/time pickers and previous/current/next month calendar browsing.

## Notifications

Notifications are scheduled locally after explicit permission:

- A daily brief at 9:00.
- Task and calendar reminders 30 minutes before their due/start times.
- Settings disable and cancel Planora reminders.
- Lock-screen text is intentionally generic so private task or wellbeing details are not exposed.
- Notification taps deep-link to the relevant native screen.
- Disabling notifications updates the account preference and clears scheduled reminders, so refresh cannot silently recreate them.

Remote push delivery requires an external push service and App Store/Play Store credentials. The current release does not send health, journal, task, or AI content to a remote notification provider.

Bearer tokens are stored in Secure Store. If server revocation cannot be confirmed during a device logout, the old token is isolated from the active session and retried automatically. Export files are deleted from the app cache immediately after the native share sheet closes.

## Builds

Bundle identifiers are `com.planora.app`. Configure EAS, set the production API environment variable, then run:

```powershell
npx eas-cli build --platform android --profile production
npx eas-cli build --platform ios --profile production
```

Apple and Google developer credentials are required to sign and distribute store builds.
