import type { RawEmail } from "./gmail";

const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  Type: {
    OBJECT: "OBJECT",
    STRING: "STRING",
  },
}));

process.env.GEMINI_API_KEY = "test-api-key";

import { analyzeBatch } from "./gemini";

function makeEmail(overrides: Partial<RawEmail> = {}): RawEmail {
  return {
    id: "msg1",
    threadId: "thread1",
    subject: "テストメール",
    body: "テスト本文",
    internalDate: new Date(),
    ...overrides,
  };
}

describe("analyzeBatch", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
  });

  it("空配列を渡すと空配列を返す", async () => {
    const result = await analyzeBatch([]);
    expect(result).toEqual([]);
  });

  it("record_scout_email ツール呼び出しをパースできる", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "record_scout_email",
                  args: {
                    email_id: "msg1",
                    companyName: "株式会社テスト",
                    position: "エンジニア",
                    expectedSalary: "800万〜1200万",
                    salaryClass: "very_high",
                    jobDescription: "テスト業務内容",
                    agentName: "山田太郎/テストエージェント",
                  },
                },
              },
            ],
          },
        },
      ],
    });

    const result = await analyzeBatch([makeEmail()]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      emailId: "msg1",
      isScout: true,
      companyName: "株式会社テスト",
      salaryClass: "very_high",
    });
  });

  it("skip_non_scout ツール呼び出しをパースできる", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "skip_non_scout",
                  args: { email_id: "msg2", reason: "メールマガジンのため" },
                },
              },
            ],
          },
        },
      ],
    });

    const result = await analyzeBatch([makeEmail({ id: "msg2" })]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ emailId: "msg2", isScout: false });
  });

  it("複数件まとめて処理できる", async () => {
    mockGenerateContent.mockResolvedValue({
      candidates: [
        {
          content: {
            parts: [
              {
                functionCall: {
                  name: "record_scout_email",
                  args: {
                    email_id: "msg1",
                    companyName: "A社",
                    position: "PM",
                    salaryClass: "high",
                    jobDescription: "業務内容A",
                    agentName: "エージェントA",
                  },
                },
              },
              {
                functionCall: {
                  name: "skip_non_scout",
                  args: { email_id: "msg2", reason: "広告メール" },
                },
              },
            ],
          },
        },
      ],
    });

    const result = await analyzeBatch([makeEmail({ id: "msg1" }), makeEmail({ id: "msg2" })]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ emailId: "msg1", isScout: true });
    expect(result[1]).toMatchObject({ emailId: "msg2", isScout: false });
  });
});
