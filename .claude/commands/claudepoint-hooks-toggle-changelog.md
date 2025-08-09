---
description: Toggle automatic changelog entries for ClaudePoint hooks
---

Toggle whether ClaudePoint hooks automatically create changelog entries when creating safety checkpoints.

Steps:
1. Ask the user: "Do you want to enable or disable automatic changelog entries for hooks? (enable/disable)"
2. Wait for their response
3. Run the appropriate command:
   - To enable: `claudepoint hooks set-changelog true`
   - To disable: `claudepoint hooks set-changelog false`
4. Confirm the change and explain the impact:
   - Enabled: Hooks will create both checkpoints AND changelog entries
   - Disabled: Hooks will only create safety checkpoints

This gives users control over documentation level.
