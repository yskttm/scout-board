import { type NextRequest, NextResponse } from "next/server";
import { syncGmail } from "@/lib/sync";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "true";
  const full = searchParams.get("full") === "true";
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : undefined;

  // 全件リフレッシュはバックグラウンドで実行してすぐ202を返す
  if (full) {
    syncGmail({ full: true, dryRun, limit }).catch((err) =>
      console.error("[sync] full sync error:", err),
    );
    return NextResponse.json(
      { message: "バックグラウンドで全件取得を開始しました" },
      { status: 202 },
    );
  }

  try {
    const result = await syncGmail({ dryRun, limit });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "不明なエラー";
    const status = message.includes("トークンファイルが見つかりません") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
