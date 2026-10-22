const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

test('builds equivalent Markdown and HTML from two skill locations and another working directory', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'requirements-report-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const data = {
    title: 'Portable report', meta: ['fixture'],
    requirements: [{ id: 'FR-001', name: 'Tested behavior', s: 'pass', tcs: ['TC-001'], ev: 'fixture execution' }],
    tests: [{ id: 'TC-001', req: 'FR-001', type: 'unit', r: 'pass', ev: 'fixture execution' }],
    defects: [],
  };
  const input = path.join(root, 'results.json');
  fs.writeFileSync(input, JSON.stringify(data));
  const reports = ['claude skills', 'codex skills'].map((name, index) => {
    const skill = path.join(root, name, 'requirements-test');
    const out = path.join(root, `report ${index}`);
    fs.mkdirSync(skill, { recursive: true });
    ['build-report.js', 'report-template.html'].forEach(file => {
      fs.copyFileSync(path.join(__dirname, '..', file), path.join(skill, file));
    });
    execFileSync(process.execPath, [path.join(skill, 'build-report.js'), input, out, '--html'], { cwd: root });
    const md = fs.readFileSync(path.join(out, 'test-report.md'), 'utf8');
    const html = fs.readFileSync(path.join(out, 'test-report.html'), 'utf8');
    assert.match(md, /Aprovação: 100%/);
    assert.match(md, /Cobertura: 100%/);
    const embedded = JSON.parse(html.match(/const DATA = (.*);\n/)[1]);
    assert.deepEqual(embedded, data);
    return { md, html };
  });
  assert.deepEqual(reports[0], reports[1]);
  const mdOnly = path.join(root, 'markdown only');
  execFileSync(process.execPath, [path.resolve(__dirname, '../build-report.js'), input, mdOnly], { cwd: root });
  assert.ok(fs.existsSync(path.join(mdOnly, 'test-report.md')));
  assert.equal(fs.existsSync(path.join(mdOnly, 'test-report.html')), false);
});

test('warns when a ClickUp source does not keep the state of every task read', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'requirements-source-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const base = {
    title: 'Source state', requirements: [{ id: 'FR-001', name: 'x', s: 'pass', tcs: [] }], tests: [], defects: [],
  };
  const run = source => {
    const input = path.join(root, 'results.json');
    fs.writeFileSync(input, JSON.stringify({ ...base, source }));
    return require('node:child_process').spawnSync(process.execPath, [path.resolve(__dirname, '../build-report.js'), input, root], { encoding: 'utf8' });
  };
  const partial = run({ type: 'clickup', tasks: [{ id: 'a', customId: 'X-1', dateUpdated: '1' }] });
  assert.equal(partial.status, 0);
  assert.match(partial.stderr, /source\.tasks incompleto \(1 tasks, 1 sem/);
  const full = run({ type: 'clickup', tasks: [{ id: 'a', customId: 'X-1', parent: null, subtaskIds: ['b'], dateUpdated: '1', lastCommentId: null }, { id: 'b', customId: 'X-2', parent: 'a', subtaskIds: [], dateUpdated: '2', lastCommentId: '9' }] });
  assert.equal(full.status, 0);
  assert.doesNotMatch(full.stderr, /aviso/);
  assert.doesNotMatch(run({ type: 'md', path: 'req.md' }).stderr, /aviso/);
});
