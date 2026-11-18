// HTML + Markdown rendering for ShopSniff reports.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function scoreOf(results) {
  const judged = results.filter(r => r.verdict === 'pass' || r.verdict === 'fail');
  const passed = judged.filter(r => r.verdict === 'pass').length;
  const score = judged.length ? Math.round(100 * passed / judged.length) : null;
  const grade = score === null ? '—' : score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : score >= 25 ? 'D' : 'F';
  const flags = results.filter(r => r.verdict === 'fail').length;
  const verdict = score === null ? 'Not enough evidence'
    : score === 100 ? 'Plays fair' : score >= 75 ? 'Mostly fair' : score >= 50 ? 'Shop with care' : 'Tricks detected';
  return { score, grade, flags, verdict, checked: judged.length };
}
const tone = s => s === null ? '#8a8a96' : s >= 75 ? '#12a86b' : s >= 50 ? '#e0a100' : '#e5383b';
const BADGE = { pass: ['Fair', '#12a86b'], fail: ['Trick found', '#e5383b'], na: ['Not present', '#8a8a96'], unknown: ['Inconclusive', '#8a8a96'] };

const CSS = `
:root{--ink:#14141a;--mut:#6c6c78;--bg:#f6f5f1;--card:#fff;--line:#e7e4dc;--brand:#1f6f4a}
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--bg);color:var(--ink);line-height:1.45}
a{color:var(--brand)}main{max-width:900px;margin:0 auto;padding:28px 20px 60px}
.top{display:flex;align-items:center;gap:10px;font-weight:800;font-size:20px;margin-bottom:22px}.top small{font-weight:400;color:var(--mut);font-size:13px}
.hero{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:24px;display:flex;gap:24px;align-items:center;flex-wrap:wrap}
.ring{--p:0;width:132px;height:132px;border-radius:50%;display:grid;place-items:center;flex:none;background:conic-gradient(var(--c) calc(var(--p)*1%),#eee 0)}
.ring div{width:104px;height:104px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center}
.ring b{font-size:34px;display:block;line-height:1}.ring span{font-size:12px;color:var(--mut)}
.hero h1{margin:0 0 4px;font-size:26px}.url{color:var(--mut);word-break:break-all;font-size:14px}
.pill{display:inline-block;padding:3px 10px;border-radius:99px;color:#fff;font-size:12px;font-weight:700}
.meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:13px;color:var(--mut)}
h2{font-size:15px;text-transform:uppercase;letter-spacing:.06em;color:var(--mut);margin:30px 0 12px}
.check{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:12px;border-left:5px solid var(--c)}
.check h3{margin:0;font-size:17px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.q{color:var(--mut);font-size:14px;margin:2px 0 10px}.finding{font-size:15px;margin:0 0 10px}
.fix{background:#f1f8f4;border:1px solid #cfe8da;border-radius:10px;padding:10px 12px;font-size:14px;margin-bottom:10px}
details{font-size:13px;color:var(--mut)}summary{cursor:pointer}
table{border-collapse:collapse;margin:8px 0;font-size:13px}td{border:1px solid var(--line);padding:4px 8px;vertical-align:top}
.shots{display:flex;gap:8px;overflow-x:auto;margin-top:8px}.shots img{height:150px;border-radius:8px;border:1px solid var(--line)}
code{background:#f0eee8;padding:1px 5px;border-radius:5px;font-size:12px}
footer{margin-top:30px;color:var(--mut);font-size:12px;text-align:center}
.list a{display:flex;gap:14px;align-items:center;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:10px;text-decoration:none;color:var(--ink)}
.dot{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:800;flex:none}`;

const logo = `<span aria-hidden="true">🐽</span> ShopSniff`;

