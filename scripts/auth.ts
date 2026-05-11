import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import * as url from "node:url";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const TOKEN_PATH = path.resolve(__dirname, "../.secrets/gmail_token.json");
const SECRETS_DIR = path.dirname(TOKEN_PATH);

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`環境変数 ${key} が設定されていません`);
  return value;
}

async function main() {
  // .env.local を手動で読み込む
  const envPath = path.resolve(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        process.env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, "");
      }
    }
  }

  const clientId = getEnv("GOOGLE_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_CLIENT_SECRET");
  const redirectUri = getEnv("GOOGLE_REDIRECT_URI");

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });

  console.log("\n以下のURLをブラウザで開いてGoogleアカウントを認証してください:\n");
  console.log(authUrl);
  console.log("\n認証後、このスクリプトが自動的にトークンを保存します...\n");

  const code = await waitForCode(redirectUri);
  const { tokens } = await oauth2Client.getToken(code);

  if (!fs.existsSync(SECRETS_DIR)) {
    fs.mkdirSync(SECRETS_DIR, { recursive: true });
  }

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
  console.log(`\nトークンを保存しました: ${TOKEN_PATH}`);
  console.log("これで npm run dev でアプリを起動できます。");
  process.exit(0);
}

function waitForCode(redirectUri: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(redirectUri);
    const port = parseInt(parsed.port || "3000", 10);

    const server = http.createServer((req, res) => {
      if (!req.url) return;
      const query = new url.URL(req.url, redirectUri).searchParams;
      const code = query.get("code");
      const error = query.get("error");

      if (error) {
        res.end("認証がキャンセルされました。");
        server.close();
        reject(new Error(`認証エラー: ${error}`));
        return;
      }

      if (code) {
        res.end("認証が完了しました。このタブを閉じてください。");
        server.close();
        resolve(code);
      }
    });

    server.listen(port, () => {
      console.log(`localhost:${port} でコールバックを待機中...`);
    });

    server.on("error", reject);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
