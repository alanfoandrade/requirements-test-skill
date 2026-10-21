# requirements-test

Skill do [Claude Code](https://claude.com/claude-code) que testa uma implementação contra um documento de requisitos em Markdown (PRD, task, user stories) ou uma task do ClickUp, cruzando com as specs do repositório quando existirem, e gera um relatório do que passou, falhou, foi bloqueado ou não foi implementado, em Markdown e HTML interativo. Cada falha vem com o motivo e a sugestão de correção.

## Instalação

```bash
git clone https://github.com/ferpassos2508/requirements-test-skill ~/.claude/skills/requirements-test
```

Abra uma nova sessão do `claude`. O comando `/requirements-test` aparece em sessões iniciadas depois da instalação.

## Uso rápido

Dentro do chat do Claude Code, na pasta do repositório:

```
/requirements-test "requisitos.md" --repos ../api,../sdk --html
/requirements-test https://app.clickup.com/t/<workspace>/<ID-DA-TASK> --repos ../api --html
```

O guia completo, com todas as opções, está em [COMO-USAR.md](COMO-USAR.md).
