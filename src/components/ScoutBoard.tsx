"use client";

import type { ScoutEmail } from "@prisma/client";
import { useState } from "react";
import ScoutTable from "./ScoutTable";
import SyncButton from "./SyncButton";

interface Props {
  scouts: ScoutEmail[];
  lastSyncedAt: Date | null;
}

export default function ScoutBoard({ scouts, lastSyncedAt }: Props) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? scouts.filter((s) => {
        const q = query.toLowerCase();
        return (
          s.companyName.toLowerCase().includes(q) ||
          s.position.toLowerCase().includes(q) ||
          (s.expectedSalary ?? "").toLowerCase().includes(q) ||
          s.jobDescription.toLowerCase().includes(q) ||
          s.agentName.toLowerCase().includes(q)
        );
      })
    : scouts;

  return (
    <div className="min-h-screen bg-white">
      {/* ヘッダー */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-semibold text-gray-800">求人スカウト一覧</h1>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {lastSyncedAt && (
              <span>
                最終更新:{" "}
                {new Date(lastSyncedAt).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <span>{scouts.length}件</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SyncButton />
        </div>
      </div>

      {/* 検索バー */}
      <div className="px-6 py-3 border-b border-gray-100">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="会社名・ポジション・年収・キーワードで絞り込み..."
          className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent"
        />
      </div>

      {/* テーブル */}
      <ScoutTable scouts={filtered} />
    </div>
  );
}
