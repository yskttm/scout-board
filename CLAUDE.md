# Scout Board - Development Guide

## Project Overview

転職スカウトメールを Gmail から自動取得・AI解析し、統一フォーマットで管理する個人用Webアプリ。

## Architecture

- **Framework**: Next.js 15 (App Router, TypeScript)
- **DB**: SQLite + Prisma ORM (LibSQL adapter)
- **AI**: Google Gemini API (`@google/genai`) via Google AI Studio
- **Mail**: Gmail API (OAuth2, readonly scope)
- **Package Manager**: pnpm

## Key Files

| File | Role |
|------|------|
| `src/lib/gemini.ts` | Gemini API によるバッチメール解析 (function calling) |
| `src/lib/gmail.ts` | Gmail API 操作・差分取得 |
| `src/lib/sync.ts` | 同期ロジック本体（APIルートとpollerの共通処理） |
| `src/lib/poller.ts` | 定期ポーリング（instrumentation.ts から起動） |
| `src/lib/prisma.ts` | Prismaクライアントシングルトン |
| `src/instrumentation.ts` | Next.jsサーバー起動時にポーリング開始 |

## Data Flow

```
Gmail受信 → (15分ごと自動 or ボタン手動)
  → Gmail API で差分取得
  → Gemini API にバッチ送信（5件/リクエスト）
  → スカウト判定 + 情報抽出（function calling）
  → SQLite に保存
  → ブラウザに表示
```

## Sync Modes

- **差分更新** (`POST /api/gmail/sync`): 前回sync以降の新着メールのみ取得
- **全件リフレッシュ** (`POST /api/gmail/sync?full=true`): SyncStateをリセットして過去`GMAIL_SYNC_DAYS`日分を再取得。バックグラウンド実行（202即返し）

## Environment Variables

`.env.local.example` を参照。

## Commands

```bash
pnpm dev              # 開発サーバー起動
pnpm test             # ユニットテスト
pnpm format           # Biome整形・lint修正
pnpm format:check     # Biomeチェック（修正なし）
pnpm db:migrate       # DBマイグレーション
pnpm db:studio        # Prisma Studio (DB GUI)
pnpm auth:setup       # Gmail OAuth認証（初回のみ）
```

## Gmail OAuth Setup

初回のみ `pnpm auth:setup` を実行。ブラウザでGoogleアカウントを認証すると `.secrets/gmail_token.json` が生成される。以降は自動でトークンが更新される。

## Notes

- `.secrets/` は `.gitignore` 対象（OAuthトークンが含まれるため）
- Gemini API は Google AI Studio の無料枠（RPD: 20）を使用
- `gemini-2.5-flash-preview-05-20` を使用（`GEMINI_MODEL` 環境変数で変更可能）
