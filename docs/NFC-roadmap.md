# NFC Roadmap (Future Version)

NFC is not used in V1. Manual attendance remains the working attendance method.

When NFC is added, it should **not** replace the permanent Student ID.

Recommended future model:

- `Student` — permanent person record and permanent `studentCode`.
- `NfcCard` — physical card identified by UID.
- `NfcCardAssignment` — links a card to a student for a period of time.

This allows a returned Form 5 card to be assigned later to a new Form 1 student without changing either student's identity or historical records.

The NFC reader should resolve a card UID to the currently assigned Student ID, then call the same attendance rules already used by manual attendance.

Manual attendance should always remain available for lost cards, card replacement, hardware failure, or other exceptions.
