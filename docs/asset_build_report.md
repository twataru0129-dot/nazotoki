# 素材ビルド報告（scripts/build-assets.mjs が自動生成）

| 出力 | WebP設定 | PSNR(dB) | サイズ | 備考 |
|---|---|---|---|---|
| bg/a_north.webp | near-lossless60 | 47.93 | 1184KB | 加工：中段の4冊を消して空き棚に（本と机上の写真はゲーム側でSVG表示） |
| bg/a_east.webp | q94 | 40.61 | 434KB | 仮：窓外を加工（敷地の夜景）。壁の版画は元画像のまま |
| bg/a_south_closed.webp | q90 | 40.06 | 249KB | 仮：閉扉は開扉画像の扉板を射影変換。左右の壁は塗り替え・減光の仮処置 |
| bg/a_south_open.webp | q92 | 40.14 | 293KB | 仮：開扉（閉扉と同じベース） |
| fx/door_frame.webp | q92 | - | 83KB | 閉扉の戸枠ごとの切り出し（扉の演出用） |
| fx/door_leaf.webp | q92 | - | 49KB | 閉扉の扉板だけの切り出し（開く部品） |
| fx/door_frame_hole.webp | q92 | - | 33KB | 戸枠（扉板の部分は透明） |
| bg/hallway.webp | q90 | 40.77 | 212KB | 暗い通路（扉の演出・第5段階のエンディングで使用） |
| bg/a_west.webp | q94 | 40.54 | 351KB | 仮：窓を壁に加工。額内の生成絵は謎用SVGで覆う |

音声: 20ファイルを無変換でコピー（SHA-256照合済み）
