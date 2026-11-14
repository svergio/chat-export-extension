export function gatewayFieldsDisabled(serverOn) {
  return !!serverOn;
}

/** Visible preview only — never the full key. Copy uses the real value from settings. */
export function maskToken(key) {
  const s = typeof key === 'string' ? key.trim() : '';
  if (!s) return '';
  if (s.length <= 16) return s.slice(0, 6) + '…' + s.slice(-3);
  return s.slice(0, 12) + '…' + s.slice(-6);
}

export function tokenPreviewIsSafe(preview, fullKey) {
  const p = typeof preview === 'string' ? preview : '';
  const full = typeof fullKey === 'string' ? fullKey.trim() : '';
  if (!full) return p === '';
  if (p === full) return false;
  if (p.includes(full)) return false;
  return p.includes('…') || p.length < full.length;
}

export function pingOkDetail(browserId, serverVersion) {
  const id = typeof browserId === 'string' && browserId.trim() ? browserId.trim() : '';
  if (id) return 'OK · ' + id;
  const ver = typeof serverVersion === 'string' && serverVersion.trim() ? serverVersion.trim() : '';
  return ver ? 'OK · ' + ver : 'OK';
}
