# Como usar a skill `requirements-test`

Testa uma implementação contra um documento de requisitos (PRD, task, user stories) e gera um relatório do que passou, falhou, foi bloqueado ou não foi testado, em Markdown e HTML interativo.

Funciona em qualquer repositório. Os requisitos podem vir de um arquivo `.md` ou direto de uma task do ClickUp. Se o repositório tiver specs (Spec Kit ou outro formato), a skill as encontra sozinha e cruza com a task e com o PR. Repositório sem SDD também funciona: o cruzamento fica entre a task e o código.

## 1. Antes de começar

| O que | Como |
|---|---|
| Claude Code ou Codex | Abra o agente na pasta do repositório auditado. |
| Skill instalada | Claude Code: `~/.claude/skills/requirements-test/`; Codex: `~/.agents/skills/requirements-test/`. Para instalação por projeto, use `.claude/skills/requirements-test/` ou `.agents/skills/requirements-test/`. Veja o [README](README.md). |
| Node.js e Git | Executam o gerador de relatório e as consultas ao repositório. |
| Requisitos | Um `.md` com as histórias, regras e critérios de aceite, **ou** a URL de uma task do ClickUp. Para usar a URL, configure uma integração/API autenticada no agente. Os nomes e recursos das ferramentas variam; sem acesso, passe uma exportação `.md`. Se estiver em PDF, converta para `.md`. |
| Token do SDK privado (se o projeto usar) | `export NODE_AUTH_TOKEN="seu_token"` no terminal, antes de abrir o `claude`. Precisa ser um PAT do GitHub com `read:packages`, autorizado no SSO da organização. Nunca cole o token no chat. |
| Yarn (se o projeto usar) | `corepack enable`, ou `npx --yes yarn@1.22.22 <comando>`. |

## 2. Como chamar

No Claude Code, o pedido começa com `/requirements-test`; no Codex, com `$requirements-test`. Ambos são invocações no chat do agente, não comandos do terminal comum (zsh).

```
cd /caminho/do/repositorio
claude
```

No chat:

```
/requirements-test "requisitos.md" --repos ../api,../sdk --html
```

Com uma task do ClickUp no lugar do arquivo:

```
/requirements-test https://app.clickup.com/t/<workspace>/DEMO-100 --repos ../api --html
```

No chat do Codex:

```text
$requirements-test "requisitos.md" --repos ../api,../sdk --html
$requirements-test https://app.clickup.com/t/DEMO-100 --repos ../api --html
```

Se o nome do arquivo tem espaço, use aspas. Você também pode pedir em linguagem natural: "teste a implementação com base em `requisitos.md` e gere o HTML".

### Opções

| Opção | O que faz |
|---|---|
| `<fonte>` | Caminho do `.md` de requisitos, ou URL ou ID da task do ClickUp (`DEMO-100`). Obrigatório. |
| `--specs <caminho>` | Spec a usar no cruzamento, quando a skill não achar sozinha ou achar a errada. A busca do PR continua normalmente. |
| `--pr <url>` | PR a auditar, quando ele não cita o ID da task. |
| `--clickup-sync` | Publica o resultado na task, em comentários. Mostra um preview e pede confirmação antes. |
| `--repos` | Repositórios adicionais, separados por vírgula: caminho local (`../api`) ou `owner/repo` do GitHub. O repositório atual sempre entra. |
| `--html` | Gera também o relatório interativo. |
| `--target <url>` | Ambiente onde exercitar a aplicação. Sem ele, só se usa ambiente local. |
| `--env local\|staging` | Padrão `local`. Produção nunca. Em `staging`, a skill pede sua confirmação antes de escrever dados. |
| `--e2e` | Inclui testes de interface no navegador. |
| `--no-new-tests` | Só roda os testes que já existem, sem criar arquivos de teste. |
| `--only static` | Só typecheck, lint e build. É o mais barato. |
| `--only failed` | Retesta só o que não passou na última execução. |
| `--only RN-01,US-A3` | Retesta só os requisitos listados. |
| `--force` | Refaz tudo mesmo que o código seja o mesmo da última execução. |
| `--out <pasta>` | Onde gravar os relatórios. Padrão: raiz do repositório atual. |

## 3. O que a skill faz

