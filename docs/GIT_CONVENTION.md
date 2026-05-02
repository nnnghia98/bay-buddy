# Git & Commit Convention - Bay Buddy

This document defines the strict Git workflow and commit message formatting that must be followed when the user requests a commit.

## 1. Commit Message Structure

All commit messages must follow this pattern:
`<type>(<scope>): <subject>`

[Optional Body/Description]

### Types:

- `feat`: A new feature (e.g., AI parsing, new UI page).
- `fix`: A bug fix (e.g., fixing 401 error, db migration fix).
- `chore`: Maintenance tasks, dependencies, or formatting (e.g., updating .gitignore).
- `docs`: Documentation changes only (e.g., updating BUSINESS.md).
- `refactor`: Code change that neither fixes a bug nor adds a feature.

### Scopes (Workspace):

- `api`: Changes within `api/`.
- `web`: Changes within `web/`.
- `root`: Changes in the root directory (e.g., package.json, .gitignore).
- `docs`: Changes inside the `docs/` folder.
- `config`: CI/CD or environment configuration changes.

## 2. Commit Body (Description)

The body should provide a concise summary of "What" and "Why" (not "How").

- Use bullet points for multiple changes.
- Ensure the description is detailed enough to populate a GitHub Pull Request automatically.

## 3. Strict Rule: NO AUTO-PUSH

- When the user says **"commit code"** or **"commit code follows workspace and git convention"**, the Agent MUST:
  1. Run `git add .`
  2. Run `git commit -m "<formatted message>"`
  3. **STOP.** Do NOT run `git push`.
- The user will review the commit locally before pushing manually.

## 4. Examples

- `feat(api): add multimodal support for gemini-2.5-flash`
- `fix(web): resolve 401 unauthorized on ticket save`
- `chore(root): update .gitignore to exclude .env and pycache`
