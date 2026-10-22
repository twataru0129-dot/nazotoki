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
- 音声20ファイルは無変換でコピー。フォントは Noto Serif JP（SIL OFL 1.1、`public/assets/fonts/OFL.txt`）。

## 文書

- `docs/asset_audit.md` 素材監査（第0段階）
- `docs/implementation_plan.md` 段階計画
- `docs/phase1_report.md` 第1段階の報告
- `docs/phase2_report.md` 第2段階の報告（5つの謎・進行管理・オートセーブ）