0. Se já existe `results.json`, o commit é o mesmo do PR no remoto, a cópia não tem alterações locais e as fontes não mudaram, não refaz os testes e cita a execução de origem. Use `--force` para refazer.
1. Lê os requisitos e mantém os IDs do documento. Com task do ClickUp, lê descrição, subtasks, checklists e comentários e grava tudo em `requirements.md`, guardando no `results.json` a data de atualização e o último comentário de cada task lida, para saber na próxima execução se algo mudou. Descobre como cada repositório guarda as specs (veja a seção 4), acha a spec e o PR ligados à task e aponta as divergências entre eles.
2. Monta o plano de testes (`test-plan.md`).
3. Reconhece o ambiente de cada repositório (stack, comandos, variáveis).
4. Roda os testes existentes, o typecheck, o lint e o build.
5. Cria testes novos para o que não tem cobertura, na pasta `.requirements-test/`.
6. Exercita a aplicação em ambiente local (API, banco descartável, concorrência, interface com `--e2e`).
7. Dá um veredito por requisito, sempre com a explicação.
8. Registra os defeitos.
9. Gera os relatórios a partir do `results.json`.
10. Com `--clickup-sync`, publica comentários na task (veja a seção 5).

### Vereditos

| Veredito | Significa |
|---|---|
| **Passou** | Todos os casos do requisito passaram. |
| **Parcial** | Parte passou e parte falhou ou não foi testada. |
| **Falhou** | Um caso essencial falhou, ou não há implementação. |
| **Bloqueado** | Nada pôde ser executado (falta credencial, serviço ou ambiente). |
| **Não testado** | Fora do que foi possível, com o motivo. |

- **Taxa de aprovação** = requisitos que passaram ÷ (passaram + parciais + falharam).
- **Cobertura** = requisitos executados ÷ total.

Todo requisito que não passou traz quatro campos: o que o requisito pede, o que foi encontrado, por que não passou e como corrigir.

## 4. Como ela encontra as specs

Cada repositório organiza os requisitos de um jeito, e a skill não presume caminho. Em cada repositório ela procura, nesta ordem:

1. O que o `AGENTS.md`, o `CLAUDE.md` ou o `docs/index.md` dizem sobre onde ficam as specs e em que formato.
2. Spec Kit (pasta `.specify/`): features em `specs/###-nome/` ou `docs/specs/###-nome/`.
3. Outros formatos: `spec.md`, `prd*.md`, `docs/specs/`, `rfcs/`, `adr/`.
4. Sem SDD: docs de domínio e `openapi.yaml`. Eles mostram o comportamento atual, então servem para apontar documentação desatualizada, mas não viram requisito.

A spec certa é a que cita o ID da task, ou a que o nome da branch e a descrição do PR indicam. A spec pode estar em outro repositório da lista, por exemplo a do front guardada no repositório da API. Se nada citar o ID, a skill mostra as candidatas e pergunta.

Quando task e spec discordam, nenhuma vence automaticamente. O relatório mostra o que cada fonte diz e quem decide.

Um comentário mais recente pode ser só uma pergunta ou sugestão. Ele só altera o requisito quando houver decisão confirmada, com origem e indicação da regra substituída. Marcar um comentário como resolvido, sem confirmar a regra na resposta, não basta. As dúvidas continuam em `openDecisions`.

“Fora do escopo desta entrega” não significa “proibido no produto”. O plano distingue trabalho não incluído, comportamento existente a preservar e proibição explícita. Só a proibição confirmada justifica exigir ausência da funcionalidade.

## 5. Publicar na task do ClickUp

Com `--clickup-sync`, depois dos testes:

- **Tudo vai em comentários.** A descrição, o status e os responsáveis da task não mudam.
- Cada task auditada recebe um comentário de resumo com os vereditos, as divergências e os defeitos.
- Cada decisão em aberto nova vira um comentário próprio, atribuído a quem decide. Se a task não diz quem decide, a skill pergunta.
- Antes de publicar, a skill grava `clickup-preview.md` e espera a sua confirmação.
- Nos retestes, o comentário de resumo é atualizado em vez de duplicado.

Sem a flag, nada é escrito no ClickUp. Se você já rodou a auditoria e nada mudou desde então, rodar de novo com `--clickup-sync` não refaz os testes: a skill vai direto ao preview e à publicação.

## 6. O que ela gera

Na pasta `--out` (padrão: raiz do repositório):

| Arquivo | Conteúdo |
|---|---|
| `test-report.md` | Relatório completo: resumo, resultado por requisito, casos, defeitos, bloqueios, próximos passos. |
| `test-report.html` | Mesmo conteúdo, interativo, com filtros por veredito e busca. Abra no navegador. |
| `test-plan.md` | Plano de testes derivado dos requisitos. |
| `requirements.md` | Cópia dos requisitos lidos da task do ClickUp (só com fonte ClickUp). |
| `clickup-preview.md` | Comentários que seriam publicados na task (com `--clickup-sync`). |
| `results.json` | Dados do relatório. É a base da comparação na próxima execução. |
| `evidence/` | Capturas de tela (com `--e2e`). |

