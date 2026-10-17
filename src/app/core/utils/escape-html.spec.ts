import { escapeHtml } from './escape-html';

describe('escapeHtml', () => {
  it('escapes the characters that start markup or end an attribute', () => {
    expect(escapeHtml(`<b class="x">Tom & Jerry's</b>`)).toBe(
      '&lt;b class=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/b&gt;'
    );
  });

  it('leaves plain text alone', () => {
    expect(escapeHtml('Galaxy Black PLA')).toBe('Galaxy Black PLA');
  });
});
