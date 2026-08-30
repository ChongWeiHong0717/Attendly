# Attendly — Integrated Web + Desktop NFC Attendance

> **Deployment-ready staging package.** If you are uploading this to GitHub, start with [`GITHUB_UPLOAD_CHECKLIST.md`](GITHUB_UPLOAD_CHECKLIST.md), then follow [`DEPLOYMENT.md`](DEPLOYMENT.md).

This package combines the latest school attendance website/backend with the full Windows desktop client.

## Architecture

There is **one backend and one MySQL database**.

```text
React website (port 5173) ─┐
                           ├── NestJS API (port 3000) ── Prisma ── MySQL
Electron desktop (5174/dev)┘
          │
          └── NFC-X HID reader (VID 0483 / PID 4343 / MI_01)
```

The desktop app never writes directly to MySQL. It signs in through the same JWT authentication endpoint as the website and uses the same protected API.

## NFC hardware checkpoint preserved

The Electron NFC layer is copied from the known-working standalone v1.1 checkpoint:

- VID `0483`
- PID `4343`
- HID interface `MI_01` / interface `1`
- 64-byte HID reports
- permanent HID input listener
- proven `0x51 → 0x83 → 0x51` transaction
- one-shot UID reading
- continuous scanning
- duplicate held-card suppression

Do not replace this HID protocol with keyboard capture.

## New shared database features

### NFC cards

`NfcCard` stores the physical UID and the student's **current** ownership.

Rules:

- one student can have at most one current NFC card;
- one UID can have at most one current student;
- an assigned card can be transferred after explicit admin confirmation;
- transferring removes the UID from the old student;
- replacing a student's card detaches their old card;
- `NfcCardAssignment` preserves ownership history.

The physical card itself is not rewritten. Only the database relationship changes.

### NFC check-ins

`NfcCheckIn` stores daily gate arrivals.

- A successful NFC scan creates one check-in per student/date.
- Repeated scans return `duplicate` and do not create another row.
- Unknown/unassigned cards are not recorded as attendance.
- The record keeps the UID string, student, scanning user and timestamp.
- Card reassignment later does not rewrite old check-in history.

The website's existing class attendance/absence system remains intact. NFC check-in represents **arrival**, while final class Present/Absent confirmation remains the existing attendance workflow.

## Desktop roles

### Teacher

A teacher signs in and sees only the NFC Check-In terminal.

Scanning starts **only** after clicking:

`Start Taking Attendance`

Flow:

```text
Start Taking Attendance
→ NFC-X continuous scan
→ student taps card
→ UID read
→ shared API lookup
→ student/class displayed
→ NFC check-in stored
→ scanner waits for next card
```

### Administrator

Admin desktop sections:

- Overview
- Students
- Classes
- Teachers
- Attendance / NFC arrival history
- NFC Check-In
- Excel Import placeholder
- Settings / academic-year rollover

### Student management

The desktop **Add Student** button now calls the real backend.

Admin can:

- add a student into a class;
- leave Student ID blank for backend auto-generation;
- optionally provide IC/MyKid;
- move the current-year class;
- archive a student;
- assign or replace NFC;
- remove NFC;
- transfer a card from another student after a warning.

### Card transfer

If an admin tries to assign a UID that belongs to another student, the backend responds with `NFC_TRANSFER_REQUIRED`.

The desktop shows:

- current owner;
- target student;
- UID being moved;
- target student's existing UID, if any.

Nothing changes until the admin confirms.

## Prerequisites

Windows:

1. Node.js 22 LTS
2. XAMPP MySQL/MariaDB running
3. NFC-X reader
4. Vendor NFC-X software **closed** while Attendly is using the reader

## Existing database upgrade

> **Important:** If this database already contains your current website data, do **not** run `npm run setup` or `setup-windows.bat`. Those are fresh/demo setup paths and include seeding. Use the upgrade path below.

If you already have the website/database installed, use the updated project and run from the root:

```powershell
npm install
npm run db:update
```

`db:update` performs:

```text
prisma generate
prisma db push
```

This adds the NFC tables/relations to the existing database. It does not intentionally clear the existing student/class/attendance data.

If this is a fresh installation instead:

```powershell
npm run setup
```

## Run website + API

```powershell
npm run dev
```

- Website: `http://localhost:5173`
- API: `http://localhost:3000/api`

## Run desktop + API

```powershell
npm run dev:desktop
```

This runs:

- API on port 3000
- desktop Vite renderer on port 5174
- Electron desktop window

## Run all three

```powershell
npm run dev:all
```

## Desktop production-style local build

```powershell
npm run build -w desktop
npm start -w desktop
```

`npm start -w desktop` loads the built `desktop/dist` files.

## NFC native module troubleshooting

The known working tests used `node-hid` 3.2.x.

The desktop workspace now runs `electron-rebuild -f -w node-hid` automatically after `npm install`. If you ever need to repeat it manually, run:

```powershell
npm run rebuild-hid -w desktop
```

Do **not** repeatedly rebuild just because the reader is not found; first confirm Windows exposes:

```text
VID_0483
PID_4343
MI_01
```

## Windows helper scripts

- `upgrade-existing-database.bat` — use this when you already have the latest website database and only need the NFC schema/API upgrade.
- `start-desktop-windows.bat` — starts the shared API and Electron desktop app.
- `start-all-windows.bat` — starts API, website, and desktop together.
- `start-windows.bat` — keeps the original website + API startup behavior.

See `MIGRATION_FROM_CURRENT.md` for the safest existing-database upgrade sequence and `VALIDATION.md` for the checks completed during generation.

## Seed accounts

Admin:

```text
Local demo only: admin@school.local
Local demo password: admin123
```

Teacher:

```text
Local demo only: teacher@school.local
Local demo password: teacher123
```

## Recommended validation sequence

### Database/admin

1. Start MySQL.
2. Start API + desktop.
3. Sign in as admin.
4. Open Students.
5. Add a student.
6. Confirm the new record also appears on the website.
7. Change the student's class and confirm both clients reflect it.

### NFC assignment

1. Open the student's `Set NFC` dialog.
2. Click `Start NFC scanner`.
3. Tap the card.
4. Confirm the UID appears on the student.
5. Try assigning that UID to another student.
6. Cancel the transfer once and verify ownership stays unchanged.
7. Repeat and confirm transfer.
8. Verify the previous student becomes unassigned.

### Teacher check-in

1. Sign in as teacher.
2. Confirm NFC-X reports connected.
3. Click `Start Taking Attendance`.
4. Tap an assigned card.
5. Confirm student name, Student ID and class appear.
6. Tap the same card again and confirm it reports duplicate.
7. Tap an unassigned card and confirm it reports unknown.
8. Sign in as admin and open Attendance to confirm the successful check-in is stored.

## Files

- `backend/` — shared NestJS + Prisma API
- `frontend/` — existing attendance website
- `desktop/` — Electron + React admin/NFC client
- `backend/src/nfc/` — NFC card and check-in API
- `backend/prisma/schema.prisma` — shared database schema

## Important deployment notes

This is still a local-development school system. Before real deployment, add production secrets, HTTPS/network controls, database backups, audit retention policies, and an appropriate privacy/security review for school data.
