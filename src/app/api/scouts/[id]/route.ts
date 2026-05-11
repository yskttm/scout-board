import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();

  if (typeof body.isMatch !== "boolean") {
    return NextResponse.json({ error: "isMatch は boolean が必要です" }, { status: 400 });
  }

  try {
    const updated = await prisma.scoutEmail.update({
      where: { id: parseInt(id, 10) },
      data: { isMatch: body.isMatch },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "レコードが見つかりません" }, { status: 404 });
  }
}
