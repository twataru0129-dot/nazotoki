import { render } from '@testing-library/react';
import { BookArt } from './BookArt';

// 指示どおりの対応：青＝三日月→波、白＝波→葉、黒＝葉→星、緑＝星→太陽
const EXPECTED = {
  blue: ['moon', 'wave'],
  ivory: ['wave', 'leaf'],
  black: ['leaf', 'star'],
  green: ['star', 'sun'],
} as const;

describe('本の背表紙の絵柄', () => {
  it.each(Object.entries(EXPECTED))('%s：左右に1つずつ、決められた絵柄', (id, [left, right]) => {
    const { container } = render(<BookArt id={id as keyof typeof EXPECTED} />);
    const syms = [...container.querySelectorAll('[data-symbol]')];
    expect(syms.map((g) => [g.getAttribute('data-side'), g.getAttribute('data-symbol')])).toEqual([
      ['left', left],
      ['right', right],
    ]);
  });

  it('絵柄に文字（漢字）を重ねない', () => {
    for (const id of Object.keys(EXPECTED)) {
      const { container } = render(<BookArt id={id as keyof typeof EXPECTED} />);
      expect(container.querySelectorAll('text')).toHaveLength(0);
      expect(container.textContent).toBe('');
    }
  });
});
