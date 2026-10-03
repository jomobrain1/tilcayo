# @tilcayo/styles

A small, framework-independent CSS foundation with zero runtime dependencies.
All component classes use `tl-`; theme tokens use `--tl-`. No React or JavaScript
runtime is required. Components are opt-in; the global base only sets box sizing,
body typography/colors, responsive images/video, control font inheritance, and
keyboard focus indicators. Native headings, lists, links and controls retain
their normal behavior unless a component class is applied.

## Install and import

This package is not published yet. From this repository, build and pack it:

```sh
npm run build -w @tilcayo/styles
npm pack -w @tilcayo/styles
```

Install that tarball in a consumer with `npm install /path/to/tilcayo-styles-0.0.2.tgz`.
After publication, installation will be `npm install @tilcayo/styles`.
In a CSS-aware bundler such as Vite, either import works:

```js
import "@tilcayo/styles";
// Or: import "@tilcayo/styles/index.css";
```

Use only one import. These exports are CSS, not JavaScript modules for Node.js.
For plain HTML, serve the built stylesheet and load it with a `<link>` element.

## Preview in the existing client

If you have the optional local `client/` Vite application, run from the repository root:

```sh
npm run build -w @tilcayo/styles
npm --prefix client run dev
```

Open `/styles-preview.html` on the Vite server. It is a standalone HTML fixture
and leaves the React starter unchanged. Rebuild styles and reload after edits.
The preview imports local built CSS; packed-package imports are verified separately.
The client application is not a dependency of the styles package.

## Theme customization

Load overrides after Tilcayo:

```css
:root {
  --tl-primary: #7c3aed;
  --tl-primary-hover: #6d28d9;
  --tl-radius-md: 12px;
}
```

Tokens cover semantic colors (including button foreground/hover colors), surfaces,
text, borders, focus, radii, spacing, font families/sizes, shadows, container widths
and transition durations. See `src/tokens.css` for the complete defaults.
Keep foreground/background combinations readable when overriding colors.

For explicit dark mode, use `<html data-tl-theme="dark">`. The attribute also
scopes tokens to a region; a `tl-card` or `tl-app-shell` applies surface/text colors
there. No automatic detection, toggle, or theme engine is included. To customize
dark defaults, override `[data-tl-theme="dark"]` after the package stylesheet.

## Container, card, form and buttons

```html
<main class="tl-container tl-container-md">
  <div class="tl-stack">
    <header>
      <h1 class="tl-heading-1">Books</h1>
      <p class="tl-text-muted">Manage your books.</p>
    </header>
    <section class="tl-card" aria-labelledby="new-book">
      <div class="tl-card-header">
        <h2 id="new-book" class="tl-card-title">New book</h2>
      </div>
      <div class="tl-card-body tl-stack">
        <div class="tl-form-group">
          <label class="tl-label" for="title">Title</label>
          <input id="title" class="tl-input" type="text" aria-describedby="title-help">
          <p id="title-help" class="tl-help-text">Enter the full book title.</p>
        </div>
        <button class="tl-btn tl-btn-primary" type="button">Add book</button>
      </div>
      <div class="tl-card-footer tl-text-sm">All fields are editable.</div>
    </section>
  </div>
</main>
```

A plain `tl-card` includes padding without any subcomponents. Header, body and
footer add internal spacing and separators. Combine base classes with variants:

| Base | Variants / related classes |
| --- | --- |
| `tl-container` | `tl-container-sm`, `-md`, `-lg`, `-xl` |
| `tl-stack` | `tl-stack-sm`, `tl-stack-lg` |
| `tl-btn` | `tl-btn-primary`, `-secondary`, `-danger`, `-outline`, `-ghost`, `-sm`, `-lg`, `-block` |
| Forms | `tl-form-group`, `tl-label`, `tl-input`, `tl-select`, `tl-textarea`, `tl-help-text`, `tl-form-error`, `tl-input-error` |
| Native choices | `tl-checkbox`, `tl-radio` (accent color only) |
| Headings | `tl-heading-1` through `tl-heading-4` |
| Text | `tl-text`, `tl-text-sm`, `tl-text-lg`, `tl-text-muted` |
| Weight | `tl-font-medium`, `tl-font-semibold`, `tl-font-bold` |

