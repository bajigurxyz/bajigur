# CLAUDE.md — skills/

**Placeholder.** No skills exist yet; do not author one unless a task asks for
it explicitly.

When skills are added:

- One directory per skill, each with a `SKILL.md` carrying `name` and
  `description` frontmatter. The description decides whether an agent loads the
  skill, so it must state the trigger, not just the topic.
- Skills describe workflow and intent. They must not duplicate API behaviour
  that belongs in `../apps/api`, or transport logic that belongs in
  `../apps/mcp`.
- This directory is not a bun workspace and has no build step.

See `README.md` for the intended purpose.
