// Builds the public site: landing app + demo shop + Kane reports -> ./public
// Also writes public/data.json (real numbers + Kane step logs for the replay).
import fs from 'node:fs';
import path from 'node:path';

const out = 'public';
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync('site', out, { recursive: true });
fs.cpSync('demo-shop', `${out}/shop`, { recursive: true });
if (fs.existsSync('reports')) fs.cpSync('reports', `${out}/reports`, { recursive: true, filter: s => !s.endsWith('.stderr.log') });

const reports = !fs.existsSync('reports') ? [] : fs.readdirSync('reports')
  .map(d => path.join('reports', d))
  .filter(d => fs.existsSync(path.join(d, 'report.json')))
  .map(d => ({ dir: d, ...JSON.parse(fs.readFileSync(path.join(d, 'report.json'), 'utf8')) }))
  .sort((a, b) => b.created.localeCompare(a.created));

// Kane's own step remarks, per check (what Kane actually did)
function steps(dir, id) {
  const f = path.join(dir, 'logs', `${id}.ndjson`);
  if (!fs.existsSync(f)) return [];
  const lines = [];
  for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
    let e; try { e = JSON.parse(l); } catch { continue; }
    if (e.remark && (e.status === 'done' || e.status === 'failed')) lines.push({ s: e.status, r: String(e.remark).slice(0, 120) });
    if (e.type === 'run_end') lines.push({ s: 'end', r: `run_end · status=${e.status} · ${Number(e.duration || 0).toFixed(0)}s · ${Number(e.credits_consumed || 0).toFixed(1)} credits` });
  }
  return lines;
}
const lite = r => r && ({
  id: r.id, name: r.name, url: r.url, created: r.created, score: r.score, grade: r.grade, verdict: r.verdict, flags: r.flags,
  results: r.results.map(x => ({
    id: x.id, title: x.title, verdict: x.verdict, finding: x.finding, fix: x.fix || null,
    stored: x.stored, test_url: x.kane?.test_url || null, credits: x.kane?.credits ?? null,
    duration: x.kane?.duration ?? null, steps: steps(r.dir, x.id),
  })),
});
const shady = reports.find(r => /shady/.test(r.name)), honest = reports.find(r => /honest/.test(r.name));
let selftest = null;
if (fs.existsSync('reports/SELFTEST.md')) {
  const md = fs.readFileSync('reports/SELFTEST.md', 'utf8');
  selftest = { passed: +(md.match(/\*\*(\d+)\/(\d+) checks/)?.[1] ?? 0), total: +(md.match(/\*\*(\d+)\/(\d+) checks/)?.[2] ?? 5), when: md.match(/Ran (\S+)/)?.[1] || null };
}
const data = {
  generated: new Date().toISOString(),
  run: process.env.GITHUB_RUN_NUMBER || null,
  repo: 'https://github.com/Redoxwork/shopsniff',
  selftest,
  shady: lite(shady), honest: lite(honest),
  reports: reports.map(r => ({ id: r.id, name: r.name, url: r.url, created: r.created, score: r.score, verdict: r.verdict, flags: r.flags })),
  kaneRuns: reports.reduce((n, r) => n + r.results.length, 0),
  credits: +reports.reduce((n, r) => n + r.results.reduce((m, x) => m + (x.kane?.credits || 0), 0), 0).toFixed(1),
};
fs.writeFileSync(`${out}/data.json`, JSON.stringify(data));
console.log(`Built ./public (${reports.length} reports, ${data.kaneRuns} Kane runs)`);
