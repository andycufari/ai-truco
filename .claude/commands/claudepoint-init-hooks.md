---
description: Initialize ClaudePoint hooks integration with Claude Code
---

Initialize ClaudePoint hooks to enable automatic safety checkpoints before major file operations.

Steps:
1. First check current status: `claudepoint hooks status`
2. If hooks are already configured and installed, inform the user they're already set up
3. If not configured: Run `claudepoint init-hooks --install` to automatically configure and install
4. If hooks are configured but not installed: Run `claudepoint init-hooks --install` to install to Claude Code settings
5. Explain what hooks will do:
   - Create automatic safety checkpoints before bulk file operations
   - Only enabled triggers will be active (by default: before_bulk_edit)
   - User can manage with `claudepoint hooks status` and `claudepoint hooks configure`

IMPORTANT: Always check status first before running init-hooks to avoid duplicate setup.
