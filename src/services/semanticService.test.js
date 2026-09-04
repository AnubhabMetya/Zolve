// Simple in-repo test for Feature 1 semantic matching (TF-IDF, no external API)
// Run with: node --experimental-vm-modules src/services/semanticService.test.js
// Or via patched import for Node ESM without .js extension handling.
import { semanticMatch } from './semanticService.js';

function assert(condition, msg) {
  if (!condition) throw new Error(msg);
}

const cases = [
  { q: 'My bathroom tap is leaking', expectContains: 'Plumbing', notContains: 'AC Deep Foam Jet', desc: 'tap/leak → Plumbing' },
  { q: 'My AC is running but not cooling', expectContains: 'AC Repair', desc: 'AC not cooling → AC Repair' },
  { q: 'My AC is not cooling', expectContains: 'AC Repair', desc: 'AC not cooling variant' },
  { q: 'My AC is blowing warm air', expectContains: 'AC Repair', desc: 'AC warm air → AC Repair' },
  { q: 'My washing machine is making a strange noise', expectContains: 'Washing Machine', notContains: 'AC Deep Foam Jet', desc: 'washing machine → Washing Machine / Appliance Repair' },
  { q: 'My washing machine is vibrating loudly', expectContains: 'Washing Machine', notContains: 'AC Deep Foam Jet', desc: 'washing machine vibrating → Washing Machine' },
  { q: 'My refrigerator is not cooling', expectContains: 'Refrigerator', notContains: 'AC Deep Foam Jet', desc: 'refrigerator not cooling → Refrigerator' },
  { q: 'fridge not cooling', expectContains: 'Refrigerator', desc: 'fridge → Refrigerator' },
  { q: 'My microwave is not heating', expectContains: 'Microwave', notContains: 'AC Deep Foam Jet', desc: 'microwave not heating → Microwave' },
  { q: 'I want to order pizza and watch Netflix', expectLow: true, desc: 'unrelated → low confidence' },
];

let passed = 0;
for (const c of cases) {
  const r = semanticMatch(c.q);
  const name = r.detectedService ? r.detectedService.name : '';
  const isLow = r.isLowConfidence;
  if (c.expectLow) {
    assert(isLow, `Expected low confidence for "${c.q}" but got ${name} ${r.confidencePercent}%`);
  } else {
    assert(!isLow, `Expected not low for "${c.q}" but was low`);
    assert(name.includes(c.expectContains), `Expected "${c.expectContains}" in "${name}" for "${c.q}"`);
    if (c.notContains) assert(!name.includes(c.notContains), `Should not contain "${c.notContains}" for "${c.q}" but got "${name}"`);
  }
  passed++;
  console.log(`✓ ${c.desc}: "${c.q}" → "${name}" ${r.confidencePercent}%`);
}
console.log(`All ${passed} semantic tests passed.`);
