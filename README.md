# mobi

## Mergeability status

The `work` branch currently only contains the stock Vite + React counter template (see `src/App.jsx`) after overwriting the previous multimedia application. Because this branch removes prior components such as `FaceMeshVisualizer`, `OrchestratorScreen`, and related hooks and logic, it conflicts with the mainline branch that still carries those files. GitHub marks the pull request as non-mergeable until the branch is rebased with main and the conflicting files are reconciled.