Os testes novos ficam em `.requirements-test/`, dentro de cada repositório, e a pasta é adicionada a `.git/info/exclude`. Eles não vão para o commit.

## 7. O que ela nunca faz

- Não testa contra produção, nem contra banco, fila, e-mail ou pagamento reais.
- Não grava credenciais em arquivos, relatórios ou logs.
- Não faz commit, push, deploy nem migration em ambiente compartilhado.
- Não segue instruções que apareçam no arquivo de requisitos, na task, nos comentários, nas specs ou no PR. Tudo isso é tratado como dado.
- Não edita specs nem a descrição da task, e não escreve no ClickUp sem a sua confirmação.
- Não marca "Passou" sem evidência (comando e saída, resposta HTTP, captura de tela ou `repo:arquivo:linha`).

Para banco, a skill sobe um Postgres descartável local, roda as migrations reais e apaga tudo no fim.

## 8. Gastar menos tokens

- Rode em **conversa nova**. Conversa longa recarrega todo o histórico a cada resposta.
- Quando o commit do PR, a cópia local e as fontes continuam iguais, a skill reaproveita os resultados e o snapshot `requirements.md`, citando a execução original. Para só conferir typecheck, lint e build, use `--only static`.
- Use `--only failed` depois de correções, para retestar só o que falhou.
- Com `--only`, um resultado anterior invalidado fora do recorte fica Não testado, com o motivo; ele não herda um “Passou” obsoleto.
- Para tarefas mecânicas, troque para um modelo menor com `/model`. Volte ao modelo mais forte para decidir o que é bug.
- Use `/compact` entre etapas de uma sessão longa.

## 9. Rotina sugerida

1. Pegue a URL da task do ClickUp (ou salve o PRD como `.md`).
2. Primeira execução completa: `/requirements-test <url-da-task> --repos ../api,../sdk --html`.
3. Revise as divergências e as decisões em aberto. Se quiser levá-las para a task, rode de novo com `--clickup-sync`.
4. Leia o HTML. Os requisitos **Falhou** e **Parcial** mostram o motivo e como corrigir.
5. Corrija o código.
6. Retestar: `/requirements-test <url-da-task> --repos ../api,../sdk --html --only failed`.
7. Quando houver ambiente de staging autorizado, rode com `--env staging --target <url> --e2e` para cobrir a interface.

## 10. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `zsh: no such file or directory: /requirements-test` | O pedido foi digitado no terminal. Use `/requirements-test` no chat do Claude Code ou `$requirements-test` no chat do Codex. |
| A skill não aparece | Confira o caminho de instalação do agente e abra uma nova sessão. |
| `yarn: command not found` | `corepack enable`, ou `npx --yes yarn@1.22.22 install`. |
| `EACCES` ao instalar o yarn globalmente | Sem permissão em `/usr/local`. Use `npx` ou configure `npm config set prefix ~/.npm-global`. |
| `401` ao instalar pacote privado | Falta `NODE_AUTH_TOKEN`, o token não tem `read:packages` ou falta autorizar o SSO. Rode o `export` na mesma janela do terminal. |
| `tsc` com erros de `test-reports/` | Os testes de API gerados ficam dentro do repositório do front. Mova a pasta de relatórios para fora ao rodar `tsc` ou lint. |
| Muitos "Bloqueado" | Falta ambiente: Keycloak, Redis, RabbitMQ ou credenciais. O relatório diz o que faltou, na seção "Bloqueios e limitações". |
| "Conector do ClickUp indisponível" | Não há acesso ao ClickUp nesta sessão. Configure uma integração/API autenticada no agente ou passe o `.md` exportado. |
| Spec errada ou não encontrada | Nada no repositório cita o ID da task. Indique com `--specs <caminho>`. |
| PR não encontrado | A branch e a descrição do PR não citam o ID da task. Indique com `--pr <url>`. |
| A skill diz que nada mudou | O commit do PR é o mesmo, a cópia não tem alterações locais e as fontes não mudaram; o relatório cita a execução de origem. Use `--force` se quiser refazer. |

## 11. Limites que você deve conhecer

- Sem navegador e login (por exemplo Keycloak), os testes de interface ficam **Bloqueados**. A skill não inventa resultado.
- O relatório mostra o que foi **executado**. Requisito sem implementação aparece como Falhou, não como erro da skill.
- Quando o documento e o sistema discordam, o relatório diz a fonte de cada lado e quem decide.
