# requirements-test

Skill para Claude Code e Codex que testa uma implementação contra um documento de requisitos em Markdown (PRD, task, user stories) ou uma task do ClickUp, cruzando com as specs do repositório quando existirem, e gera um relatório do que passou, falhou, foi bloqueado ou não foi implementado, em Markdown e HTML interativo. Cada falha vem com o motivo e a sugestão de correção.

## Instalação

Claude Code, instalação pessoal:

```sh
git clone https://github.com/ferpassos2508/requirements-test-skill ~/.claude/skills/requirements-test
```

Codex, instalação pessoal:

```sh
git clone https://github.com/ferpassos2508/requirements-test-skill ~/.agents/skills/requirements-test
```

Para instalação por projeto, use `.claude/skills/requirements-test` ou `.agents/skills/requirements-test` no repositório consumidor. Use um destino que ainda não exista. Para testar alterações ainda não publicadas, copie os arquivos da versão local em vez de clonar a versão remota. O formato `SKILL.md` é compartilhado; cada ambiente precisa oferecer suas próprias ferramentas de Git, ClickUp e execução.

Fontes dos caminhos e da invocação: [Claude Code](https://code.claude.com/docs/en/skills) e [Codex](https://developers.openai.com/codex/skills). Se a skill não aparecer após instalar, abra uma nova sessão.

## Uso rápido

Dentro do chat do Claude Code, na pasta do repositório:

```
/requirements-test "requisitos.md" --repos ../api,../sdk --html
/requirements-test https://app.clickup.com/t/<workspace>/<ID-DA-TASK> --repos ../api --html
```

No Codex, use `$requirements-test` com os mesmos argumentos. Esses pedidos são interpretados pelo agente; não são comandos de terminal.

Requisitos: Node.js e Git locais, além das ferramentas do projeto auditado. ClickUp pode ser acessado pela integração/API autenticada disponível; sem ela, forneça uma exportação Markdown. Não há dependência obrigatória de nomes de ferramentas de um conector específico.

Decisões precisam de confirmação e origem; funcionalidades fora da entrega não são proibidas automaticamente.

O guia completo, com todas as opções, está em [COMO-USAR.md](COMO-USAR.md).

## Validação local da skill

Na raiz deste repositório, execute `node --test test/report-portability.test.js`. O teste usa saídas temporárias, sem rede ou escrita no ClickUp.
