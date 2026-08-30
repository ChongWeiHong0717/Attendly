# Upgrade From the Current Website + PC Prototype

This package is designed to use the **same MySQL database** as the latest attached website.

## 1. Back up the existing database

Before changing schema on a database that contains important school data, export/backup `school_attendance_v1` from phpMyAdmin/MySQL.

## 2. Keep your existing database configuration

The included backend uses the same default database name as the latest website:

```text
school_attendance_v1
```

If your current website uses a custom MySQL username/password/host, copy those values into:

```text
backend/.env
```

Use `backend/.env.example` as the template.

## 3. Do NOT run the fresh-install seed on an existing database

For an existing website database, do **not** run:

```powershell
npm run setup
```

and do not use `setup-windows.bat`.

Those are for a fresh development installation and include the demo seed routine.

## 4. Upgrade the existing schema

The easiest Windows route is:

```text
upgrade-existing-database.bat
```

Equivalent PowerShell commands:

```powershell
npm install
npm run db:update
```

This generates the updated Prisma client and pushes the NFC tables/relations into the same MySQL schema.

The new NFC data structures are additive:

- `NfcCard`
- `NfcCardAssignment`
- `NfcCheckIn`

Existing students, classes, users, enrollments, attendance sessions and absences are not intentionally reset by this upgrade path.

## 5. Start the integrated desktop app

```text
start-desktop-windows.bat
```

or:

```powershell
npm run dev:desktop
```

This starts the shared NestJS API and Electron desktop app.

To run website + API + desktop together:

```text
start-all-windows.bat
```

## 6. Keep the vendor NFC-X application closed

Only one application should hold the NFC HID interface at a time.

The Attendly desktop app talks directly to:

```text
VID 0483
PID 4343
MI_01 / interface 1
```

## 7. First validation sequence

### Shared database

1. Login to the desktop as Admin.
2. Open Students.
3. Add one test student to an existing class.
4. Open the website and confirm the same student appears there.
5. Change the class from the desktop and confirm the website reflects it.

### NFC assignment

1. Desktop Admin → Students.
2. Choose a student → Set NFC.
3. Click Start NFC scanner.
4. Tap the physical card.
5. Confirm the UID appears on that student's database-backed row.
6. Try the same UID on another student.
7. Cancel the transfer first and verify ownership stays unchanged.
8. Repeat and confirm transfer; the first student should become unassigned.

### Teacher check-in

1. Login as Teacher.
2. The teacher should see only NFC Check-In.
3. Confirm the reader status is connected.
4. Click **Start Taking Attendance**.
5. Tap an assigned card.
6. Confirm the student name, Student ID and class appear.
7. Tap the same student again; it should report already checked in rather than create a second record.
8. Open the website class attendance page; before final attendance is saved, an NFC-arrived student should load as Present while non-arrived students remain Unmarked.
