import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth, signOut } from '@/auth';
import { prisma } from '@/lib/db';
import { ScreenHeader, Chip } from '@/components/screen-header';
import { ProfileForm, ChangePasswordForm } from '@/components/account-form';
import { relativeTime } from '@/lib/logs';

export default async function AccountPage() {
  const session = await auth();
  const uid = (session?.user as any)?.id as string | undefined;
  if (!uid) redirect('/sign-in?callbackUrl=/account');
  const me = await prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { tokens: true } }
    }
  });
  if (!me) redirect('/sign-in');

  const roleLabel = me.role.charAt(0).toUpperCase() + me.role.slice(1);

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <ScreenHeader
        title="Account"
        chips={<Chip tone="accent">{roleLabel}</Chip>}
      />

      <div className="flex-1 overflow-auto scrollbar bg-paper p-6">
        <div className="max-w-3xl space-y-6">
          <Card title="Profile" subtitle="Your display name and sign-in email.">
            <ProfileForm userId={me.id} initialName={me.name ?? ''} initialEmail={me.email} />
          </Card>

          <Card title="Password" subtitle="Change your sign-in password. You'll remain signed in on this device.">
            <ChangePasswordForm userId={me.id} />
          </Card>

          <Card title="Session" subtitle="Information about your current session.">
            <div className="grid grid-cols-2 gap-4 text-[12px]">
              <MetaRow label="User id" mono>{me.id}</MetaRow>
              <MetaRow label="Role">{roleLabel}</MetaRow>
              <MetaRow label="Joined">{relativeTime(me.createdAt)}</MetaRow>
              <MetaRow label="Last sign-in">{me.lastLoginAt ? relativeTime(me.lastLoginAt) : 'never'}</MetaRow>
              <MetaRow label="API tokens">{me._count.tokens}</MetaRow>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/tokens" className="px-3 py-1.5 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50">
                Manage API tokens
              </Link>
              <form
                action={async () => {
                  'use server';
                  await signOut({ redirectTo: '/sign-in' });
                }}
              >
                <button className="px-3 py-1.5 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50">
                  Sign out
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-5">
      <div className="mb-3">
        <div className="text-sm font-semibold">{title}</div>
        {subtitle && <div className="text-[11px] text-neutral-500 mt-0.5">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function MetaRow({ label, mono, children }: { label: string; mono?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className={mono ? 'mono text-[11px]' : 'text-[12px]'}>{children}</div>
    </div>
  );
}
