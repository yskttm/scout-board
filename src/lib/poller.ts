import { syncGmail } from "./sync";

export function startPolling(): void {
  const intervalMs = parseInt(process.env.GMAIL_POLL_INTERVAL_MS ?? "900000", 10);

  console.log(`[poller] 定期同期を開始します（間隔: ${intervalMs / 1000}秒）`);

  setInterval(async () => {
    console.log("[poller] Gmail同期を実行中...");
    try {
      const result = await syncGmail();
      console.log(
        `[poller] 同期完了: 処理=${result.processed}件, 保存=${result.saved}件, スキップ=${result.skipped}件`,
      );
    } catch (err) {
      console.error("[poller] 同期エラー:", err);
    }
  }, intervalMs);
}
