import ScoutBoard from "@/components/ScoutBoard";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [scouts, syncState] = await Promise.all([
    prisma.scoutEmail.findMany({ orderBy: { receivedAt: "desc" } }),
    prisma.syncState.findUnique({ where: { id: 1 } }),
  ]);

  return <ScoutBoard scouts={scouts} lastSyncedAt={syncState?.updatedAt ?? null} />;
}
