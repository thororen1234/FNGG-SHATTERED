import { getSession } from '../lib/auth';
import { getData } from '../lib/data';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const data = await getData();

  return <AdminClient key={JSON.stringify(data.settings)} initialData={data} />;
}