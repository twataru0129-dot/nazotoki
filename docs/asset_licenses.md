# 素材一覧と利用条件（公開前の確認表）

> **状態の凡例** ✅ 確認済み／⚠️ 未確認（公開前にユーザーの確認が必要）／— 該当なし
> 公開物は `dist/`（= `public/assets/` ＋ビルド成果物）。元素材ZIPはリポジトリ・公開物に含めていない。

## 画像（public/assets/bg・fx）
| 公開ファイル | 元素材 | 加工 | 出自 | 利用条件 |
|---|---|---|---|---|
| bg/a_north.webp | ⑬ backgrounds/study_A_north_concept.png | 中段の4冊を消して空き棚に | ユーザー提供の生成画像（生成サービス名は資料に記載なし） | ⚠️ 生成サービスの商用利用条件が未確認 |
| bg/a_east.webp | ⑬ study_A_east_concept.png | 窓の外を夜の庭木に差し替え（自作SVGを合成） | 同上 | ⚠️ 同上 |
| bg/a_south_closed.webp / a_south_open.webp | ⑬ study_A_south_open_concept.png | 扉板の射影変換で閉扉を作成、左壁の塗り替え・減光 | 同上 | ⚠️ 同上 |
| bg/a_west.webp | extra_visual_references/西面の絵画参考.png | 窓を壁に塗り替え | 同上 | ⚠️ 同上 |
| bg/hallway.webp | extra_visual_references/暗い回廊参考.png | WebP化のみ | 同上 | ⚠️ 同上 |
| fx/door_leaf.webp・fx/door_frame_hole.webp | a_south_closed（上記）から切り出し | 切り出し・透明化 | 同上 | ⚠️ 同上 |

## SVG
| 公開ファイル／部品 | 出自 | 利用条件 |
|---|---|---|
| svg/paintings/painting_A〜D.svg、svg/cards/card_A〜D_back.svg、svg/clock_face.svg | ⑬ 素材パックの自作SVG（座標で作図、生成画像ではない） | ✅ プロジェクト内で作成 |
| 本・カード表・扉の装置・時計の針・木箱・鍵・写真・ノブ・月と太陽の意匠など（src/components/art） | 本プロジェクトで作図（本は⑬の本SVGと同じ図形） | ✅ プロジェクト内で作成 |

## 音声（public/assets/audio、無変換・SHA-256 は audio_manifest.json と一致）
| 種類 | ファイル | 出自（素材README・ファイルのタグ） | 利用条件 |
|---|---|---|---|
| BGM | title.mp3、reveal.mp3 | Suno（タグ：made with suno、作成日時・生成ID・作成者名 t_wataru0129） | ⚠️ 生成時のSunoプラン（商用利用可否）未確認 |
| BGM | study.mp3 | Suno（素材READMEの記載。**ファイル内にSunoの記録なし**） | ⚠️ 同上。出自の記録を補う必要あり |
| 環境音2・効果音15 | rain_loop、old_house、sfx 15種 | Runway（素材READMEの記載） | ⚠️ Runwayの利用規約・プラン未確認 |

**注意：** title.mp3・reveal.mp3 のタグに Suno の作成者名と生成IDが入っている。公開すると誰でも読める。消す場合は音質を変えずにタグだけ消せる（ファイルのハッシュは変わる）。→ ユーザーの判断待ち。

## フォント
| ファイル | 出自 | 利用条件 |
|---|---|---|
| fonts/NotoSerifJP-400.woff2、-700.woff2 | Noto Serif JP（Google）を使用文字だけにサブセット化 | ✅ SIL Open Font License 1.1。`fonts/OFL.txt` を同梱 |

## ソフトウェア（ビルドに含まれるもの）
React、React DOM（MIT）。開発時のみ：Vite・Vitest・Playwright・TypeScript・sharp・subset-font 等（公開物には含まれない）。✅

## 既存作品の素材
扉の演出は「初期のサバイバルホラー作品の雰囲気」を参考にした**オリジナル**の構成で、既存ゲームの画像・音声・映像・3Dモデル・ロゴは使っていない（扉は書斎Aの画像からの切り出し、ノブは自作SVG、音はRunway生成の door_open）。✅（本プロジェクト内の確認として）

## 秘密情報
リポジトリ全体と dist を、APIキー・トークン・パスワード・秘密鍵の書式で検索し、該当なし。✅
