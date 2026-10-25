# 午前0時17分の書斎（第1章）

スマホ縦持ちを主とした一人用Web脱出ミステリー。React + TypeScript + Vite。GitHub Pages の `/nazotoki/` 配下で配信する想定。

## 開発

```sh
npm install
npm run dev          # http://localhost:5173/nazotoki/
npm run build        # フォントのサブセット生成 → 型検査 → dist/
npm test             # Vitest（ロジック・配置・音声20件・フォント）
npm run test:e2e     # Playwright（ビルド済み dist を vite preview で検証）
```

## 素材

- 元素材（設計書・画像・音声のZIP）はリポジトリに含めない。別管理のバックアップを使う。
- `npm run assets -- <元素材フォルダ>` で `public/assets/` を再生成する（`docs/source_checksums.txt` で照合）。
  背景の加工内容と画質は `docs/asset_build_report.md` に出力される。
- 音声20ファイルは再エンコードせず、タグ（作成者名・生成IDなどのメタデータ）だけを外して配置。元ファイルは元素材側で保持。
- フォントは Noto Serif JP（SIL OFL 1.1、`public/assets/fonts/OFL.txt`）。
- 机上の古い写真（ユーザー提供）は `node scripts/build-photo.mjs <提供画像>` で `public/assets/photo/old_photo.webp` を作る。
- 素材の出自・利用条件・未完成の部分は `ASSET_PROVENANCE.md`。

## 公開（GitHub Pages）

- `.github/workflows/deploy-pages.yml`：`main` に変更が入ったとき（または Actions 画面から手動）にビルドして公開。
  事前に Settings > Pages > Source を「GitHub Actions」に設定する。公開URL：https://twataru0129-dot.github.io/nazotoki/
  ※ 2026-10-23 時点でリポジトリは非公開、Pages は未設定。非公開リポジトリで Pages を使うには GitHub の有料プランが必要（無料プランでは公開リポジトリのみ）。
- `.github/workflows/ci.yml`：プルリクエストと作業ブランチで型検査・単体テスト・ビルド・E2E を実行（公開はしない）。

## 文書

- `docs/asset_audit.md` 素材監査（第0段階）
- `docs/implementation_plan.md` 段階計画
- `docs/phase1_report.md` 第1段階の報告
- `docs/phase2_report.md` 第2段階の報告（5つの謎・進行管理・オートセーブ）
- `docs/phase3_report.md` 第3段階の報告（任意調査・イベント・探索サポート・時間・セーブ・手帳）
- `docs/phase4_report.md` 第4段階の報告（背景・音声20種・アニメーション・扉の演出）
- `docs/phase5_report.md` 第5段階の報告（エンディング・クリア画面・クリア後）
- `docs/phase6_report.md` 第6段階の報告（総合テスト・最終修正・公開準備）
- `docs/qa_checklist_final.md` ⑮QA受入チェックリストの最終照合
- `ASSET_PROVENANCE.md` 素材の出自・利用条件・未完成の部分
- `docs/iphone_check.md` iPhone での公開前確認
- `docs/playtest_fix1.md` 試遊後の修正（1）机のタップ領域・引き出しの横並び・ヒント機能の廃止
