import { getData } from './lib/data';
import PublicDashboard from './components/PublicDashboard';

export const revalidate = 0;
export default async function Home() {
  const data = await getData();

  return <PublicDashboard initialData={data} />;
}
