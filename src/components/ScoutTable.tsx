"use client";

import type { ScoutEmail } from "@prisma/client";
import { useState } from "react";
import SalaryBadge from "./SalaryBadge";

type SortColumn = "receivedAt" | "companyName" | "expectedSalary" | "position" | "agentName";
type SortDir = "asc" | "desc";

interface Props {
  scouts: ScoutEmail[];
}

export default function ScoutTable({ scouts: initial }: Props) {
  const [scouts, setScouts] = useState(initial);
  const [sortCol, setSortCol] = useState<SortColumn>("receivedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(col: SortColumn) {
    if (col === sortCol) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const sorted = [...scouts].sort((a, b) => {
    let av: string | number | Date = a[sortCol] ?? "";
    let bv: string | number | Date = b[sortCol] ?? "";
    if (sortCol === "receivedAt") {
      av = new Date(av).getTime();
      bv = new Date(bv).getTime();
    }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  async function toggleMatch(id: number, current: boolean) {
    setScouts((prev) => prev.map((s) => (s.id === id ? { ...s, isMatch: !current } : s)));
    await fetch(`/api/scouts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMatch: !current }),
    });
  }

  const arrow = (col: SortColumn) => (sortCol === col ? (sortDir === "asc" ? " ▲" : " ▼") : "");

  const thClass =
    "px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className={thClass} onClick={() => handleSort("companyName")}>
              会社名{arrow("companyName")}
            </th>
            <th className={thClass} onClick={() => handleSort("expectedSalary")}>
              想定年収{arrow("expectedSalary")}
            </th>
            <th className={thClass} onClick={() => handleSort("position")}>
              ポジション{arrow("position")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              業務内容
            </th>
            <th className={thClass} onClick={() => handleSort("agentName")}>
              エージェント{arrow("agentName")}
            </th>
            <th className={thClass} onClick={() => handleSort("receivedAt")}>
              日付{arrow("receivedAt")}
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              返信
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900">{s.companyName}</span>
                  <button
                    type="button"
                    onClick={() => toggleMatch(s.id, s.isMatch)}
                    className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                      s.isMatch
                        ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                        : "bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    希望一致
                  </button>
                </div>
              </td>
              <td className="px-4 py-3 align-top">
                <SalaryBadge expectedSalary={s.expectedSalary} salaryClass={s.salaryClass} />
              </td>
              <td className="px-4 py-3 align-top max-w-xs">
                <span className="text-gray-800">{s.position}</span>
              </td>
              <td className="px-4 py-3 align-top max-w-sm">
                <p
                  className="text-gray-600 line-clamp-3 text-xs leading-relaxed"
                  title={s.jobDescription}
                >
                  {s.jobDescription}
                </p>
              </td>
              <td className="px-4 py-3 align-top text-gray-600 whitespace-nowrap">{s.agentName}</td>
              <td className="px-4 py-3 align-top text-gray-500 whitespace-nowrap text-xs">
                {new Date(s.receivedAt).toLocaleString("ja-JP", {
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
              <td className="px-4 py-3 align-top">
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      `https://mail.google.com/mail/u/0/#inbox/${s.gmailThreadId}`,
                      "_blank",
                    )
                  }
                  className="text-blue-600 hover:text-blue-800 text-xs whitespace-nowrap"
                >
                  返信する
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                スカウトメールがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
