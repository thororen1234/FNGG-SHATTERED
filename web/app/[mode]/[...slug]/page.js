import { getEventData } from '@/app/lib/data';
import PublicDashboard from '@/app/components/PublicDashboard';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function EventPage({ params }) {
  const { mode, slug } = await params;

  let chapter = undefined;
  let season = undefined;

  if (slug && slug.length >= 1) chapter = slug[0];
  if (slug && slug.length >= 2) season = slug[1];

  const data = await getEventData(mode, chapter, season);

  if (!data) {
    notFound();
  }

  return (
    <PublicDashboard
      initialData={data}
      eventMode={mode}
      eventChapter={chapter}
      eventSeason={season}
      eventName={data.name || `${mode} ${chapter ? chapter : ''} ${season ? season : ''}`.trim()}
    />
  );
}
