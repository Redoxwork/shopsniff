// The five ShopSniff checks.
// Each check = a plain-English objective Kane CLI carries out in a real browser,
// plus a judge() that turns the values Kane stored ("store ... as ...") into a verdict.

const NO_PAY = 'Never enter payment details and never place a real order.';

// ---------- helpers ----------
export function pick(state, key) {
  if (!state) return undefined;
  if (key in state) return state[key];
  const k = Object.keys(state).find(k => k.toLowerCase() === key.toLowerCase());
  return k ? state[k] : undefined;
}
const isNone = v => v === undefined || v === null || /^\s*(none|n\/a|na|null|not found|no|no timer|not present)\.?\s*$/i.test(String(v)) || String(v).trim() === '';

// "14:59", "1d 02:03:04", "2 days 3:04:05", "00:09:12" -> seconds
export function toSeconds(v) {
  if (isNone(v)) return null;
  const s = String(v).toLowerCase();
  let days = 0;
  const dm = s.match(/(\d+)\s*(d|day|days)\b/);
  if (dm) days = +dm[1];
  const t = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!t) {
    // "14m 59s" style
    const h = +(s.match(/(\d+)\s*h/)?.[1] || 0), m = +(s.match(/(\d+)\s*m(?!s)/)?.[1] || 0), sec = +(s.match(/(\d+)\s*s/)?.[1] || 0);
    const tot = days * 86400 + h * 3600 + m * 60 + sec;
    return tot || (dm ? tot : null);
  }
  const [a, b, c] = [+t[1], +t[2], t[3] !== undefined ? +t[3] : null];
  const rest = c === null ? a * 60 + b : a * 3600 + b * 60 + c;
  return days * 86400 + rest;
}
export function toMoney(v) {
  if (isNone(v)) return null;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}
const firstNumber = v => { const m = String(v ?? '').match(/\d+/); return m ? +m[0] : null; };

