# Claude Code adapter
@.agent-os/config/instructions.md

Canonical roles live in .agent-os/agents; .claude/agents/*.md load those definitions.
Skills are discovered through .claude/skills and load their canonical .agent-os/skills/<name>/SKILL.md.
Read shared context and relevant memory before substantial work. Write context, decisions, and memory only under .agent-os.
Follow .agent-os/workflows/handoff.md when exchanging work with another runtime.
Use Claude Code's available Agent/Skill tools and tool allowlists; model: inherit keeps the active model.
For concurrent independent implementation use Agent isolation: worktree when supported. Never assume another runtime has these APIs.
Explicit user instructions and host policies take precedence. No credentials or MCP connections are configured by this package.