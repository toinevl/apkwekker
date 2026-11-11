# AGENTS.md — werkwijze voor AI-agents in deze repo

Geldt voor elke agent die hier werkt (Claude Code, Codex, Hermes-subagents).
De mens integreert: agents committen lokaal in hun eigen worktree en pushen nooit.

## Definition of done
1. Code + tests groen: `cd api && npm test && cd ../frontend && npm test`
2. Voer de verificatie zelf uit vóór je 'done' claimt — nooit aannemen
3. Blijf binnen je eigen worktree en task-scope; raak geen sibling-tasks aan
4. Lint/typecheck indien aanwezig: `cd api && npx tsc --noEmit`

## Commit-formaat
`<type>: <korte omschrijving> (#<id>, agent: claude|codex|hermes)`
types: feat, fix, test, docs, refactor, chore

## Verboden voor workers
- `git push`, `gh pr create`, deploy-commando's — uitsluitend de controller
- Secrets lezen of wijzigen (`~/.claude/secrets/`, `.env*`, 0600-bronnenbestanden)
- Dependencies toevoegen zonder dat expliciet in de task-output te melden

## Testen
- `cd api && npm test` (vitest) en `cd frontend && npm test` (vitest)
- Falen = niet done. Rapporteer de exacte tail van de test-output in je eindmelding.
