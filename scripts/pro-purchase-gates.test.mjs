import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const app = join(root, 'src', 'app');

// Build output; the docs are content, not calls to action in the app's own chrome.
const SKIP_DIRS = new Set([join(app, 'documentation', 'generated')]);

// App Store guideline 3.1.1: the iOS app may not sell Pro or point at another way to pay
// (#366). Every one of these must sit inside a block whose condition requires
// CAN_PURCHASE_PRO, read in components as `canPurchasePro`.
const CALLS_TO_ACTION = [
  /routerLink="\/subscription"/,
  /\[routerLink\]="\['\/subscription'\]"/,
  /href="\/subscription"/,
  /upgrade to pro/i,
  /\bcheckout\(/,
  /\bmanageSubscription\(/,
];

function* templates(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(path)) yield* templates(path);
    } else if (entry.name.endsWith('.html')) {
      yield path;
    }
  }
}

/** A condition that, when true, means purchase is allowed. */
function requires(condition) {
  return (
    !condition.includes('||') && /(^|[^!\w.])canPurchasePro\b/.test(condition)
  );
}

/** A condition that, when false, means purchase is allowed. */
function forbids(condition) {
  return /^\s*!\s*canPurchasePro\s*$/.test(condition);
}

/** Index just past the `)` matching the `(` at `open`, skipping quoted text. */
function closeParen(text, open) {
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c;
    } else if (c === '(') {
      depth++;
    } else if (c === ')' && --depth === 0) {
      return i + 1;
    }
  }
  return text.length;
}

/**
 * Returns the offsets in `template` where a call to action sits outside every block that
 * guarantees canPurchasePro. Walks Angular's @-blocks, skipping tags (attribute braces) and
 * {{ }} interpolations, and tracks @if / @else if / @else chains so an @else that follows
 * `@else if (!canPurchasePro)` counts as guarded.
 */
export function unguardedCallsToAction(template) {
  const text = template
    .replace(/<!--[\s\S]*?-->/g, (m) => ' '.repeat(m.length))
    .replace(/\{\{[\s\S]*?\}\}/g, (m) => ' '.repeat(m.length));

  // Each open block: whether it guarantees purchase, and (for @if chains) whether an
  // earlier branch of its chain was `!canPurchasePro`.
  const stack = [];
  // The chain that just closed at the current depth, for a following @else.
  let lastChain = null;
  const guardedRanges = [];

  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === '<') {
      let quote = null;
      let j = i + 1;
      for (; j < text.length; j++) {
        const d = text[j];
        if (quote) {
          if (d === quote) quote = null;
        } else if (d === '"' || d === "'") {
          quote = d;
        } else if (d === '>') {
          break;
        }
      }
      i = j + 1;
      continue;
    }
    if (c === '@') {
      const m = /^@(else\s+if|else|\w+)\s*/.exec(text.slice(i));
      if (m) {
        const keyword = m[1].replace(/\s+/g, ' ');
        let j = i + m[0].length;
        let condition = '';
        if (text[j] === '(') {
          const end = closeParen(text, j);
          condition = text.slice(j + 1, end - 1);
          j = end;
        }
        while (/\s/.test(text[j] ?? '')) j++;
        if (text[j] === '{') {
          let guards = false;
          let chainForbade = false;
          if (keyword === 'if') {
            guards = requires(condition);
            chainForbade = forbids(condition);
          } else if (keyword === 'else if' || keyword === 'else') {
            const prior = lastChain ?? { forbade: false };
            chainForbade = prior.forbade || forbids(condition);
            guards =
              requires(condition) || (keyword === 'else' && prior.forbade);
          }
          stack.push({ keyword, guards, chainForbade, start: j + 1 });
          lastChain = null;
          i = j + 1;
          continue;
        }
      }
    }
    if (c === '}') {
      const block = stack.pop();
      if (block) {
        if (block.guards) guardedRanges.push([block.start, i]);
        lastChain = ['if', 'else if'].includes(block.keyword)
          ? { forbade: block.chainForbade }
          : null;
      }
      i++;
      continue;
    }
    if (!/\s/.test(c)) lastChain = lastChain && c === '@' ? lastChain : null;
    i++;
  }

  const unguarded = [];
  for (const pattern of CALLS_TO_ACTION) {
    const global = new RegExp(pattern.source, pattern.flags + 'g');
    for (const match of text.matchAll(global)) {
      const at = match.index;
      if (!guardedRanges.some(([start, end]) => at >= start && at < end)) {
        unguarded.push(at);
      }
    }
  }
  return unguarded.sort((a, b) => a - b);
}

test('every Pro call to action in a template is guarded by canPurchasePro', () => {
  const found = [];
  for (const file of templates(app)) {
    const source = readFileSync(file, 'utf8');
    for (const at of unguardedCallsToAction(source)) {
      const line = source.slice(0, at).split('\n').length;
      found.push(
        `${relative(root, file)}:${line}: ${source.split('\n')[line - 1].trim()}`
      );
    }
  }
  assert.deepEqual(found, []);
});

test('the scanner flags an unguarded link and accepts a guarded one', () => {
  assert.equal(
    unguardedCallsToAction('<a routerLink="/subscription">Go</a>').length,
    1
  );
  assert.deepEqual(
    unguardedCallsToAction(
      '@if (canPurchasePro) { <a routerLink="/subscription">Go</a> }'
    ),
    []
  );
});

test('the scanner does not treat a negated or optional guard as a guard', () => {
  assert.equal(
    unguardedCallsToAction('@if (!canPurchasePro) { Upgrade to Pro }').length,
    1
  );
  assert.equal(
    unguardedCallsToAction('@if (a || canPurchasePro) { Upgrade to Pro }')
      .length,
    1
  );
  assert.equal(
    unguardedCallsToAction(
      '@if (canPurchasePro) { ok } @else { Upgrade to Pro }'
    ).length,
    1
  );
});

test('the scanner treats the branch after else-if !canPurchasePro as guarded', () => {
  assert.deepEqual(
    unguardedCallsToAction(
      '@if (isPro()) { thanks } @else if (!canPurchasePro) { not here } @else { <button (click)="checkout(\'m\')"></button> }'
    ),
    []
  );
});

test('the scanner ignores braces inside attributes and interpolations', () => {
  assert.deepEqual(
    unguardedCallsToAction(
      '@if (canPurchasePro) { <div [class]="{ a: b }">{{ x ? "}" : y }}</div> Upgrade to Pro }'
    ),
    []
  );
});
