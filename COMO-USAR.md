# Como usar a skill `requirements-test`

Testa uma implementação contra um documento de requisitos (PRD, task, user stories) e gera um relatório do que passou, falhou, foi bloqueado ou não foi testado, em Markdown e HTML interativo.

Funciona em qualquer repositório. Você só precisa de um arquivo `.md` com os requisitos.

## 1. Antes de começar

| O que | Como |
|---|---|
| Claude Code instalado | Abra o terminal na pasta do repositório e rode `claude`. |
| Skill instalada | Fica em `~/.claude/skills/requirements-test/`. Ela só aparece em sessões abertas depois de existir. |
| Requisitos em Markdown | Um `.md` com as histórias, regras e critérios de aceite. Se estiver em PDF ou ClickUp, converta ou exporte para `.md`. |
| Token do SDK privado (se o projeto usar) | `export NODE_AUTH_TOKEN="seu_token"` no terminal, antes de abrir o `claude`. Precisa ser um PAT do GitHub com `read:packages`, autorizado no SSO da organização. Nunca cole o token no chat. |
| Yarn (se o projeto usar) | `corepack enable`, ou `npx --yes yarn@1.22.22 <comando>`. |

## 2. Como chamar

O comando começa com `/` e vale **só dentro do chat do Claude Code**. No terminal comum (zsh) ele dá "no such file or directory".

```
cd /caminho/do/repositorio
claude
```

No chat:

```
/requirements-test "requisitos.md" --repos ../api,../sdk --html
```

Se o nome do arquivo tem espaço, use aspas. Você também pode pedir em linguagem natural: "teste a implementação com base em `requisitos.md` e gere o HTML".

### Opções

| Opção | O que faz |
|---|---|
| `<requisitos.md>` | Caminho do arquivo de requisitos. Obrigatório. |
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

0. Se já existe `results.json` e os commits são os mesmos, não refaz os testes (use `--force` para obrigar).
1. Lê os requisitos e mantém os IDs do documento.
2. Monta o plano de testes (`test-plan.md`).
3. Reconhece o ambiente de cada repositório (stack, comandos, variáveis).
4. Roda os testes existentes, o typecheck, o lint e o build.
5. Cria testes novos para o que não tem cobertura, na pasta `.requirements-test/`.
6. Exercita a aplicação em ambiente local (API, banco descartável, concorrência, interface com `--e2e`).
7. Dá um veredito por requisito, sempre com a explicação.
8. Registra os defeitos.
9. Gera os relatórios a partir do `results.json`.

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

## 4. O que ela gera

Na pasta `--out` (padrão: raiz do repositório):

| Arquivo | Conteúdo |
|---|---|
| `test-report.md` | Relatório completo: resumo, resultado por requisito, casos, defeitos, bloqueios, próximos passos. |
| `test-report.html` | Mesmo conteúdo, interativo, com filtros por veredito e busca. Abra no navegador. |
| `test-plan.md` | Plano de testes derivado dos requisitos. |
| `results.json` | Dados do relatório. É a base da comparação na próxima execução. |
| `evidence/` | Capturas de tela (com `--e2e`). |

Os testes novos ficam em `.requirements-test/`, dentro de cada repositório, e a pasta é adicionada a `.git/info/exclude`. Eles não vão para o commit.

## 5. O que ela nunca faz

- Não testa contra produção, nem contra banco, fila, e-mail ou pagamento reais.
- Não grava credenciais em arquivos, relatórios ou logs.
- Não faz commit, push, deploy nem migration em ambiente compartilhado.
- Não segue instruções que apareçam dentro do arquivo de requisitos. O arquivo é tratado como dado.
- Não marca "Passou" sem evidência (comando e saída, resposta HTTP, captura de tela ou `repo:arquivo:linha`).

Para banco, a skill sobe um Postgres descartável local, roda as migrations reais e apaga tudo no fim.

## 6. Gastar menos tokens

- Rode em **conversa nova**. Conversa longa recarrega todo o histórico a cada resposta.
- Se o código não mudou desde a última execução, a skill percebe sozinha e para. Para só conferir o ambiente, use `--only static`.
- Use `--only failed` depois de correções, para retestar só o que falhou.
- Para tarefas mecânicas, troque para um modelo menor com `/model`. Volte ao modelo mais forte para decidir o que é bug.
- Use `/compact` entre etapas de uma sessão longa.

## 7. Rotina sugerida

1. Receba o PRD ou a task e salve como `.md`.
2. Primeira execução completa: `/requirements-test "prd.md" --repos ../api,../sdk --html`.
3. Leia o HTML. Os requisitos **Falhou** e **Parcial** mostram o motivo e como corrigir.
4. Corrija o código.
5. Retestar: `/requirements-test "prd.md" --repos ../api,../sdk --html --only failed`.
6. Quando houver ambiente de staging autorizado, rode com `--env staging --target <url> --e2e` para cobrir a interface.

## 8. Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| `zsh: no such file or directory: /requirements-test` | O comando foi digitado no terminal. Digite dentro do chat do `claude`. |
| A skill não aparece | A sessão foi aberta antes da skill existir. Feche e abra o `claude` de novo. |
| `yarn: command not found` | `corepack enable`, ou `npx --yes yarn@1.22.22 install`. |
| `EACCES` ao instalar o yarn globalmente | Sem permissão em `/usr/local`. Use `npx` ou configure `npm config set prefix ~/.npm-global`. |
| `401` ao instalar pacote privado | Falta `NODE_AUTH_TOKEN`, o token não tem `read:packages` ou falta autorizar o SSO. Rode o `export` na mesma janela do terminal. |
| `tsc` com erros de `test-reports/` | Os testes de API gerados ficam dentro do repositório do front. Mova a pasta de relatórios para fora ao rodar `tsc` ou lint. |
| Muitos "Bloqueado" | Falta ambiente: Keycloak, Redis, RabbitMQ ou credenciais. O relatório diz o que faltou, na seção "Bloqueios e limitações". |
| A skill diz que nada mudou | Os commits são os mesmos da última execução. Use `--force` se quiser refazer. |

## 9. Limites que você deve conhecer

- Sem navegador e login (por exemplo Keycloak), os testes de interface ficam **Bloqueados**. A skill não inventa resultado.
- O relatório mostra o que foi **executado**. Requisito sem implementação aparece como Falhou, não como erro da skill.
- Quando o documento e o sistema discordam, o relatório diz a fonte de cada lado e quem decide.
