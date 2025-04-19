import { MobileLayout } from "@/components/mobile-layout";
import { SessionDetail } from "@/components/session-detail";

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Explicitly await params to get id
  const p = await Promise.resolve(params);
  const id = await Promise.resolve(p.id);

  return (
    <MobileLayout>
      <SessionDetail id={id} />
    </MobileLayout>
  );
}
