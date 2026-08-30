# GitHub upload checklist

When you get back:

1. Download and extract the deployment ZIP.
2. Create a new GitHub repository (private is recommended while the project is under development).
3. Upload/push the **contents of the extracted folder**, not another ZIP inside the repo.
4. Confirm GitHub does **not** show any `.env` file containing real credentials.
5. Confirm these folders exist: `backend`, `frontend`, `desktop`, `.github`.
6. Commit and push.
7. Follow `DEPLOYMENT.md`.

Files intentionally included for configuration:

- `backend/.env.example`
- `frontend/.env.example`
- `desktop/.env.example`

Never replace those example files with real passwords in GitHub.
