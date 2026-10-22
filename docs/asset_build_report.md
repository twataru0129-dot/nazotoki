# 素材ビルド報告（scripts/build-assets.mjs が自動生成）

| 出力 | WebP設定 | PSNR(dB) | サイズ | 備考 |
|---|---|---|---|---|
| bg/a_north.webp | near-lossless60 | 47.9 | 1192KB | 仮：中段の4冊が描き込み済み、机上写真なし |
| bg/a_east.webp | q94 | 40.61 | 434KB | 仮：窓外を加工（敷地の夜景）。壁の版画は元画像のまま |
| bg/a_south_closed.webp | q90 | 40.06 | 249KB | 仮：閉扉は開扉画像の扉板を射影変換。左右の壁は塗り替え・減光の仮処置 |
| bg/a_south_open.webp | q92 | 40.14 | 293KB | 仮：開扉（閉扉と同じベース） |
| bg/a_west.webp | q94 | 40.54 | 351KB | 仮：窓を壁に加工。額内の生成絵は謎用SVGで覆う |

音声: 20ファイルを無変換でコピー（SHA-256照合済み）
