import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { GameProvider } from '../game/store';
import { NorthDecor, RoomView } from './SceneDecor';

const wrap = (ui: ReactElement) => render(<GameProvider>{ui}</GameProvider>);

describe('書斎A／Bの描き分け（伏線の維持）', () => {
  it('書斎Aには赤い本がなく、写真は提供写真のまま（もう1人はいない）', () => {
    const { container } = wrap(<NorthDecor room="A" />);
    expect(container.querySelectorAll('[data-scene-book="red"]')).toHaveLength(0);
    expect(container.querySelectorAll('[data-scene-book]')).toHaveLength(4);
    const photo = container.querySelector('[data-photo="A"]');
    expect(photo?.querySelector('image')?.getAttribute('href')).toContain('photo/old_photo.webp');
    expect(photo?.querySelector('[data-extra-person]')).toBeNull();
  });

  it('書斎Bには赤い本があり、写真には別の人物も写る（2人）', () => {
    const { container } = wrap(<NorthDecor room="B" />);
    expect(container.querySelectorAll('[data-scene-book="red"]')).toHaveLength(1);
    const photo = container.querySelector('[data-photo="B"]');
    expect(photo?.querySelector('image')?.getAttribute('href')).toContain('photo/old_photo.webp');
    expect(photo?.querySelector('[data-extra-person]')).not.toBeNull();
    expect(container.querySelector('[data-photo="A"]')).toBeNull();
  });

  it('時計は同じ本体で、Aは00:17、Bは00:14', () => {
    const a = wrap(<RoomView room="A" facing="east" />);
    expect(a.container.querySelector('[aria-label="時計の針は0時17分を指している"]')).not.toBeNull();
    a.unmount();
    const b = wrap(<RoomView room="B" facing="east" />);
    expect(b.container.querySelector('[aria-label="時計の針は0時14分を指している"]')).not.toBeNull();
    expect(b.container.querySelector('img')?.getAttribute('src')).toContain('bg/a_east.webp');
  });
});
