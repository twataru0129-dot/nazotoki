// 第1章ラストシーンの台本（設計書§15、約28秒）。時刻はすべてミリ秒。
// 字幕は1行あたり最低1.5秒以上表示し、次の字幕と重ならない（途中で切れない）。
export const ENDING_MS = 28_000;
/** 「第1章 完」を出したまま待つ時間（タップで先へ） */
export const ENDING_HOLD_MS = 3_000;

export type SceneId = 'hall' | 'farDoor' | 'studyB' | 'clockB' | 'end';
export const SCENES_T: { id: SceneId; from: number; to: number }[] = [
  { id: 'hall', from: 0, to: 5_000 },
  { id: 'farDoor', from: 5_000, to: 11_000 },
  { id: 'studyB', from: 11_000, to: 17_000 },
  { id: 'clockB', from: 17_000, to: 23_000 },
  { id: 'end', from: 23_000, to: ENDING_MS },
];

export const SUBTITLES: { from: number; to: number; text: string }[] = [
  { from: 700, to: 4_600, text: '……まだ、屋敷の中なのか？' },
  { from: 5_600, to: 9_800, text: '奥にも、部屋がある……？' },
  { from: 11_800, to: 13_500, text: '……え？' },
  { from: 13_700, to: 16_800, text: 'この部屋……さっきの……？' },
  { from: 17_800, to: 19_700, text: '……0時14分？' },
  { from: 19_900, to: 22_800, text: 'さっきの時計は、0時17分だったはず……。' },
  { from: 23_200, to: 24_800, text: 'だとしたら……' },
  { from: 24_900, to: 26_900, text: 'あの部屋は、いったい何だったんだ？' },
];

/** 「第1章 完」の表示開始 */
export const TITLE_CARD_AT = 26_900;

/** 音の合図。reveal は通路から流し、書斎Bが現れる 11 秒で止めて静寂を作る */
export const AUDIO_CUES: { at: number; kind: 'sfx' | 'bgm' | 'stopBgm' | 'stopSfx'; key?: string }[] = [
  { at: 0, kind: 'bgm', key: 'reveal' },
  { at: 300, kind: 'sfx', key: 'footsteps_hallway' },
  { at: 7_800, kind: 'sfx', key: 'door_open' },
  { at: 10_400, kind: 'stopBgm' },
  { at: 11_000, kind: 'stopSfx', key: 'door_open' },
];

export function sceneAt(t: number): SceneId {
  return (SCENES_T.find((s) => t >= s.from && t < s.to) ?? SCENES_T[SCENES_T.length - 1]).id;
}

export function subtitleAt(t: number): string | null {
  return SUBTITLES.find((s) => t >= s.from && t < s.to)?.text ?? null;
}

/** 0〜1 に収めた進み具合 */
export const progressIn = (t: number, from: number, to: number) => Math.min(1, Math.max(0, (t - from) / (to - from)));
