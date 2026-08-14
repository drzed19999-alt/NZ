import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getCurrentAdmin } from '@/lib/auth';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/login');

  return (
    <div className="max-w-[1400px] mx-auto p-4 flex gap-4">
      <Sidebar admin={admin} />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
