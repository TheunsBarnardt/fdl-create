'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileForm({
  userId,
  initialName,
  initialEmail
}: {
  userId: string;
  initialName: string;
  initialEmail: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function save() {
    setErr(null);
    setOk(false);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || undefined,
          email: email !== initialEmail ? email : undefined
        })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === 'string' ? data.error : 'Failed to save');
        setSubmitting(false);
        return;
      }
      setOk(true);
      router.refresh();
      setSubmitting(false);
    } catch {
      setErr('Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Display name">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm"
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm mono"
        />
      </Field>
      {err && <div className="text-[11px] text-danger">{err}</div>}
      {ok && <div className="text-[11px] text-ok">Saved.</div>}
      <button
        onClick={save}
        disabled={submitting}
        className="px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Save profile'}
      </button>
    </div>
  );
}

export function ChangePasswordForm({ userId }: { userId: string }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setErr(null);
    setOk(false);
    if (next !== confirm) {
      setErr("New password and confirmation don't match");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === 'string' ? data.error : 'Failed to change password');
        setSubmitting(false);
        return;
      }
      setOk(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setSubmitting(false);
    } catch {
      setErr('Network error');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Field label="Current password">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm mono"
        />
      </Field>
      <Field label="New password">
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm mono"
          placeholder="at least 6 characters"
        />
      </Field>
      <Field label="Confirm new password">
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent text-sm mono"
        />
      </Field>
      {err && <div className="text-[11px] text-danger">{err}</div>}
      {ok && <div className="text-[11px] text-ok">Password updated.</div>}
      <button
        onClick={submit}
        disabled={submitting || !current || next.length < 6 || next !== confirm}
        className="px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900 disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'Change password'}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[10px] uppercase tracking-wider text-neutral-500 mb-1">{label}</div>
      {children}
    </label>
  );
}