export function renderReport(r) {
  const c = tone(r.score);
  const checks = r.results.map(x => {
    const [label, col] = BADGE[x.verdict] || BADGE.unknown;
    const stored = Object.entries(x.stored || {});
    return `<section class="check" style="--c:${col}" data-testid="check-${esc(x.id)}" data-verdict="${esc(x.verdict)}">
      <h3>${esc(x.title)} <span class="pill" style="background:${col}">${label}</span></h3>
      <p class="q">${esc(x.question)}</p>
      <p class="finding">${esc(x.finding)}</p>
      ${x.fix ? `<div class="fix"><b>How to fix:</b> ${esc(x.fix)}</div>` : ''}
      ${x.evidence?.length ? `<div class="shots">${x.evidence.map(e => `<a href="${esc(e)}" target="_blank"><img src="${esc(e)}" alt="Kane evidence screenshot"></a>`).join('')}</div>` : ''}
      <details><summary>Evidence from Kane</summary>
        ${stored.length ? `<table>${stored.map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${esc(typeof v === 'object' ? JSON.stringify(v) : v)}</td></tr>`).join('')}</table>` : '<p>No values stored.</p>'}
        <p>${esc(x.kane?.summary || '')}</p>
        <p>Kane run: ${esc(x.kane?.status || 'n/a')} · ${esc(x.kane?.steps?.done ?? 0)} steps · ${esc(x.kane?.duration ?? '?')}s${x.kane?.credits != null ? ` · ${esc(x.kane.credits)} credits` : ''}
        ${x.kane?.test_url ? ` · <a href="${esc(x.kane.test_url)}" target="_blank">Open in TestMu Test Manager</a>` : ''}</p>
        <p>Objective given to Kane:<br><code>${esc(x.objective)}</code></p>
      </details></section>`;
  }).join('');
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShopSniff · ${esc(r.name)} · ${r.score ?? '—'}/100</title><style>${CSS}</style></head><body><main>
<div class="top">${logo} <small>an AI agent checks if a shop is lying before you buy</small></div>
<div class="hero">
  <div class="ring" style="--p:${r.score ?? 0};--c:${c}" data-testid="score"><div><b>${r.score ?? '—'}</b><span>honesty score</span></div></div>
  <div><span class="pill" style="background:${c}" data-testid="verdict">${esc(r.verdict)} · grade ${esc(r.grade)}</span>
    <h1>${esc(r.name)}</h1><div class="url">${esc(r.url)}</div>
    <div class="meta"><span>${r.flags} trick${r.flags === 1 ? '' : 's'} found</span><span>${r.checked} of ${r.results.length} checks conclusive</span>
    <span>${esc(new Date(r.created).toUTCString())}</span></div></div>
</div>
<h2>What Kane found</h2>${checks}
<p style="font-size:14px">Running this shop yourself? Hand <a href="fixes.md">fixes.md</a> to your coding agent, then run ShopSniff again.</p>
<footer>Every check was carried out by Kane CLI (TestMu AI) in a real browser, acting like a shopper. ShopSniff never pays or places real orders.<br><a href="../index.html">All reports</a></footer>
</main></body></html>`;
}

export function renderGallery(list) {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ShopSniff reports</title><style>${CSS}</style></head><body><main>
<div class="top">${logo} <small>all reports</small></div><div class="list">
${list.length ? list.map(r => `<a href="${esc(r.id)}/index.html" data-testid="report-row"><span class="dot" style="background:${tone(r.score)}">${r.score ?? '—'}</span>
<span><b>${esc(r.name)}</b><br><small style="color:var(--mut)">${esc(r.url)} · ${esc(r.verdict)} · ${esc(new Date(r.created).toUTCString())}</small></span></a>`).join('') : '<p>No reports yet.</p>'}
</div></main></body></html>`;
}

export function renderFixes(r) {
  const fails = r.results.filter(x => x.verdict === 'fail');
  if (!fails.length) return `# ShopSniff fix list — ${r.name}\n\nNo tricks found (score ${r.score}/100). Nothing to fix.\n`;
  return `# ShopSniff fix list — ${r.name}\n\nURL: ${r.url}\nHonesty score: ${r.score}/100 (${r.grade})\n\n` +
    `You are a coding agent working on this store. Kane CLI found these dark patterns in a real browser.\n` +
    `Fix each one in the store's code, then re-run \`node shopsniff.mjs ${r.url}\` and repeat until the score is 100.\n\n` +
    fails.map((x, i) => `## ${i + 1}. ${x.title}\n\n- **What Kane saw:** ${x.finding}\n- **Fix:** ${x.fix}\n- **Evidence:** \`${JSON.stringify(x.stored)}\`\n`).join('\n');
}
