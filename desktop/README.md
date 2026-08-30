# Attendly Desktop

Electron + React desktop client for the shared Attendly backend.

## Development

From the project root:

```powershell
npm run dev:desktop
```

Or from this folder while the API is already running:

```powershell
npm run dev
```

The desktop Vite renderer uses port **5174** so it can run beside the website on 5173.

## Build

```powershell
npm run build
npm start
```

## NFC-X

The hardware layer in `electron/main.cjs` is based on the known-working v1.1 checkpoint. Avoid changing the HID transaction code unless a new reader test proves the replacement first.
