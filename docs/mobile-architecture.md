# Mobile Architecture Notes

Planora Mobile is a native Expo/React Native client. It consumes the same stable REST endpoints and shared data contracts as the web app without embedding a WebView.

## Client Boundary

- Secure Store holds the revocable bearer session; Async Storage holds non-secret API/theme preferences.
- Native notifications schedule a daily brief and bounded task/calendar reminders locally.
- Native file sharing handles exports, and temporary files are removed after sharing.
- Calendar and task forms use platform date/time controls and responsive bottom navigation.

## Mobile AI Strategy

- Keep heavy LLM inference on a PC, local server, or backend by default.
- Make on-device inference optional and lightweight.
- Export small ranking and time-series models to Core ML or TensorFlow Lite when the neural engine matures.

## UI Guidance

- Preserve bottom navigation for primary sections.
- Avoid desktop-only hover dependencies.
- Use an agenda list with month navigation instead of a desktop calendar grid.
- Prefer local notifications only after notification preferences and permissions are explicit.
