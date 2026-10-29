# helix-product-shared agent instructions

## Project overview

`helix-product-shared` — shared logic for the Helix Product Bus, consumed by the other Edge Commerce services. It also hosts `default.json`, the shared Renovate preset that every Edge Commerce repo extends.

## Common commands

Install dependencies:

```bash
npm install
```

Run lint:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

## Code style

Linting is `@adobe/eslint-config-helix` v3 on eslint 9 flat config (`eslint.config.js`). Always run `npm run lint` before finishing a change.

Two rules are worth knowing before you write code, because `eslint --fix` **cannot** resolve them together and they will otherwise cost a manual pass on every change:

- **Always brace control statements** — `curly: ['error', 'all']`
- **One statement per line** — `max-statements-per-line: ['error', { max: 1 }]`

The `curly` fixer rewrites a brace-less `if` into a single-line block, which then fails the second rule, and that rule has no fixer. So write it correctly the first time:

```js
// wrong: curly
if (rule.enabled === false) return false;

// wrong: what --fix produces, now fails max-statements-per-line
if (rule.enabled === false) { return false; }

// right
if (rule.enabled === false) {
  return false;
}
```

Note that this differs from the airbnb default (`curly: 'multi-line'`), which permits the brace-less form, so it is not the style most JavaScript is written in.

Other conventions that are easy to get wrong:

- **Pin dependencies to exact versions** in `package.json` — no `^` or `~` ranges. Renovate bumps the pin and opens a visible version-bump PR; a caret range turns that into an invisible lockfile-only update.
- **Do not use `/* eslint-env */` comments.** Flat config ignores them silently and eslint 10 rejects them outright. Declare globals in `eslint.config.js` instead.
- **When you move a statement onto a different line, check for a directive comment above it.** `// eslint-disable-next-line` and `/* c8 ignore next */` are line-anchored: reformatting the code below them silently stops them applying, which shows up as a surprise lint error or a coverage drop rather than anything obvious.
