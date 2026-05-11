"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState<"diff" | "full" | null>(null);
  const [result, setResult] = useState<{ processed: number; saved: number } | null>(null);

  async function handleSync(full: boolean) {
    setLoading(full ? "full" : "diff");
    setResult(null);
    try {
      const url = full ? "/api/gmail/sync?full=true" : "/api/gmail/sync";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (res.status === 202) {
        // バックグラウンド処理開始 → メッセージだけ表示
        setResult({ processed: -1, saved: -1 });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "同期に失敗しました");
      setResult({ processed: data.processed, saved: data.saved });
      router.refresh();
      await new Promise((r) => setTimeout(r, 500));
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "同期に失敗しました");
    } finally {
      setLoading(null);
    }
  }

  const isLoading = loading !== null;

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-sm text-gray-500">
          {result.processed === -1
            ? "バックグラウンドで取得中..."
            : `${result.processed}件処理 / ${result.saved}件保存`}
        </span>
      )}
      <button
        type="button"
        onClick={() => handleSync(false)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading === "diff" ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            同期中...
          </>
        ) : (
          "最新メールから更新"
        )}
      </button>
      <button
        type="button"
        onClick={() => handleSync(true)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading === "full" ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            全件取得中...
          </>
        ) : (
          "全件リフレッシュ"
        )}
      </button>
    </div>
  );
}