// ---------- the checks ----------
export const CHECKS = [
  {
    id: 'timer',
    title: 'Fake countdown timer',
    question: 'Does the "sale ends in…" timer restart when you reload?',
    timeout: 180, maxSteps: 25,
    objective: url => `Step 1: Go to ${url} and store the exact time shown by the sale countdown timer (for example "Sale ends in 14:59") as timer_first. ` +
      `Step 2: Wait 10 seconds. Step 3: Navigate to ${url} again so the page fully loads fresh, and immediately store the time the countdown now shows as timer_after_reload. ` +
      `Read the second value from the freshly loaded page; do not copy the first value. ` +
      `If the page has no countdown timer, store "none" as timer_first and "none" as timer_after_reload. ${NO_PAY}`,
    judge(st) {
      const a = toSeconds(pick(st, 'timer_first')), b = toSeconds(pick(st, 'timer_after_reload'));
      if (a === null && b === null) return { verdict: 'na', finding: 'No countdown timer found on the page.' };
      if (a === null || b === null) return { verdict: 'unknown', finding: 'Could only read the timer once.' };
      if (st.__loads !== undefined && st.__loads < 2) return { verdict: 'unknown', finding: 'Kane did not reload the page, so the timer could not be compared.' };
      // at least ~10s passed, so an honest timer must have gone DOWN
      if (b >= a - 3) return {
        verdict: 'fail',
        finding: `The timer showed ${pick(st, 'timer_first')}, then ${pick(st, 'timer_after_reload')} after waiting 10s and reloading. It restarted, so the deadline isn't real.`,
        fix: 'Count the countdown down to a real, fixed end date stored on the server. It must never restart on reload.',
      };
      return { verdict: 'pass', finding: `Timer kept counting down (${pick(st, 'timer_first')} → ${pick(st, 'timer_after_reload')}). The deadline looks real.` };
    },
  },
  {
    id: 'stock',
    title: 'Fake "only N left" stock',
    question: 'Does the scarcity message change on every reload?',
    timeout: 180, maxSteps: 25,
    objective: url => `Step 1: Go to ${url} and store the exact stock or scarcity message shown on the first product (for example "Only 3 left" or "12 in stock") as stock_1. ` +
      `Step 2: Navigate to ${url} again so the page fully loads fresh, then store the first product's stock message as stock_2. ` +
      `Step 3: Navigate to ${url} once more, then store the first product's stock message as stock_3. ` +
      `Read each value from the page after its own fresh load; do not copy an earlier value. Do not add anything to the cart. ` +
      `If there is no stock message, store "none" for all three. ${NO_PAY}`,
    judge(st) {
      const raw = ['stock_1', 'stock_2', 'stock_3'].map(k => pick(st, k));
      if (raw.every(isNone)) return { verdict: 'na', finding: 'No stock or scarcity message found.' };
      if (st.__loads !== undefined && st.__loads < 3) return { verdict: 'unknown', finding: `Kane only loaded the page ${st.__loads} time(s), so the stock couldn't be compared across reloads.` };
      const nums = raw.map(firstNumber).filter(n => n !== null);
      if (nums.length < 2) return { verdict: 'unknown', finding: `Stock text read: ${raw.filter(Boolean).join(' / ')}` };
      if (new Set(nums).size > 1) return {
        verdict: 'fail',
        finding: `Nobody bought anything, but the stock count changed between reloads: ${nums.join(' → ')}. The scarcity is made up.`,
        fix: 'Show the real inventory number from your database, or drop the scarcity message.',
      };
      return { verdict: 'pass', finding: `Stock message stayed the same across 3 loads (${raw[0]}).` };
    },
  },
  {
    id: 'addon',
    title: 'Sneaky add-on in cart',
    question: 'Does something you didn’t choose end up in your cart?',
    timeout: 200, maxSteps: 30,
    objective: url => `Go to ${url}. Open the first product. Store its name as product_name. ` +
      `Click "Add to cart" without ticking or choosing any extra options. Then open the cart. ` +
      `Store the names of every line item in the cart, separated by " | ", as cart_items, ` +
      `and store how many different line items are in the cart as cart_line_count. ${NO_PAY}`,
    judge(st) {
      const items = String(pick(st, 'cart_items') ?? '');
      let count = firstNumber(pick(st, 'cart_line_count'));
      if (count === null && items) count = items.split('|').filter(s => s.trim()).length;
      if (count === null) return { verdict: 'unknown', finding: 'Could not read the cart.' };
      const product = String(pick(st, 'product_name') ?? '').trim();
      const extras = items.split('|').map(s => s.trim()).filter(s => s && (!product || !s.toLowerCase().includes(product.toLowerCase().slice(0, 12))));
      if (count > 1) return {
        verdict: 'fail',
        finding: `Added only "${product || 'one product'}", but the cart had ${count} items${extras.length ? `: ${extras.join(', ')} was added without asking` : ''}.`,
        fix: 'Never add extras (protection plans, insurance, donations) by default. Offer them as an unticked option.',
      };
      return { verdict: 'pass', finding: `The cart held exactly what was added (${product || items}).` };
    },
  },
  {
    id: 'fees',
    title: 'Hidden fees at checkout',
    question: 'Does the final total match the price you were shown?',
    timeout: 240, maxSteps: 40,
    objective: url => `Go to ${url}. Open the first product and store its displayed price as listed_price. ` +
      `Add it to the cart without any extras. If the cart contains anything else you did not add, remove it. ` +
      `Go to checkout and continue until the final order review page, filling any required fields with simple test text. ` +
      `Do not enter payment details and do not place the order. ` +
      `Store the final order total shown on the review page as final_total, and store the names of any fees added on top of the product price as extra_fees (or "none"). ${NO_PAY}`,
    judge(st) {
      const listed = toMoney(pick(st, 'listed_price')), total = toMoney(pick(st, 'final_total'));
      if (listed === null || total === null) return { verdict: 'unknown', finding: 'Could not read both the listed price and the final total.' };
      const diff = +(total - listed).toFixed(2);
      if (diff > 0.009) return {
        verdict: 'fail',
        finding: `Listed at $${listed.toFixed(2)}, but the final total was $${total.toFixed(2)} (+$${diff.toFixed(2)}${isNone(pick(st, 'extra_fees')) ? '' : `: ${pick(st, 'extra_fees')}`}). The extra cost only appeared on the last step.`,
        fix: 'Show every mandatory fee in the price on the product page. No surprise charges at the final step.',
      };
      return { verdict: 'pass', finding: `The final total ($${total.toFixed(2)}) matched the listed price ($${listed.toFixed(2)}).` };
    },
  },
  {
    id: 'cancel',
    title: 'Hard-to-cancel subscription',
    question: 'Is cancelling much harder than joining?',
    timeout: 360, maxSteps: 60,
    objective: url => `Go to ${url}. Find the store's membership or subscription and join it. ` +
      `Store the text that confirms you are a member as join_confirmation. ` +
      `Then cancel the membership from the account area. If a form is required, fill it with simple test text. ` +
      `Keep going until the site confirms the membership is cancelled, and store that confirmation text as cancel_confirmation. ` +
      `If any button guilt-trips you for leaving (for example "No, I hate saving money"), store its exact text as guilt_text, otherwise store "none" as guilt_text. ` +
      `If there is no membership or subscription, store "none" as join_confirmation. ${NO_PAY}`,
    // ShopSniff counts Kane's own click/type actions from the NDJSON stream (see countCancelFlow)
    judge(st) {
      if (isNone(pick(st, 'join_confirmation')) && pick(st, 'join_confirmation') !== undefined && !st.join_clicks)
        return { verdict: 'na', finding: 'No membership or subscription found.' };
      const j = st.join_clicks?.length ?? null, c = st.cancel_clicks?.length ?? null;
      if (!j || !c) return { verdict: 'unknown', finding: 'Could not see both the join and the cancel flow in Kane\'s actions.' };
      const shamingClick = (st.cancel_clicks || []).find(a => /hate|no thanks|don.?t want|rather pay|lose (my|all)/i.test(a));
      const guilt = !isNone(pick(st, 'guilt_text')) && pick(st, 'guilt_text') !== undefined ? pick(st, 'guilt_text') : (shamingClick ? shamingClick.replace(/^.*?(clicking|click)\s*/i, '').replace(/^"|"$/g, '').replace(/\s+(to|in|on) (cancel|the|your) .*$/i, '') : 'none');
      const shame = !isNone(guilt) ? ` One button guilt-tripped: “${guilt}”.` : '';
      if (c > Math.max(3, j * 2) || !isNone(guilt)) return {
        verdict: 'fail',
        finding: `Joining took ${j} step${j === 1 ? '' : 's'}, cancelling took ${c}.${shame}`,
        fix: 'Make cancelling as easy as joining: one clearly labelled "Cancel membership" button and one confirmation. No guilt-trip wording, no required survey.',
      };
      return { verdict: 'pass', finding: `Joining took ${j} step${j === 1 ? '' : 's'}, cancelling took ${c}. Fair.` };
    },
  },
];