For invalid controls, set `aria-invalid="true"` and connect a visible
`tl-form-error` using `aria-describedby`. The CSS does not validate inputs.
Use native `disabled` on buttons/controls. `aria-disabled="true"` styles buttons
but applications must prevent activation themselves, especially on links.

## Layout and spacing

`tl-flex` supports `tl-flex-col`, `tl-flex-wrap`, `tl-items-start/center/end` and
`tl-justify-start/center/between/end`. Add `tl-gap-1/2/3/4/6/8` as needed.

```html
<div class="tl-grid tl-grid-cols-4">
  <div class="tl-card">First</div>
  <div class="tl-card">Second</div>
  <div class="tl-card">Third</div>
  <div class="tl-card">Fourth</div>
</div>
```

Grids start at one column. At 48rem, column variants 2/3/4 use two columns;
at 64rem, variants 3/4 reach their requested count. `tl-grid-cols-1` stays one.
These correspond to 768px and 1024px with the default 16px browser font size.

Limited spacing: `tl-mt-2/4/6`, `tl-mb-2/4/6`, `tl-p-2/4/6`, `tl-px-4`,
`tl-py-4`. These suit wrappers; component padding can be customized with a later
application rule. There are no responsive utility permutations.

## Tables

```html
<div class="tl-table-wrapper" tabindex="0" role="region" aria-label="Books table">
  <table class="tl-table tl-table-striped">
    <caption>Available books</caption>
    <thead><tr><th scope="col">Title</th><th scope="col">Year</th></tr></thead>
    <tbody><tr><td>The River</td><td>2026</td></tr></tbody>
  </table>
</div>
```

The wrapper permits horizontal scrolling without changing table semantics.
Use a named, focusable region when keyboard scrolling is needed.

## Alerts and badges

```html
<p class="tl-alert tl-alert-success" role="status">Book saved.</p>
<p class="tl-alert tl-alert-danger" role="alert">Unable to save. Try again.</p>
<span class="tl-badge tl-badge-primary">Draft</span>
```

Alerts: `tl-alert-info/success/warning/danger`. Badges:
`tl-badge-primary/success/warning/danger/neutral`. Include meaningful text;
color alone must not communicate status. Add live-region roles when the content
is a dynamic notice, not indiscriminately on every static block.

## Navigation and shell

```html
<div class="tl-app-shell">
  <aside class="tl-sidebar">
    <nav aria-label="Sections"><a href="/books">Books</a></nav>
  </aside>
  <main class="tl-main">
    <nav class="tl-navbar" aria-label="Main">
      <a class="tl-navbar-brand" href="/">Library</a>
      <ul class="tl-navbar-nav"><li><a href="/books">Books</a></li></ul>
      <div class="tl-navbar-actions"><button class="tl-btn" type="button">Help</button></div>
    </nav>
    <div class="tl-content">Application content</div>
  </main>
</div>
```

Below 64rem the sidebar sits above the main content. At 64rem it occupies a
15rem column; content uses the remaining width. Navbar items wrap. These are
structural classes only: no dashboard, hidden mobile menu or JavaScript toggle.

## Accessibility and utilities

Keyboard focus uses a 3px `--tl-focus` outline on links, controls and focusable
elements. Buttons retain a minimum 44px height even in the compact variant.
Reduced-motion preferences disable component transitions. Controls keep native
behavior; use semantic markup, labels, descriptions and appropriate heading levels.

Utilities: `tl-hidden`, `tl-block`, `tl-inline-flex`, `tl-w-full`,
`tl-text-left/center/right`, `tl-overflow-x-auto`, `tl-sr-only`.
`tl-sr-only` hides supporting text visually while retaining it for assistive
technology; do not use it to hide interactive controls that need visible focus.

## Build and package

`scripts/build.mjs` reads the local imports in `src/index.css` in order and emits
one readable `dist/index.css` with no remaining imports. It uses only Node APIs.
The npm artifact contains built CSS, this README and package metadata. CSS is
marked as a side effect so consumers retain stylesheet imports during bundling.
No TypeScript build or CSS processor is required by this package.
