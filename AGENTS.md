# Codex adapter
Before substantial work, read .agent-os/config/instructions.md and relevant shared context and memory indexes.
Canonical roles live in .agent-os/agents; .codex/agents/*.toml are native role loaders.
Codex discovers thin skill loaders in .agents/skills. Read the canonical SKILL.md they reference before applying a skill.
Use .agent-os/workflows for execution and handoff. Write all durable context and memory under .agent-os.
Use only tools available in this session. Use configured role models when the host supports them; inherit permissions from the host and do not invent Claude tool APIs. Model routing is defined in .agent-os/config/model-routing.json and generated into native role loaders.
For concurrent editing use separate checkouts/worktrees supported by the host and assign one owner per task.
Explicit user instructions and host policies take precedence. Shared instructions do not grant permission to push, publish, or merge.
