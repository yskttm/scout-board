# Scout Board

転職スカウトメールを Gmail から自動取得・AI解析し、統一フォーマットで一元管理する個人用Webアプリ。
local実行のみ対応。

## Features

- **自動取得**: Gmail API で受信メールを15分ごとに自動同期
- **AI解析**: Gemini API がスカウトメールを判定し、企業名・ポジション・年収・業務内容・エージェント名を抽出
- **一覧表示**: テーブル形式で表示、各列でソート可能
- **テキスト検索**: 会社名・ポジション・年収・キーワードで絞り込み
- **希望一致バッジ**: 気になる求人に手動でフラグを立てられる
- **Gmail返信リンク**: 各行から直接Gmailのスレッドを開ける

## Tech Stack

| 項目 | 技術 |
|------|------|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | SQLite + Prisma ORM |
| AI | Google Gemini API (Google AI Studio) |
| Mail | Gmail API (Google OAuth2) |
| Package Manager | pnpm |

## Prerequisites

- Node.js 25.9.0+（`.node-version` 参照）
- pnpm 10+
- Google Cloud プロジェクト（Gmail API 有効化済み）
- Google AI Studio APIキー

## Setup

### 1. インストール

```bash
git clone https://github.com/yskttm/scout-board.git
cd scout-board
pnpm install
pnpm dlx prisma generate
pnpm dlx prisma migrate deploy
```

### 2. 環境変数

`.env.local.example` をコピーして `.env.local` を作成し、各値を設定する。

```bash
cp .env.local.example .env.local
```

| 変数 | 説明 |
|------|------|
| `GOOGLE_CLIENT_ID` | Google OAuth2 クライアントID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 クライアントシークレット |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/oauth2callback` |
| `GEMINI_API_KEY` | Google AI Studio APIキー |
| `DATABASE_URL` | `file:./prisma/dev.db` |
| `GMAIL_SYNC_DAYS` | 初回同期で遡る日数（デフォルト: 30） |
| `GMAIL_SYNC_LIMIT` | 1回の同期で取得する最大件数（デフォルト: 200） |
| `GMAIL_BATCH_SIZE` | Gemini APIへの1バッチ件数（デフォルト: 5） |
| `GMAIL_POLL_INTERVAL_MS` | 自動同期の間隔ms（デフォルト: 900000 = 15分） |
| `GEMINI_MODEL` | 使用するGeminiモデル（デフォルト: gemini-2.0-flash） |

### 3. Google Cloud 設定

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. Gmail API を有効化
3. OAuth 2.0 クライアントID を作成（ウェブアプリ、リダイレクト URI: `http://localhost:3000/oauth2callback`）
4. OAuth同意画面で自分のアカウントをテストユーザーに追加

### 4. Google AI Studio APIキー

[Google AI Studio](https://aistudio.google.com/apikey) でプロジェクトを作成してAPIキーを取得する。

### 5. Gmail OAuth認証（初回のみ）

```bash
pnpm auth:setup
```

ターミナルに表示されたURLをブラウザで開いてGoogleアカウントを認証する。`.secrets/gmail_token.json` が生成されれば完了。

### 6. 起動

```bash
pnpm dev
```

`http://localhost:3000` を開く。

## Usage

| 操作 | 説明 |
|------|------|
| 最新メールから更新 | 前回sync以降の新着メールを差分取得 |
| 全件リフレッシュ | 過去N日分を全件再取得（バックグラウンド実行） |
| 検索バー | 会社名・ポジション・年収・キーワードで絞り込み |
| カラムヘッダー | クリックでソート（再クリックで昇順/降順切り替え） |
| 希望一致バッジ | クリックでON/OFF切り替え |
| 返信する | Gmailのスレッドを新タブで開く |

## Development

```bash
pnpm test              # ユニットテスト
pnpm format            # Biome整形・lint修正
pnpm format:check      # Biomeチェック（修正なし）
pnpm db:studio         # Prisma Studio (DB GUI)
pnpm db:migrate        # DBマイグレーション
```
