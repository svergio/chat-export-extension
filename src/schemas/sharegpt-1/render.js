function roleToFrom(role, roleTag) {
  const r = String(roleTag || role || '').toLowerCase();
  if (r === 'user' || r === 'human') return 'human';
  return 'gpt';
}

function conversations(messages) {
  return (messages || []).map(function (msg) {
    return {
      from: roleToFrom(msg.role, msg.roleTag),
      value: String(msg.text || '')
    };
  });
}

function compactMeta(meta) {
  const keys = ['platform', 'url', 'title', 'exported_at', 'exported', 'chat_id', 'model'];
  const out = { schema: 'sharegpt/1' };
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (meta[k] == null || meta[k] === '') continue;
    if (k === 'exported') {
      if (!out.exported_at) out.exported_at = meta[k];
      continue;
    }
    out[k] = meta[k];
  }
  return out;
}

function yamlEscape(v) {
  const s = String(v == null ? '' : v);
  if (/[:#\n"'{}[\],&*?|<>=!%@`]/.test(s) || s !== s.trim()) {
    return JSON.stringify(s);
  }
  return s;
}

export function renderSharegpt(format, meta, messages, ce) {
  const conv = conversations(messages);
  const info = compactMeta(meta || {});

  if (format === 'json') {
    const payload = Object.assign({}, info, { conversations: conv });
    return JSON.stringify(payload, null, 2) + '\n';
  }

  if (format === 'yaml') {
    const lines = [];
    Object.keys(info).forEach(function (k) {
      lines.push(k + ': ' + yamlEscape(info[k]));
    });
    lines.push('conversations:');
    if (!conv.length) {
      lines.push('  []');
    } else {
      for (let i = 0; i < conv.length; i++) {
        lines.push('  - from: ' + yamlEscape(conv[i].from));
        lines.push('    value: |');
        String(conv[i].value)
          .split('\n')
          .forEach(function (line) {
            lines.push('      ' + line);
          });
      }
    }
    return lines.join('\n') + '\n';
  }

  if (format === 'md') {
    const parts = ['<!-- schema: sharegpt/1 -->', ''];
    Object.keys(info).forEach(function (k) {
      if (k === 'schema') return;
      parts.push(k + ': ' + info[k]);
    });
    parts.push('');
    for (let i = 0; i < conv.length; i++) {
      parts.push('### ' + conv[i].from);
      parts.push('');
      parts.push(conv[i].value.trim());
      parts.push('');
    }
    return parts.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
  }

  if (format === 'html') {
    if (ce && typeof ce.buildHtml === 'function') {
      return ce.buildHtml(meta, messages);
    }
    return '<!DOCTYPE html><html><body><pre>' + JSON.stringify(conv, null, 2) + '</pre></body></html>\n';
  }

  if (format === 'pdf') {
    if (ce && typeof ce.buildPdf === 'function') {
      return ce.buildPdf(meta, messages);
    }
    return Promise.reject(new Error('pdf builder missing'));
  }

  throw new Error('unsupported format: ' + format);
}
