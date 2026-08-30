# Validation Notes

## What was verified in this build

- The latest attached website archive was compared against the earlier v1.2 reference and is byte-for-byte identical.
- The desktop prototype was audited; its old student/class rows were hard-coded and the old Add Student button had no real database action.
- The new desktop app contains no mock student/class datasets and does not write directly to MySQL.
- Desktop API calls use the same NestJS API used by the website.
- NFC-X hardware code in `desktop/electron/main.cjs` is equivalent to the known-working continuous scanner checkpoint after comments are ignored.
- Relative TypeScript imports resolve to real files.
- All `.ts` / `.tsx` sources were parsed by TypeScript successfully.
- Electron `main.cjs`, `preload.cjs`, and the database creation script pass Node syntax checks.
- The desktop Vite build uses `base: './'`, which is required for Electron `file://` loading after build.
- NFC ownership rules are enforced in the backend, not only in the desktop UI.
- Daily NFC check-ins have a database uniqueness constraint on student + date.
- NFC check-in records snapshot academic year and class at scan time so historical rows do not change when a student moves class later.
- Admin-only NFC summary/card-management endpoints are protected by backend roles.
- Disabled accounts are rechecked on authenticated requests, so an existing JWT no longer remains usable after an account is disabled.

## Environment limitation during generation

This environment could not complete `npm install` because registry access timed out, so a full dependency-backed Nest/Vite/Electron compilation could not be executed here. The source and JavaScript syntax checks above were completed, but the final dependency install/build must run on the target Windows machine.

Use:

```powershell
npm install
npm run db:update
npm run build
```

For development with the physical reader:

```powershell
npm run dev:desktop
```

The desktop workspace automatically runs `electron-rebuild -f -w node-hid` after install so the native HID module is rebuilt for the installed Electron version.
