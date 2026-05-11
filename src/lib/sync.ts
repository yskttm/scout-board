import { analyzeBatch } from "./gemini";
import { createOAuth2Client, fetchNewMessages } from "./gmail";
import { prisma } from "./prisma";

export interface SyncResult {
  processed: number;
  saved: number;
  skipped: number;
}

export async function syncGmail(
  opts: { dryRun?: boolean; limit?: number; full?: boolean } = {},
): Promise<SyncResult> {
  const syncDays = parseInt(process.env.GMAIL_SYNC_DAYS ?? "30", 10);
  const syncLimit = opts.limit ?? parseInt(process.env.GMAIL_SYNC_LIMIT ?? "200", 10);
  const batchSize = parseInt(process.env.GMAIL_BATCH_SIZE ?? "5", 10);
  const dryRun = opts.dryRun ?? false;

  const auth = createOAuth2Client();

  // full=true の場合は historyId をリセットして全件取得
  if (opts.full && !dryRun) {
    await prisma.syncState.deleteMany({});
  }

  const syncState = await prisma.syncState.findUnique({ where: { id: 1 } });
  const historyId = syncState?.historyId ?? null;

  const { messages, newHistoryId } = await fetchNewMessages(auth, historyId, {
    syncDays,
    limit: syncLimit,
  });

  // DBに既に存在するメッセージを除外
  const existingIds = new Set(
    (
      await prisma.scoutEmail.findMany({
        where: { gmailMessageId: { in: messages.map((m) => m.id) } },
        select: { gmailMessageId: true },
      })
    ).map((r) => r.gmailMessageId),
  );

  const newMessages = messages.filter((m) => !existingIds.has(m.id));
  let saved = 0;

  // バッチ処理
  for (let i = 0; i < newMessages.length; i += batchSize) {
    const batch = newMessages.slice(i, i + batchSize);
    const results = await analyzeBatch(batch);

    if (dryRun) continue;

    for (const result of results) {
      if (!result.isScout) continue;

      const email = batch.find((m) => m.id === result.emailId);
      if (!email) continue;

      await prisma.scoutEmail.upsert({
        where: { gmailMessageId: email.id },
        create: {
          companyName: result.companyName,
          position: result.position,
          expectedSalary: result.expectedSalary,
          salaryClass: result.salaryClass,
          jobDescription: result.jobDescription,
          agentName: result.agentName,
          rawSubject: email.subject,
          gmailMessageId: email.id,
          gmailThreadId: email.threadId,
          receivedAt: email.internalDate,
        },
        update: {},
      });
      saved++;
    }
  }

  // historyId を更新
  if (!dryRun && newHistoryId) {
    await prisma.syncState.upsert({
      where: { id: 1 },
      create: { id: 1, historyId: newHistoryId },
      update: { historyId: newHistoryId },
    });
  }

  return {
    processed: newMessages.length,
    saved,
    skipped: messages.length - newMessages.length,
  };
}
