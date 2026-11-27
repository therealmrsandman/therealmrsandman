// Regression test for dashboard.html inline editors (board + list views). Run: node tests/dashboard-editors.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'dashboard.html'));
  const seed = () => p.evaluate(() => {
    sections = [{ id: 'todo', name: 'Todo' }];
    tasks = { todo: [{ id: 't1', title: 'One', note: '', subtasks: [{ text: 'a', checked: false }], checked: false, section: 'todo' }] };
    renderTasks();
  });
  const st = () => p.evaluate(() => JSON.stringify({ sections, tasks }));
  const type = async (sel, txt, key = 'Enter') => { await p.click(sel); await p.keyboard.press('Control+A'); if (txt) await p.keyboard.type(txt); await p.keyboard.press(key); };
  const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
  for (const view of ['board', 'list']) {
    await seed(); await p.evaluate(v => switchTaskView(v), view);
    const T = view === 'board' ? '.card-title' : '.list-item-title';
    await type(T, 'Renamed'); ok((await st()).includes('"Renamed"'), view + ' title');
    await type(T, 'Nope', 'Escape'); ok(!(await st()).includes('Nope'), view + ' escape cancels');
    const N = view === 'board' ? '[data-action=edit-note]' : '.list-item-note';
    await type(N, 'hello'); ok((await st()).includes('"note":"hello"'), view + ' note');
    const S = view === 'board' ? '[data-action=edit-subtask]' : '.list-item-subtask span:last-child';
    await type(S, 'b2'); ok((await st()).includes('"b2"'), view + ' subtask edit');
    const A = view === 'board' ? '[data-action=add-subtask]' : '.list-item-add-subtask';
    await p.click(A); await p.keyboard.type('new sub'); await p.keyboard.press('Enter'); ok((await st()).includes('"new sub"'), view + ' add subtask');
    const C = view === 'board' ? '.column-title' : '.section-title';
    await type(C, 'Doing'); ok((await st()).includes('"id":"doing"') && (await st()).includes('"section":"doing"'), view + ' rename section');
    const AS = view === 'board' ? '.column' : '.list-add-section';
    await p.locator(AS).last().click(); await p.keyboard.type('Later'); await p.keyboard.press('Enter'); ok((await st()).includes('"Later"'), view + ' add section');
  }
  ok(errs.length === 0, 'no page errors ' + errs.join('; '));
  await b.close();
})().catch(e => { console.error('FAIL ' + (e && e.stack || e)); process.exit(1); });
