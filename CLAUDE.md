# Claude Coding Rules

## Token Efficiency
- Do NOT scan the entire repository.
- Inspect only files relevant to the current task.
- Do NOT open unrelated files.
- Do NOT reread files unnecessarily.
- Use targeted search.

## Code Changes
- Make the smallest possible change.
- Do NOT rewrite entire files.
- Do NOT refactor unrelated code.
- Do NOT modify working code unless required.
- Preserve existing UI, functionality and structure.
- Do not add unnecessary dependencies.

## Before Editing
- Find the exact relevant code first.
- If one file is enough, modify only one file.
- Only inspect another file when necessary.

## Response
- Keep responses very short.
- Do not explain reasoning.
- After completing the task, report:
  1. What changed
  2. Files modified
  3. Any remaining issue

## Important
Complete the task with minimum file reads,
minimum context, minimum edits and minimum output.