# 素材の出自と利用条件（ASSET_PROVENANCE）

『午前0時17分の書斎』第1章で配布する素材の、制作元と利用条件の記録。

- **前提：** 本作は個人制作の無料・非商用Webゲーム。販売・広告収益・課金はない。
- **記録の方針：**
  - 「確認済み」は、ファイルそのもの、または元素材に同梱された資料で確かめられた事実に限る。
  - 資料に書かれていないことは推測せず「不明」とする。
  - 規約の解釈は、公式の原文で確かめるまで「未確認」とする。
- **最終更新：** 2026-10-23

## 1. 音声（public/assets/audio、20ファイル）

### 共通
- **元ファイルの扱い：** 元素材ZIP内の元ファイルは変更せず保持している（リポジトリ・公開物には含めない）。
- **配布用ファイル：** `scripts/build-assets.mjs` で次のとおり作成する。
  - 元ファイルの SHA-256 を `audio_manifest.json` の値と照合する。
  - 再エンコードせず、ファイル先頭・末尾のタグ（ID3v2／ID3v1／APE）だけを外す。
  - 音声データ（MPEGフレーム）は変えていない。
  - 元・配布用それぞれの SHA-256 とサイズは `src/data/audio_manifest.json` に記録している（`sha256`・`size_bytes`＝元、`distributed_*`＝配布用）。
- **外したメタデータ（2026-10-23 確認）：**
  - title.mp3・reveal.mp3：曲名、作成者名（Sunoのアカウント名）、Suno の曲ページURL、生成ID、作成日時、歌詞欄（[Instrumental]）、カバー画像、C2PA（コンテンツ来歴）記録。
  - それ以外の18ファイル：エンコーダー名（`TSSE: Lavf…`）のみ。
- **残しているもの：** 1フレーム目の中のエンコーダー情報（`Lavf`／`Lavc` の文字列とフレーム数などの再生用情報）。音声データの一部のため残している。個人を特定する情報は含まない。
- **配布用に残っていないことの確認：** `src/game/assets.test.ts` でタグ・`suno.com`・`c2pa` の文字列が無いことを検査している。

### BGM 3曲（Suno）
| ファイル | 用途 | 制作元の根拠（確認済み） | 不明・未確認 |
|---|---|---|---|
| bgm/title.mp3 | タイトル | ① 元素材 `audio/README_最初にお読みください.md` に「Sunoで制作・採用したBGM3曲」とある。② 元ファイルのタグに「made with suno」と作成日時 2026-10-22。③ Suno, Inc. の署名付き C2PA 記録 | 制作時の Suno プラン |
| bgm/reveal.mp3 | エンディング | title.mp3 と同じ（①②③） | 制作時の Suno プラン |
| bgm/study.mp3 | 探索 | ① の README の記載のみ。**元ファイルに Suno のタグ・C2PA 記録はない** | 制作時の Suno プラン。Suno で作った記録（生成履歴の画面など） |

### 環境音2・効果音15（Runway）
対象ファイル：
- 環境音：ambient/rain_loop・old_house
- 効果音：sfx/book_move、box_unlock、card_flip、card_pickup、clock_gear、clock_reset、door_mechanism、door_open、door_unlock、drawer_open、footsteps_hallway、frame_move、mysterious_knock、paper_turn、shelf_unlock

| 項目 | 内容 |
|---|---|
| 制作元の根拠（確認済み） | 元素材 README に「Runwayで制作してユーザーが採用した音声17種類」とある。ファイル内のタグはエンコーダー名だけで、Runway を示す記録はない |
| 不明・未確認 | 制作時の Runway プラン。音声生成機能に固有の条件があるか |

## 2. 画像

### 背景・演出用（public/assets/bg・fx、WebP）
| ファイル | 元素材 | 加工（`scripts/build-assets.mjs`） |
|---|---|---|
| bg/a_north.webp | ⑬ backgrounds/study_A_north_concept.png | 中段の4冊を消して空き棚に |
| bg/a_east.webp | ⑬ backgrounds/study_A_east_concept.png | 窓の外を夜の庭に、壁の版画2枚を屋敷の外観の版画に差し替え |
| bg/a_south_closed.webp・bg/a_south_open.webp | ⑬ backgrounds/study_A_south_open_concept.png | 開扉の扉板を変形して閉扉を作成。左の本棚と、右の机・椅子・ランプ・外套掛けを壁・腰板・床に塗り替え。左の版画2枚を差し替え。左右端を減光 |
| fx/door_leaf.webp・fx/door_frame_hole.webp | a_south_closed から切り出し | 扉板／戸枠（扉板部分は透明） |
| bg/a_west.webp | extra_visual_references/西面の絵画参考.png | 右端の窓を壁・腰板に塗り替え、継ぎ目をなじませ減光 |
| bg/hallway.webp | extra_visual_references/暗い回廊参考.png | WebP化のみ |

- **確認済み：**
  - 元素材の資料（⑬ README・設計書）に、背景は「生成画像」「画像生成AI」によるものと記載がある。
  - 配布用 WebP に EXIF・XMP などのメタデータはない。
- **不明：** 画像を生成したサービス名・プラン・生成日時。元素材の資料に記載がない。
- **未確認：** 生成サービスの利用条件。

