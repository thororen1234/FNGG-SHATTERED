import { getSession } from '../lib/auth';
import { getData } from '../lib/data';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export const revalidate = 0;
export default async function AdminPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const data = await getData();

  return <AdminClient initialData={data} />;
}
