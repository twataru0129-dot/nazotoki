import type { OptionalId, Progress } from './state';

// 任意調査（設計書§11）。どれもクリア条件ではない。見逃してもクリア後に回収できる。
export interface OptionalDef {
  id: OptionalId;
  /** 手帳の見出し（発見前は手帳に出さない） */
  title: string;
  /** 手帳のメモ */
  note: string;
  /** 発見したときの独白 */
  monologue: string;
  /** どこで見つかるか（手帳の発見済み項目に添える） */
  place: string;
}

export const OPTIONALS: Record<OptionalId, OptionalDef> = {
  O1: {
    id: 'O1',
    title: '写真の右端',
    note: '光沢が違い、人が消されたかもしれない。',
    monologue: '写真の右端だけ、紙の光沢が違う。……ここに、誰かが写っていたのではないか。',
    place: '机の上の古い写真',
  },
  O2: {
    id: 'O2',
    title: '本棚の金具',
    note: '収納用には大きすぎる固定金具。',
    monologue: '収納の奥に、太い真鍮の金具がある。小物入れを留めるにしては、大きすぎる。',
    place: '本棚の隠し収納の奥',
  },
  O3: {
    id: 'O3',
    title: '額縁の傷',
    note: '最近動かされた痕跡。',
    monologue: '額の裏の壁に、新しい擦り傷がある。最近、この絵は動かされている。',
    place: '絵画Cの裏',
  },
  O4: {
    id: 'O4',
    title: '引き出しの刻印',
    note: '数字のIIが刻まれている。',
    monologue: '右の引き出しの底に、「II」と刻まれている。……二番目？',
    place: '右の引き出しの底',
  },
  O5: {
    id: 'O5',
    title: '新しい蝶番',
    note: '蝶番だけ比較的新しい。',
    monologue: '古い扉なのに、蝶番だけが妙に新しい。最近付け替えられたようだ。',
    place: '南の扉',
  },
  O6: {
    id: 'O6',
    title: '手紙の裏面',
    note: '薄い二本の平行した跡。',
    monologue: '手紙の裏に、薄い二本の線の跡がある。平行に、何かを押し当てたような……。',
    place: '城戸の手紙の裏',
  },
};

export const OPTIONAL_IDS = Object.keys(OPTIONALS) as OptionalId[];

/** 出現条件：O2は本棚解決後、O3は絵画解決後、O4は右の引き出しが開いた後。ほかは最初から */
export function optionalAvailable(p: Progress, id: OptionalId): boolean {
  switch (id) {
    case 'O2':
      return p.books.compartmentOpen;
    case 'O3':
      return p.paintings.frameOpen;
    case 'O4':
      return p.desk.rightOpen;
    default:
      return true;
  }
}