### 机上の古い写真（public/assets/photo/old_photo.webp）
- **出自（確認済み）：** ユーザーが2026-10-25に提供した画像。ユーザーの指示は「正式な写真素材として使用。AIでの新規生成は不要」。
- **元ファイル：** 試遊画面のスクリーンショット（941×1672 PNG、SHA-256 `fd727f50ede3870ff4e5d51fddd765d4cc8b6d1b4e938fe6644dae89810e7037`）。リポジトリ・公開物には含めない。
- **加工（`scripts/build-photo.mjs`）：**
  - 台紙の内側の写真部分だけを、約 -2° の傾きを戻して切り出した。
  - 802×540、WebP、拡大・縮小なし。
  - メタデータなし（テストで確認）。
- **使用箇所：**
  - 北の机上の写真立て（縮小表示）と、「机上の古い写真」の拡大画面。
  - 書斎B（エンディング）の写真立ても同じ写真を使い、設計書どおり「もう1人」を自作の影（SVG）で右側に重ねている。
- **未確認（ユーザーの確認が必要）：**
  - 写っている人物と撮影場所の公開許諾。
  - 壁の掲示物などに、個人や施設を特定できる情報が写っていないか。
  - 画像の撮影者・権利者。

### 版画（東・南の壁の4枚）
- `scripts/build-assets.mjs` の `etchingSvg()` で、本プロジェクト内でSVGとして作図し、背景に合成した。
- 外部素材・生成画像は使っていない。

### SVG
| ファイル／部品 | 出自 |
|---|---|
| svg/paintings/painting_A〜D.svg、svg/cards/card_A〜D_back.svg、svg/clock_face.svg | 元素材 ⑬（phase13_final_assets）に含まれるSVGをそのまま配布。作成者・作成方法は⑬資料に明記なし（README に「光と影を数学的に固定」とある）。外部の著作物を含むかの記載はない |
| 本・カード表・扉の装置・時計の針・木箱・鍵・写真・ノブなど（src/components/art） | 本プロジェクトのコードで作図。本の図形は⑬の本SVGと同じ座標 |

- 配布用SVGに、作成ソフトの記録やコメントなどのメタデータはない（確認済み）。

## 3. フォント
| ファイル | 出自（確認済み） | 利用条件（確認済み） |
|---|---|---|
| fonts/NotoSerifJP-400.woff2・-700.woff2 | Noto Serif JP（npm パッケージ @expo-google-fonts/noto-serif-jp）から、使う文字だけを抜き出したもの（`scripts/build-fonts.mjs`） | SIL Open Font License 1.1。原文を `fonts/OFL.txt` として同梱。非商用・商用とも利用可 |

## 4. プログラム
- 配布物に含まれるライブラリは React・React DOM（MIT ライセンス）。
- 開発用の道具（Vite・Vitest・Playwright・sharp・subset-font など）は配布物に含まれない。

## 5. 利用条件（非商用公開）の確認状況
**公式の規約原文は未確認**です（suno.com・runway.com とそのヘルプは、作業環境から開けなかった）。以下はWeb検索で得た、公式ヘルプの引用と解説記事による情報。

| 素材 | 検索で得た情報 | 公開への支障 | 確認が必要なこと |
|---|---|---|---|
| Suno | 無料プランで作った曲は**非商用に限り利用可、Suno へのクレジット表記が必要**、権利は Suno に残る。有料プランで作った曲は商用利用も可。2025年11月以降、条件の改定あり | 非商用＋表記なら、無料プランでも支障はない見込み。**プラン未確認のため確定しない** | 3曲の制作時プラン、公式規約の最新版、study.mp3 の制作記録 |
| Runway | 公式ヘルプとして「作成物は利用者のもので、Runway 側の非商用制限はない」との引用あり。無料プランを別扱いにする公式記述は見つからなかった | 支障は見つかっていない | 制作時プラン、音声生成に固有の条件、公式規約の原文 |
| 生成画像 | 生成サービスが不明のため、調べられない | 判断できない | 生成サービス名とプラン |
| フォント | OFL 1.1（原文同梱） | なし | なし |

- **ゲーム内のクレジット表記：** 設定画面に「音楽（BGM）：Suno で生成／効果音・環境音：Runway で生成／フォント：Noto Serif JP（SIL Open Font License 1.1）」を表示している。

参照ページ（検索結果）：
- https://help.suno.com/en/categories/550145-rights-ownership
- https://help.suno.com/en/articles/2425729
- https://help.runwayml.com/hc/en-us/articles/21668707517587
- https://runway.com/terms-of-use

## 6. 未完成の部分（ゲーム画面には表示しない。ここで管理する）
| 場所 | 状態 |
|---|---|
| 南・閉じた扉 | 開扉画像の斜めの扉板を正面に変形して作成。木目・縁取りが引き伸ばされ、ぼやけている。**同じ画角の閉扉画像の新規生成が必要（未承認）** |
| 南・右手（西壁） | 机などを塗り替えた壁・腰板は無地に近く、写実の質感に差がある。右上の油絵（尖塔の街並み）は元画像のまま |
| 東・壁の版画 | 自作の簡素な線画で、周囲の写実画像と質感に差がある |
| 東・窓の外 | 合成した夜の庭。写実の背景と質感に差がある |
| 北・左端 | 西壁の北寄りに写る絵と飾り棚が、西面の画像には無い（壁の継ぎ目の不整合） |
| 西・右端 | 窓を塗り替えた壁。北面とのつながりは未調整 |
| 南・開いた扉 | 元画像の開扉（閉扉と同じ加工）。閉扉との木目の一致は扉板の変形による |
