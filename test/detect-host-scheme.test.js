import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChatExport } from './core-harness.js';

function withHtmlClass(win, className, platform) {
  win.document.documentElement.className = className;
  const mq = win.matchMedia('(prefers-color-scheme: dark)');
  if (mq.matches) {
    Object.defineProperty(mq, 'matches', { configurable: true, value: false });
  }
  return win.ChatExport.detectHostScheme(platform);
}

test('detectHostScheme grok ignores Tailwind dark: variant tokens', () => {
  const { win } = loadChatExport('https://grok.com/c/test');
  assert.equal(withHtmlClass(win, 'scheme-light dark:scheme-dark light', 'grok'), 'light');
  assert.equal(withHtmlClass(win, 'dark', 'grok'), 'dark');
  assert.equal(withHtmlClass(win, 'light', 'grok'), 'light');
});

test('detectHostScheme generic host markers use exact class tokens', () => {
  const { win, CE } = loadChatExport('https://chat.qwen.ai/c/test');
  win.document.documentElement.className = 'dark:scheme-dark scheme-light';
  const mq = win.matchMedia('(prefers-color-scheme: dark)');
  if (mq.matches) {
    Object.defineProperty(mq, 'matches', { configurable: true, value: false });
  }
  assert.equal(CE.detectHostScheme('qwen'), 'light');
  win.document.documentElement.className = 'dark';
  assert.equal(CE.detectHostScheme('qwen'), 'dark');
});
