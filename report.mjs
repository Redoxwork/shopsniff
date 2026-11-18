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
const tone = s => s === null ? '#9aa0b1' : s >= 75 ? '#0b9a58' : s >= 50 ? '#e0a100' : '#fb7623';
const BADGE = { pass: ['Fair', '#0b9a58', '#61fa9f', '#010e33'], fail: ['Trick found', '#fb7623', '#fb7623', '#fff'], na: ['Not present', '#9aa0b1', '#e3e4e0', '#6b7186'], unknown: ['Inconclusive', '#9aa0b1', '#e3e4e0', '#6b7186'] };

const CSS = `
:root{--ink:#010e33;--ink2:#2a3256;--mut:#6b7186;--bg:#ecedea;--card:#fff;--tile:#f3f3f0;--line:#e3e4e0;--mint:#61fa9f;--mintd:#0b9a58;--org:#fb7623;--orgd:#d4500b}
*{box-sizing:border-box}body{margin:0;font-family:'Inter Tight','Helvetica Neue',Helvetica,Arial,sans-serif;background:var(--bg);color:var(--ink);line-height:1.45;-webkit-font-smoothing:antialiased}
a{color:var(--ink)}main{max-width:920px;margin:0 auto;padding:22px 20px 70px}
.top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:26px}
.brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:20px;letter-spacing:-.8px;text-decoration:none}.brand img{width:38px}
.back{font-size:13px;font-weight:700;text-decoration:none;padding:9px 14px;border-radius:99px;background:var(--ink);color:#fff}
.hero{background:var(--card);border-radius:26px;padding:26px;display:flex;gap:26px;align-items:center;flex-wrap:wrap;box-shadow:0 30px 60px -45px #01113355}
.ring{--p:0;width:132px;height:132px;border-radius:50%;display:grid;place-items:center;flex:none;background:conic-gradient(var(--c) calc(var(--p)*1%),#e8e9e5 0)}
.ring div{width:108px;height:108px;border-radius:50%;background:var(--card);display:grid;place-items:center;text-align:center}
.ring b{font-size:38px;display:block;line-height:1;font-weight:900;letter-spacing:-2px}.ring span{font-size:11px;color:var(--mut);font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.hero h1{margin:6px 0 4px;font-size:34px;letter-spacing:-1.5px;font-weight:900;line-height:1}.url{color:var(--mut);word-break:break-all;font-size:14px;font-family:'JetBrains Mono',ui-monospace,monospace}
.pill{display:inline-block;white-space:nowrap;padding:4px 10px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.meta{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:var(--mut)}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.14em;color:var(--ink2);margin:34px 0 12px;font-weight:800}
.check{background:var(--card);border-radius:20px;padding:20px;margin-bottom:12px;position:relative;overflow:hidden}
.check:before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--c)}
.check h3{margin:0;font-size:19px;letter-spacing:-.5px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.q{color:var(--mut);font-size:14px;margin:2px 0 10px}.finding{font-size:15.5px;margin:0 0 12px}
.fix{background:#eafff3;border:1px solid #b7f3d2;border-radius:12px;padding:11px 13px;font-size:14px;margin-bottom:10px}
details{font-size:13px;color:var(--mut)}summary{cursor:pointer;font-weight:700;color:var(--ink2)}
table{border-collapse:collapse;margin:8px 0;font-size:12.5px;width:100%;display:block;overflow-x:auto}td{border:1px solid var(--line);padding:5px 8px;vertical-align:top}
.shots{display:flex;gap:8px;overflow-x:auto;margin-top:8px}.shots img{height:150px;border-radius:8px;border:1px solid var(--line)}
code{background:var(--tile);padding:1px 5px;border-radius:5px;font-size:12px;font-family:'JetBrains Mono',ui-monospace,monospace;word-break:break-word}
footer{margin-top:34px;color:var(--mut);font-size:12.5px;text-align:center}
.list a{display:flex;gap:14px;align-items:center;background:var(--card);border-radius:18px;padding:14px;margin-bottom:10px;text-decoration:none;color:var(--ink)}
.dot{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:900;flex:none}`;

const FONTS = `<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">`;
const logo = (up) => `<a class="brand" href="${up}index.html"><img src="${up}assets/mark-navy.png" alt="" onerror="this.remove()">shopsniff</a>`;

const pretty = n => /shady/.test(n) ? 'Shady DealDrop' : /honest/.test(n) ? 'Honest DealDrop' : n;
export function renderReport(r) {
  const c = tone(r.score);
  const checks = r.results.map(x => {
    const [label, col, pbg, pfg] = BADGE[x.verdict] || BADGE.unknown;
    const stored = Object.entries(x.stored || {});
    return `<section class="check" style="--c:${col}" data-testid="check-${esc(x.id)}" data-verdict="${esc(x.verdict)}">
      <h3>${esc(x.title)} <span class="pill" style="background:${pbg};color:${pfg}">${label}</span></h3>
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
<title>ShopSniff · ${esc(r.name)} · ${r.score ?? '—'}/100</title><link rel="icon" href="../../assets/favicon.png">${FONTS}<style>${CSS}</style></head><body><main>
<div class="top">${logo('../../')}<a class="back" href="../../index.html#cases"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:6px" aria-hidden="true"><path d="M20 12H5M10.5 6.5L5 12l5.5 5.5"/></svg>All case files</a></div>
<div class="hero">
  <div class="ring" style="--p:${r.score ?? 0};--c:${c}" data-testid="score"><div><b>${r.score ?? '—'}</b><span>honesty score</span></div></div>
  <div><span class="pill" style="background:${c};color:#fff" data-testid="verdict">${esc(r.verdict)} · grade ${esc(r.grade)}</span>
    <h1>${esc(pretty(r.name))}</h1><div class="url">${esc(r.url)}</div>
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
<title>ShopSniff reports</title><link rel="icon" href="../assets/favicon.png">${FONTS}<style>${CSS}</style></head><body><main>
<div class="top">${logo('../')}<a class="back" href="../index.html#cases">Case files</a></div><div class="list">
${list.length ? list.map(r => `<a href="${esc(r.id)}/index.html" data-testid="report-row"><span class="dot" style="background:${tone(r.score)}">${r.score ?? '—'}</span>
<span><b>${esc(pretty(r.name))}</b><br><small style="color:var(--mut)">${esc(r.url)} · ${esc(r.verdict)} · ${esc(new Date(r.created).toUTCString())}</small></span></a>`).join('') : '<p>No reports yet.</p>'}
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
