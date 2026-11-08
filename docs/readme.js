(() => {
  const snippets = JSON.parse(document.getElementById('readme-snippets').textContent);
  const status = document.getElementById('copy-status');
  const timers = new WeakMap();
  async function copy(text) {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
    } catch { /* File previews and denied clipboard permission can use selection-based copying. */ }
    const previous = document.activeElement;
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.append(field);
    try {
      field.select();
      if (!document.execCommand('copy')) throw new Error('Copy unavailable');
    } finally { field.remove(); previous?.focus(); }
  }
  document.addEventListener('click', async event => {
    const button = event.target instanceof Element ? event.target.closest('button[data-code-index]') : null;
    if (!button || button.disabled) return;
    const index = Number(button.dataset.codeIndex);
    if (!Number.isInteger(index) || index < 0 || index >= snippets.length) return;
    clearTimeout(timers.get(button));
    const label = button.querySelector('span');
    button.disabled = true;
    status.textContent = '';
    try {
      await copy(snippets[index]);
      label.textContent = 'Copied';
      button.dataset.state = 'copied';
      status.textContent = 'Code copied.';
    } catch {
      label.textContent = 'Copy failed';
      button.dataset.state = 'error';
      status.textContent = 'Copy is unavailable. Select the code and copy it manually.';
    } finally { button.disabled = false; }
    timers.set(button, setTimeout(() => { label.textContent = 'Copy'; delete button.dataset.state; }, 2000));
  });
})();
