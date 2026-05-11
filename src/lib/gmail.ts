import * as fs from "node:fs";
import * as path from "node:path";
import type { OAuth2Client } from "google-auth-library";
import { google } from "googleapis";

const TOKEN_PATH = path.resolve(process.cwd(), ".secrets/gmail_token.json");

export function createOAuth2Client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Gmail OAuth2の環境変数が設定されていません (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI)",
    );
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      `トークンファイルが見つかりません: ${TOKEN_PATH}\nnpm run auth:setup を実行してください`,
    );
  }

  const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
  oauth2Client.setCredentials(tokens);

  // リフレッシュトークンが更新されたら自動保存
  oauth2Client.on("tokens", (newTokens) => {
    const current = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
    const merged = { ...current, ...newTokens };
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(merged, null, 2));
  });

  return oauth2Client;
}

export interface RawEmail {
  id: string;
  threadId: string;
  subject: string;
  body: string;
  internalDate: Date;
}

export async function fetchNewMessages(
  auth: OAuth2Client,
  historyId: string | null,
  opts: { syncDays: number; limit: number },
): Promise<{ messages: RawEmail[]; newHistoryId: string | null }> {
  const gmail = google.gmail({ version: "v1", auth });

  const messageIds: Array<{ id: string; threadId: string }> = [];
  let newHistoryId: string | null = null;

  if (historyId) {
    // 差分取得
    try {
      const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId: historyId,
        historyTypes: ["messageAdded"],
      });
      newHistoryId = res.data.historyId ?? null;
      for (const record of res.data.history ?? []) {
        for (const added of record.messagesAdded ?? []) {
          if (added.message?.id && added.message?.threadId) {
            messageIds.push({ id: added.message.id, threadId: added.message.threadId });
          }
        }
      }
    } catch (err: unknown) {
      // historyId が古すぎる場合は初回取得にフォールバック
      if ((err as { code?: number }).code === 404) {
        historyId = null;
      } else {
        throw err;
      }
    }
  }

  if (!historyId) {
    // 初回取得（ページングで全件取得）
    const after = Math.floor((Date.now() - opts.syncDays * 86400 * 1000) / 1000);
    const profile = await gmail.users.getProfile({ userId: "me" });
    newHistoryId = profile.data.historyId ?? null;

    let pageToken: string | undefined;
    do {
      const listRes = (await gmail.users.messages.list({
        userId: "me",
        q: `after:${after} -in:spam -in:trash`,
        maxResults: 100,
        pageToken,
      })) as {
        data: {
          messages?: Array<{ id?: string | null; threadId?: string | null }>;
          nextPageToken?: string | null;
        };
      };
      const fetched = (listRes.data.messages ?? []).flatMap((m) =>
        m.id && m.threadId ? [{ id: m.id, threadId: m.threadId }] : [],
      );
      messageIds.push(...fetched);
      pageToken = listRes.data.nextPageToken ?? undefined;
    } while (pageToken && messageIds.length < opts.limit);
  }

  // 各メッセージの本文を取得
  const messages = await Promise.all(
    messageIds.slice(0, opts.limit).map(async ({ id, threadId }) => {
      const msg = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });
      const subject = extractHeader(msg.data.payload?.headers ?? [], "Subject");
      const body = extractBody(msg.data.payload);
      const internalDate = new Date(parseInt(msg.data.internalDate ?? "0", 10));
      return { id, threadId, subject, body: body.slice(0, 2000), internalDate };
    }),
  );

  return { messages, newHistoryId };
}

function extractHeader(
  headers: Array<{ name?: string | null; value?: string | null }>,
  name: string,
): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

function extractBody(
  payload:
    | {
        mimeType?: string | null;
        body?: { data?: string | null } | null;
        parts?: unknown[] | null;
      }
    | undefined
    | null,
): string {
  if (!payload) return "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  if (payload.parts) {
    for (const part of payload.parts as (typeof payload)[]) {
      const text = extractBody(part);
      if (text) return text;
    }
  }

  // HTML のみの場合はタグを除去
  if (payload.mimeType === "text/html" && payload.body?.data) {
    const html = Buffer.from(payload.body.data, "base64url").toString("utf-8");
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}
