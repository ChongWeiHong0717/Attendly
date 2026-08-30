# Locked V1 Scope

## Teacher
- Login with Teacher role.
- See only classes assigned to that teacher for the active academic year.
- Assigned classes grouped by Form 1–5.
- Click class -> directly view student list.
- Class page: Present count, Absent count, Attendance button, student search, Add Student.
- Add Student from a class automatically uses that class.
- Student ID is optional on entry and auto-generated when blank; IC/MyKid is an optional secondary identifier.
- Attendance has only Present and Absent.
- No Mark All Present.
- All students must be explicitly marked before save.
- Reopen saved attendance to correct it.

## Admin
- Separate Admin interface.
- Manage Form 1–5 classes.
- View and filter students by Form/Class.
- Add, assign/move, archive and restore students.
- View absence dates.
- Create teacher/admin accounts.
- Assign teachers to classes for the current academic year.
- Start a new academic year.

## Data rules
- Student ID is permanent, unique and never reused, including after graduation/archive.
- Identical student names are allowed and never deduplicated by name.
- IC/MyKid is secondary/backup identification only.
- Student/class assignment is academic-year-specific.
- Teacher/class assignment is academic-year-specific.
- Year rollover preserves all old history and starts the new year with blank student-class and teacher-class assignments.
- Attendance stores one class/date session plus only absent students; it does not store one Present row per student per day.

## V1.1

- Major mobile-first UI/UX redesign with responsive sidebar/drawer navigation.
- Optional manual Student ID; automatically generate a unique permanent ID when blank.
- Optional IC/MyKid field as a secondary identifier; warn/reject duplicate Student IDs and IC/MyKid values.
- Student search only inside the class interface.
- App-owned destructive confirmations with Undo for reversible actions where practical.
- Excel/CSV import remains deferred to a future update.

## V1.2

- Full Campus Signal 1.2 visual redesign while preserving V1.1 functionality.
- Larger teacher class cards and stronger class/attendance hierarchy.
- Richer professional palette using deep navy, teal-blue, cool light surfaces and restrained sky/amber accents.
- Attendance progress visualization and clearer per-student status surfaces.
- Redesigned admin class, student, account and academic-year screens.
- The finalized visual system in `DESIGN.md` is also the design reference for the future NFC PC application.

## Future
- NFC card assignment/reassignment and NFC attendance using the same attendance service.
