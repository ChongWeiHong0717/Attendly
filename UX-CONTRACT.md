# V1.2 UX Contract

## Navigation

- Admin navigation: Classes, Students, Teachers & Accounts, Academic Year.
- Teacher navigation: My Classes.
- Desktop uses a persistent 272px left sidebar.
- Mobile uses an off-canvas side drawer. No bottom navigation in V1.2.

## Teacher class experience

- Teacher class cards are a primary working surface and intentionally larger than ordinary admin cards.
- Phone: one class card per row.
- Laptop/desktop: normally two class cards per row so class names/actions stay prominent.
- Opening a class goes directly to its roster and attendance summary.
- The class screen gives the class identity, student count, Present/Absent summary and Take/Edit Attendance action strong visual priority.

## Student creation

- Student name is required; identical names are allowed.
- Student ID is optional. If blank, the backend generates a permanent unique ID. If supplied, it must be unique.
- IC/MyKid is optional. If supplied, it must be unique and is used as a secondary identifier for same-name students.
- Database `Student.id` remains the internal primary key; visible Student ID is not the database key.

## Search

- Student text search exists only inside a class roster and matches student name or Student ID.
- The Admin Students page may filter by Form/Class but has no global name/ID search.
- A non-empty class search exposes a clear button.

## Attendance

- Attendance remains Present / Absent only.
- No Mark All Present action.
- Every student must be explicitly marked before saving.
- Attendance progress shows marked students out of total students.
- Present uses green; Absent uses red; Unmarked/pending uses amber. Text/icons accompany color.
- Saved attendance can be reopened and corrected.

## Destructive and reversible actions

- Do not use browser `confirm()`/`alert()`/`prompt()`.
- Archive student and remove class use an app confirmation dialog and preserve history.
- After successful student/class removal, show Undo and restore the record when selected.
- Disabling an account requires confirmation and offers Undo by enabling the account again.
- Academic-year rollover is a high-impact state transition and retains typed confirmation; it has no Undo.

## Responsive behavior

- Phone layouts are a primary usage target.
- No overlapping controls at narrow widths.
- Student/account management uses stacked mobile cards rather than horizontally scrolling desktop tables.
- Attendance buttons remain large touch targets and form a two-column action row on phones.
- The attendance save action remains reachable on mobile without becoming navigation.

## Shared product-family identity

- `DESIGN.md` is the source of truth for the Campus Signal 1.2 visual identity.
- The future NFC desktop/PC application should reuse the same navy shell, teal-blue primary action color, cool surfaces, typography roles, radius family, and attendance status colors.

## Feedback

- API errors appear inline in the relevant page/dialog.
- Successful attendance save shows a concise status message.
- Reversible destructive operations use the shared Undo notification.
