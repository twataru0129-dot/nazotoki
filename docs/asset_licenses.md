# 素材一覧と利用条件（公開前の確認表）

> **状態の凡例** ✅ 確認済み／⚠️ 未確認（公開前にユーザーの確認が必要）／— 該当なし
> 公開物は `dist/`（= `public/assets/` ＋ビルド成果物）。元素材ZIPはリポジトリ・公開物に含めていない。
> **前提：本作は個人制作の無料・非商用Webゲーム（販売・広告・課金なし）。** 以下は非商用公開を前提に整理した。

## 非商用公開での判定（2026-10-23 時点）
規約の原文ページ（suno.com・runway.com・各ヘルプセンター）は、この作業環境から開けなかった。そのため下表は、Web検索で得た公式ヘルプの引用・解説記事に基づく。**最終確認は公式ページで行ってほしい。**

| 素材 | 確認済み（作業側） | 規約上の扱い（検索結果による） | 未確認（ユーザーの確認が必要） | 非商用公開への支障 |
|---|---|---|---|---|
| Suno BGM 3曲（title・study・reveal） | ファイルの同一性（SHA-256）。title・reveal に Suno のタグあり／study はタグなし | **無料プラン：** 非商用に限り利用可、**Suno へのクレジット表記が必要**、権利は Suno に残る。**有料プラン（Pro/Premier）で作成した曲：** 商用利用も可 | ① 3曲を作ったときのプラン（無料／有料）。② study.mp3 が Suno 製である記録（生成履歴の画面など）。③ 公式規約の最新版（2025年11月の Warner との提携後に条件改定あり） | **無料プランでも、非商用＋クレジット表記で支障なしの見込み。** クレジットは設定画面に追加済み。プランが確認できるまで「公開可」とは判断しない |
| Runway 効果音・環境音 17種 | ファイルの同一性（SHA-256） | 公式ヘルプ：作成物は利用者のもので、Runway 側の非商用制限なし。無料プランだけ別扱いとする明確な記述は見つからず（第三者サイトの一部に、無料プランは評価用とする記述あり） | ① 作成時のプラン。② 音声生成機能に固有の条件がないか（公式ページで確認） | 現時点で支障は見つかっていない（未確認事項あり） |
| 背景画像（生成画像を加工） | 加工内容は上表のとおり | 生成サービス名が資料にない | 生成したサービス名と、そのプランの利用条件 | 判断できない（サービス名が必要） |
| フォント Noto Serif JP | OFL 1.1 の原文を同梱 | 非商用・商用とも利用可（同梱で条件を満たす） | なし | 支障なし ✅ |
| 自作SVG・プログラム | プロジェクト内で作成 | — | なし | 支障なし ✅ |

参考（検索で参照したページ）：
- Suno ヘルプ「Rights & Ownership」 https://help.suno.com/en/categories/550145-rights-ownership
- Suno ヘルプ「If I subscribe, do I get rights for the songs I made before subscribing?」 https://help.suno.com/en/articles/2425729
- Runway ヘルプ「Can I use the content I made in Runway for commercial purposes?」 https://help.runwayml.com/hc/en-us/articles/21668707517587
- Runway 利用規約 https://runway.com/terms-of-use

## 画像（public/assets/bg・fx）
| 公開ファイル | 元素材 | 加工 | 出自 | 利用条件 |
|---|---|---|---|---|
| bg/a_north.webp | ⑬ backgrounds/study_A_north_concept.png | 中段の4冊を消して空き棚に | ユーザー提供の生成画像（生成サービス名は資料に記載なし） | ⚠️ 生成サービスの商用利用条件が未確認 |
| bg/a_east.webp | ⑬ study_A_east_concept.png | 窓の外を夜の庭木に、壁の版画2枚を屋敷の外観（自作SVG）に差し替え | 同上 | ⚠️ 同上 |
| bg/a_south_closed.webp / a_south_open.webp | ⑬ study_A_south_open_concept.png | 扉板の射影変換で閉扉を作成。左の本棚・右の机／椅子／ランプ／外套掛けを壁・腰板・床に塗り替え、左の版画2枚を差し替え、減光 | 同上 | ⚠️ 同上 |
| bg/a_west.webp | extra_visual_references/西面の絵画参考.png | 窓を壁に塗り替え（継ぎ目をなじませ、角へ向けて減光） | 同上 | ⚠️ 同上 |
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

**クレジット表記：** 設定画面に「音楽（BGM）：Suno で生成／効果音・環境音：Runway で生成／フォント：Noto Serif JP（SIL OFL 1.1）」を表示（Suno 無料プランの表記条件に対応）。

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
