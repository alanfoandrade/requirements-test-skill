#!/usr/bin/env node
// Uso: node build-report.js <results.json> <out-dir> [--html]
// Gera <out-dir>/test-report.md (e test-report.html com --html) a partir do results.json.
// results.json segue o formato de DATA em report-template.html (title, subtitle, meta, env, risks,
// requirements, tests, defects, comparison, notImplemented, openDecisions, outOfScope, limits, createdTests, nextSteps, foot).
const fs = require('fs'), path = require('path');
const [, , input, out, ...flags] = process.argv;
if (!input || !out) { console.error('uso: node build-report.js <results.json> <out-dir> [--html]'); process.exit(1); }
const D = JSON.parse(fs.readFileSync(input, 'utf8'));
const R = D.requirements || [], T = D.tests || [], DF = D.defects || [];
const ST = { pass: 'Passou', partial: 'Parcial', fail: 'Falhou', blocked: 'Bloqueado', untested: 'Não testado' };
const RT = { pass: 'Passou', fail: 'Falhou', blocked: 'Bloqueado', skip: 'Não testado' };

// Consistência: todo caso aponta para requisito existente e vice-versa.
const rid = new Set(R.map(r => r.id)), tid = new Set(T.map(t => t.id)), errs = [];
T.forEach(t => { if (!rid.has(t.req) && !String(t.req).split(/,\s*/).every(x => rid.has(x))) errs.push(`caso ${t.id} -> requisito inexistente ${t.req}`); });
R.forEach(r => (r.tcs || []).forEach(c => { if (!tid.has(c)) errs.push(`requisito ${r.id} -> caso inexistente ${c}`); }));
R.forEach(r => { if (r.s !== 'pass' && !(r.exp && r.got && r.obs && r.fix)) errs.push(`requisito ${r.id} (${r.s}) sem exp/got/obs/fix`); });
if (errs.length) { console.error('Inconsistências:\n- ' + errs.join('\n- ')); process.exit(2); }

// Fonte ClickUp: sem o estado de cada task lida, a próxima execução não sabe se a task mudou (passo 0).
const S = D.source || {};
if (S.type === 'clickup') {
  const st = S.tasks || [], miss = st.filter(t => !t.dateUpdated || !('lastCommentId' in t) || !Array.isArray(t.subtaskIds));
  if (!st.length || miss.length) console.warn(`aviso: source.tasks incompleto (${st.length} tasks, ${miss.length} sem dateUpdated/lastCommentId/subtaskIds); a próxima execução vai reler a task inteira.`);
}

const c = { pass: 0, partial: 0, fail: 0, blocked: 0, untested: 0 }; R.forEach(r => c[r.s]++);
const ex = c.pass + c.partial + c.fail, pct = ex ? Math.round(c.pass / ex * 100) : 0, cov = R.length ? Math.round(ex / R.length * 100) : 0;
const tc = { pass: 0, fail: 0, blocked: 0, skip: 0 }; T.forEach(t => tc[t.r]++);
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const item = x => x && typeof x === 'object' ? `**${x.t}**${x.d ? ' — ' + x.d : ''}` : x;
const list = (title, a) => a && a.length ? `\n## ${title}\n${a.map(x => '- ' + item(x)).join('\n')}\n` : '';
const label = { fail: 'Por que falhou', partial: 'O que falta para passar', blocked: 'Por que ficou bloqueado', untested: 'Por que não foi testado' };

let md = `# ${D.title}\n${(D.meta || []).join(' • ')}\n\n${D.env || ''}\n\n## Resumo\n`;
md += `- Requisitos: ${c.pass} passaram, ${c.partial} parciais, ${c.fail} falharam, ${c.blocked} bloqueados, ${c.untested} não testados (total ${R.length}).\n`;
md += `- Casos: ${tc.pass} passaram, ${tc.fail} falharam, ${tc.blocked} bloqueados, ${tc.skip} não testados (total ${T.length}).\n- Aprovação: ${pct}%. Cobertura: ${cov}%.\n`;
md += list('Maiores riscos', D.risks) + list('Comparação com a execução anterior', D.comparison);
md += `\n## Resultado por requisito\n| ID | Requisito | Veredito | Casos | Evidência |\n|---|---|---|---|---|\n` +
  R.map(r => `| ${r.id} | ${cell(r.name)} | ${ST[r.s]} | ${(r.tcs || []).join(', ')} | ${cell(r.ev)} |`).join('\n') + '\n';
const bad = R.filter(r => r.s !== 'pass');
md += `\n## Requisitos que não passaram\n` + bad.map(r => `\n### ${r.id} — ${r.name} (${ST[r.s]})\n- **O que o requisito pede:** ${r.exp}\n- **O que foi encontrado:** ${r.got}\n- **${label[r.s]}:** ${r.obs}\n- **Como corrigir:** ${r.fix}\n- **Casos:** ${(r.tcs || []).join(', ') || 'nenhum'}\n- **Evidência:** ${r.ev || '-'}`).join('\n') + '\n';
md += `\n## Casos de teste\n| TC | Requisito | Tipo | Resultado | Passos | Esperado | Obtido | Evidência |\n|---|---|---|---|---|---|---|---|\n` +
  T.map(t => `| ${t.id} | ${t.req} | ${t.type} | ${RT[t.r]} | ${cell(t.steps)} | ${cell(t.expected)} | ${cell(t.actual)} | ${cell(t.ev)} |`).join('\n') + '\n';
md += `\n## Defeitos\n` + (DF.length ? DF.map((d, i) => `\n### ${i + 1}. [${d.sev}] ${d.t}\n- **Onde:** ${d.where}\n- **Requisito:** ${d.req}\n- **Detalhe:** ${d.d}\n- **Correção sugerida:** ${d.fix}`).join('\n') : '\nNenhum.') + '\n';
md += list('Não implementado', D.notImplemented) + list('Decisões em aberto', D.openDecisions) + list('Fora de escopo e divergências', D.outOfScope) + list('Bloqueios e limitações', D.limits) + list('Testes criados', D.createdTests) + list('Próximos passos', D.nextSteps);
if (D.foot) md += `\n---\n${D.foot}\n`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'test-report.md'), md);

if (flags.includes('--html')) {
  const tpl = fs.readFileSync(path.join(__dirname, 'report-template.html'), 'utf8');
  const a = tpl.indexOf('const DATA = {'), b = tpl.indexOf('};', a) + 2;
  if (a < 0 || b < 2) { console.error('bloco DATA não encontrado no template'); process.exit(3); }
  const html = tpl.slice(0, a) + 'const DATA = ' + JSON.stringify(D).replace(/<\/script/gi, '<\\/script') + ';' + tpl.slice(b);
  fs.writeFileSync(path.join(out, 'test-report.html'), html);
}
console.log(`ok: ${R.length} requisitos (${c.pass}/${c.partial}/${c.fail}/${c.blocked}/${c.untested}), aprovação ${pct}%, cobertura ${cov}%`);
