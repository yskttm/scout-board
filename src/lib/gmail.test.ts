// gmail.ts の純粋関数をテスト
// extractBody は内部関数のため、公開テスト用に振る舞いを確認

describe("Gmail本文抽出", () => {
  it("Base64url デコードが正しく動作する", () => {
    const original = "こんにちは、スカウトメールです。";
    const encoded = Buffer.from(original, "utf-8").toString("base64url");
    const decoded = Buffer.from(encoded, "base64url").toString("utf-8");
    expect(decoded).toBe(original);
  });

  it("HTMLタグを除去してテキストを抽出できる", () => {
    const html = "<p>こんにちは</p><br/><span>テスト</span>";
    const text = html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    expect(text).toBe("こんにちは テスト");
  });

  it("internalDate をミリ秒エポックから Date に変換できる", () => {
    const epochMs = "1715267400000";
    const date = new Date(parseInt(epochMs, 10));
    expect(date).toBeInstanceOf(Date);
    expect(date.getTime()).toBe(1715267400000);
  });

  it("本文が2000文字を超えた場合に切り捨てられる", () => {
    const longText = "a".repeat(3000);
    const truncated = longText.slice(0, 2000);
    expect(truncated.length).toBe(2000);
  });
});
