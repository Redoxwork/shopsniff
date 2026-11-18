#!/usr/bin/env node
// ShopSniff — an AI agent checks if a shop is lying before you buy.
// Every check is carried out by Kane CLI (TestMu AI) in a real browser.
//
//   node shopsniff.mjs <shop-url> [--name label] [--only timer,stock] [--parallel 2]
//   node shopsniff.mjs selftest <demo-shop-url>      known-answer test of ShopSniff itself
//
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CHECKS } from './checks.mjs';
import { renderReport, renderGallery, renderFixes, scoreOf } from './report.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPORTS = path.join(ROOT, 'reports');
const KANE = process.env.SHOPSNIFF_KANE || 'kane-cli';

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));

if (!positional.length) {
  console.log(`ShopSniff — does this shop play fair?

  node shopsniff.mjs <shop-url> [--name label] [--only ${CHECKS.map(c => c.id).join(',')}] [--parallel 2]
  node shopsniff.mjs selftest <demo-shop-url>

Needs Kane CLI:  npm install -g @testmuai/kane-cli  &&  kane-cli login`);
  process.exit(0);
}

// ---------- run one Kane objective ----------
function runKane(check, url, logDir) {
  return new Promise(resolve => {
    const objective = check.objective(url);
    const args = ['run', objective, '--agent', '--headless', '--timeout', String(check.timeout), '--max-steps', String(check.maxSteps)];
    const started = Date.now();
    const child = spawn(KANE, args, { env: { ...process.env, KANE_CLI_USER_AGENT: process.env.KANE_CLI_USER_AGENT || 'claude-code' } });
    const out = fs.createWriteStream(path.join(logDir, `${check.id}.ndjson`));
    const err = fs.createWriteStream(path.join(logDir, `${check.id}.stderr.log`));
    let buf = '', runEnd = null, steps = { done: 0, failed: 0 }, errors = [];
    child.stdout.on('data', d => {
      out.write(d); buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line) continue;
        let ev; try { ev = JSON.parse(line); } catch { continue; }
        if (ev.type === 'run_end') runEnd = ev;
        else if (ev.type === 'error') errors.push(ev.message || JSON.stringify(ev));
        else if (!ev.type && ev.status) {
          if (ev.status === 'done') steps.done++;
          if (ev.status === 'failed') steps.failed++;
          if (ev.status !== 'running' && ev.remark) console.log(`  [${check.id}] ${ev.status === 'failed' ? '✗' : '·'} ${String(ev.remark).slice(0, 110)}`);
        }
      }
    });
    child.stderr.pipe(err);
    child.on('error', e => { errors.push(e.code === 'ENOENT' ? `Could not find "${KANE}". Install it: npm install -g @testmuai/kane-cli` : e.message); });
    child.on('close', code => {
      out.end(); err.end();
      resolve({ objective, exitCode: code, runEnd, steps, errors, seconds: Math.round((Date.now() - started) / 1000) });
    });
  });
}

// copy Kane's evidence screenshots into the report folder
function copyEvidence(runEnd, destDir, prefix) {
  const dir = runEnd?.session_dir && path.join(runEnd.session_dir, 'evidence');
  if (!dir || !fs.existsSync(dir)) return [];
  const imgs = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.(png|jpe?g|webp)$/i.test(f.name)) imgs.push(p);
  } };
  try { walk(dir); } catch { return []; }
  imgs.sort();
  // keep first, a few from the middle, and the last
  const keep = imgs.length <= 4 ? imgs : [imgs[0], imgs[Math.floor(imgs.length / 3)], imgs[Math.floor(2 * imgs.length / 3)], imgs.at(-1)];
  fs.mkdirSync(destDir, { recursive: true });
  return keep.map((src, i) => {
    const name = `${prefix}-${i + 1}${path.extname(src).toLowerCase()}`;
    fs.copyFileSync(src, path.join(destDir, name));
    return `evidence/${name}`;
  });
}

async function pool(items, n, fn) {
  const res = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) { const i = next++; res[i] = await fn(items[i], i); }
  }));
  return res;
}

