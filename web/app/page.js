import { getData } from './lib/data';
import PublicDashboard from './components/PublicDashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getData();

  return <PublicDashboard initialData={data} />;
}