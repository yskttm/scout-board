import { GoogleGenAI, type ToolUnion, Type } from "@google/genai";
import type { RawEmail } from "./gmail";

export type SalaryClass = "normal" | "high" | "very_high" | "unknown";

export interface ScoutResult {
  emailId: string;
  isScout: true;
  companyName: string;
  position: string;
  expectedSalary: string | null;
  salaryClass: SalaryClass;
  jobDescription: string;
  agentName: string;
}

export interface SkipResult {
  emailId: string;
  isScout: false;
  reason: string;
}

export type AnalysisResult = ScoutResult | SkipResult;

const SYSTEM_PROMPT = `あなたは転職スカウトメール解析システムです。
与えられた複数のメールを読み、各メールについて以下を判断してください。

【スカウトメールの判定基準】
- 転職エージェントまたは企業から直接送られた求人紹介・スカウトメール
- 特定のポジションへの応募を促す内容

【スカウトメールではないもの】
- メールマガジン・一般情報メール
- 応募状況の確認・返信
- システム通知・広告

【年収クラスの判定基準（下限年収を基準に）】
- normal: 600万円未満
- high: 600万円以上900万円未満
- very_high: 900万円以上
- unknown: 年収記載なし

各メールについて、必ずrecord_scout_emailまたはskip_non_scoutのどちらかのツールを呼び出してください。`;

const tools: ToolUnion[] = [
  {
    functionDeclarations: [
      {
        name: "record_scout_email",
        description: "スカウトメールと判定した場合に抽出した情報を記録する",
        parameters: {
          type: Type.OBJECT,
          properties: {
            email_id: { type: Type.STRING, description: "対象メールのID" },
            companyName: { type: Type.STRING, description: '企業名（"非公開"も可）' },
            position: { type: Type.STRING, description: "ポジション・職種名" },
            expectedSalary: {
              type: Type.STRING,
              description: '年収の文字列（例: "900万〜1200万"）。記載なければ省略',
            },
            salaryClass: {
              type: Type.STRING,
              description: "normal / high / very_high / unknown のいずれか（下限年収を基準に判定）",
            },
            jobDescription: { type: Type.STRING, description: "業務内容の要約（200字以内）" },
            agentName: {
              type: Type.STRING,
              description: '"担当者名/会社名" 形式。担当者不明なら会社名のみ',
            },
          },
          required: [
            "email_id",
            "companyName",
            "position",
            "salaryClass",
            "jobDescription",
            "agentName",
          ],
        },
      },
      {
        name: "skip_non_scout",
        description: "転職スカウトメールではないと判定した場合に呼び出す",
        parameters: {
          type: Type.OBJECT,
          properties: {
            email_id: { type: Type.STRING, description: "対象メールのID" },
            reason: { type: Type.STRING, description: "スカウトメールではない理由" },
          },
          required: ["email_id", "reason"],
        } as ToolUnion,
      },
    ],
  },
] as ToolUnion[];

function createClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("環境変数 GEMINI_API_KEY が設定されていません");
  return new GoogleGenAI({ apiKey });
}

export async function analyzeBatch(emails: RawEmail[]): Promise<AnalysisResult[]> {
  if (emails.length === 0) return [];

  const userContent = emails
    .map((e, i) => `--- メール${i + 1} (ID: ${e.id}) ---\n件名: ${e.subject}\n本文:\n${e.body}`)
    .join("\n\n");

  const ai = createClient();
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? "gemini-2.0-flash",
    contents: userContent,
    config: {
      systemInstruction: SYSTEM_PROMPT,
      tools,
    },
  });

  const results: AnalysisResult[] = [];
  const parts = response.candidates?.[0]?.content?.parts ?? [];

  for (const part of parts) {
    if (!part.functionCall) continue;
    const { name, args } = part.functionCall;

    if (name === "record_scout_email") {
      const a = args as {
        email_id: string;
        companyName: string;
        position: string;
        expectedSalary?: string;
        salaryClass: SalaryClass;
        jobDescription: string;
        agentName: string;
      };
      results.push({
        emailId: a.email_id,
        isScout: true,
        companyName: a.companyName,
        position: a.position,
        expectedSalary: a.expectedSalary ?? null,
        salaryClass: a.salaryClass,
        jobDescription: a.jobDescription,
        agentName: a.agentName,
      });
    } else if (name === "skip_non_scout") {
      const a = args as { email_id: string; reason: string };
      results.push({ emailId: a.email_id, isScout: false, reason: a.reason });
    }
  }

  return results;
}
