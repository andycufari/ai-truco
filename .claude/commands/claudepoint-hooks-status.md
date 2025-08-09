---
description: Show current ClaudePoint hooks configuration and installation status
---

Show the user their current ClaudePoint hooks configuration and whether they're properly installed.

Steps:
1. Run the CLI command: `claudepoint hooks status`
2. Explain the status output:
   - CONFIGURED & INSTALLED = Hooks are working
   - CONFIGURED BUT NOT INSTALLED = Need to run `claudepoint init-hooks --install`
   - DISABLED = Hooks are turned off locally
3. Show which triggers are available and their current state (CONFIGURED vs NOT IN CLAUDE CODE)
4. If hooks are not installed, suggest running `claudepoint init-hooks --install`

This helps users understand exactly what state their hooks are in.
