// ====================================================================
// Shared helper — inline YAML parse-error display for tab textareas
// ====================================================================
// The YAML-textarea tabs (RoomOverrides, Floorplan) are stateless
// render functions: a parse error must NOT write to config (that
// would persist broken YAML), so there is no re-render to carry an
// error flag through. Instead the template renders an unbound
// `.yaml-error` div next to the textarea and the change handler
// toggles it imperatively — Lit never touches unbound nodes after
// creation, so the message survives until the next (successful)
// parse clears it.
// ====================================================================

/**
 * Show `message` in the `.yaml-error` element next to `textarea`,
 * or hide it when `message` is null (parse succeeded).
 */
export function setYamlError(textarea: HTMLTextAreaElement, message: string | null): void {
  const errEl = textarea.parentElement?.querySelector<HTMLElement>('.yaml-error');
  if (!errEl) return;
  errEl.textContent = message ?? '';
  errEl.style.display = message ? 'block' : 'none';
}