// ---------- sniff a shop ----------
export async function sniff(url, { name, only, parallel = 2 } = {}) {
  const host = (() => { try { return new URL(url).host.replace(/[^\w.-]/g, '_'); } catch { return 'shop'; } })();
  const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const id = `${stamp}_${(name || host).replace(/[^\w.-]+/g, '-')}`;
  const dir = path.join(REPORTS, id), logDir = path.join(dir, 'logs');
  fs.mkdirSync(logDir, { recursive: true });

  const checks = only ? CHECKS.filter(c => only.split(',').includes(c.id)) : CHECKS;
  console.log(`\n🐽 ShopSniff → ${url}\n   ${checks.length} checks, Kane CLI in a real browser (${parallel} at a time)\n`);

  const results = await pool(checks, parallel, async check => {
    const run = await runKane(check, url, logDir);
    const state = run.runEnd?.final_state || {};
    let judged;
    if (!run.runEnd) judged = { verdict: 'unknown', finding: run.errors[0] || `Kane exited with code ${run.exitCode} before finishing.` };
    else judged = check.judge(state);
    const evidence = copyEvidence(run.runEnd, path.join(dir, 'evidence'), check.id);
    const r = {
      id: check.id, title: check.title, question: check.question, ...judged,
      stored: state, kane: {
        status: run.runEnd?.status, summary: run.runEnd?.summary || run.runEnd?.one_liner, reason: run.runEnd?.reason,
        test_url: run.runEnd?.test_url, credits: run.runEnd?.credits_consumed ?? run.runEnd?.credits,
        duration: run.runEnd?.duration ?? run.seconds, exit_code: run.exitCode, steps: run.steps,
      },
      objective: run.objective, evidence,
    };
    const icon = { pass: '✅', fail: '🚩', na: '➖', unknown: '❔' }[r.verdict];
    console.log(`${icon} ${check.title}: ${r.finding}`);
    return r;
  });

  const report = { tool: 'ShopSniff', version: 1, url, name: name || host, id, created: new Date().toISOString(), ...scoreOf(results), results };
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(dir, 'index.html'), renderReport(report));
  fs.writeFileSync(path.join(dir, 'fixes.md'), renderFixes(report));
  writeGallery();
  console.log(`\nHonesty score: ${report.score === null ? 'n/a' : report.score + '/100'} (${report.grade})`);
  console.log(`Report: ${path.relative(process.cwd(), path.join(dir, 'index.html'))}`);
  console.log(`Fix list for a coding agent: ${path.relative(process.cwd(), path.join(dir, 'fixes.md'))}\n`);
  return report;
}

function writeGallery() {
  if (!fs.existsSync(REPORTS)) return;
  const all = fs.readdirSync(REPORTS).map(d => path.join(REPORTS, d, 'report.json')).filter(f => fs.existsSync(f))
    .map(f => JSON.parse(fs.readFileSync(f, 'utf8'))).sort((a, b) => b.created.localeCompare(a.created));
  fs.writeFileSync(path.join(REPORTS, 'index.html'), renderGallery(all));
}

// ---------- selftest: known-answer test of ShopSniff itself ----------
async function selftest(base) {
  const u = new URL(base);
  const fixedUrl = new URL(base); fixedUrl.searchParams.set('fixed', '');
  const shady = await sniff(u.toString().replace(/\?$/, ''), { name: 'selftest-shady', parallel: +flag('parallel', 2) });
  const honest = await sniff(fixedUrl.toString().replace('fixed=', 'fixed'), { name: 'selftest-honest', parallel: +flag('parallel', 2) });
  const rows = CHECKS.map(c => {
    const a = shady.results.find(r => r.id === c.id)?.verdict, b = honest.results.find(r => r.id === c.id)?.verdict;
    return { check: c.title, shady: a, expected_shady: 'fail', honest: b, expected_honest: 'pass', ok: a === 'fail' && b === 'pass' };
  });
  const passed = rows.filter(r => r.ok).length;
  const md = `# ShopSniff self-test\n\nRan ${new Date().toISOString()} against ${base}\n\n` +
    `ShopSniff must flag every trick in the shady store **and** give the honest store a clean bill.\n\n` +
    `| Check | Shady store | Honest store | OK |\n|---|---|---|---|\n` +
    rows.map(r => `| ${r.check} | ${r.shady} (want fail) | ${r.honest} (want pass) | ${r.ok ? '✅' : '❌'} |`).join('\n') +
    `\n\n**${passed}/${rows.length} checks behave correctly.** Shady score ${shady.score}/100, honest score ${honest.score}/100.\n`;
  fs.writeFileSync(path.join(REPORTS, 'SELFTEST.md'), md);
  console.log(md);
  process.exit(passed === rows.length ? 0 : 1);
}

if (positional[0] === 'selftest') await selftest(positional[1] || 'http://localhost:8080/');
else {
  const rep = await sniff(positional[0], { name: flag('name'), only: flag('only'), parallel: +flag('parallel', 2) });
  process.exit(rep.results.some(r => r.verdict === 'fail') ? 1 : 0);
}
