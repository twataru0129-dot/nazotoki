// 音声20ファイルの音量補正とループ点。
// 値は第0段階の計測（ffmpeg volumedetect / silencedetect、docs/asset_audit.md §2）から決めた。
//   gainDb：素材ごとの補正。効果音は平均およそ -30dB にそろえ、ピークが -1dB を超えない範囲で持ち上げる。
//           頻繁に鳴る音（本・紙）は控えめに、遠くの音（物音・足音）は近づけすぎない。
//   loopEnd：BGMの末尾の無音（title 178.89秒〜、study 206.12秒〜）の手前でループさせる。
//   crossfade：ループの継ぎ目を、次の周回の頭と重ねてつなぐ秒数。
export interface MixEntry {
  gainDb: number;
  loopEnd?: number;
  crossfade?: number;
}

export const MIX: Record<string, MixEntry> = {
  // BGM（平均 -17〜-20dB → -20dB 付近へ）
  title: { gainDb: -0.9, loopEnd: 178.85, crossfade: 2.0 },
  study: { gainDb: -2.6, loopEnd: 206.05, crossfade: 2.0 },
  reveal: { gainDb: 0 },
  // 環境音
  rain_loop: { gainDb: 14, loopEnd: 20.0, crossfade: 0.6 }, // 平均 -53.9dB と非常に小さいため持ち上げる
  old_house: { gainDb: -6.6 },
  // 効果音
  book_move: { gainDb: -2 },
  box_unlock: { gainDb: 1.5 },
  card_flip: { gainDb: 9 },
  card_pickup: { gainDb: 3.5 },
  clock_gear: { gainDb: -3.4 },
  clock_reset: { gainDb: 0 },
  door_mechanism: { gainDb: -2 },
  door_open: { gainDb: 0 }, // BGMを止めて際立たせる
  door_unlock: { gainDb: -3.4 },
  drawer_open: { gainDb: 3.3 },
  footsteps_hallway: { gainDb: 8 },
  frame_move: { gainDb: 0 },
  mysterious_knock: { gainDb: 12 }, // 平均 -47.9dB。壁の向こうの小さな音として聞こえる程度に
  paper_turn: { gainDb: 2 },
  shelf_unlock: { gainDb: 3.6 },
};

export const dbToGain = (db: number) => Math.pow(10, db / 20);

/** 洋館のきしみ：不規則な間隔（秒）。直前に他の効果音が鳴っていたら見送る */
export const OLD_HOUSE = { minGap: 40, maxGap: 90, quietAfterSfx: 6, retryMin: 10, retryMax: 20 };
