'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';

type Role = 'admin' | 'editor' | 'viewer';

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  disabledAt: string | null;
};

export function NewUserButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900 flex items-center gap-1"
      >
        + Invite user
      </button>
      {open && <NewUserModal onClose={() => setOpen(false)} />}
    </>
  );
}

function NewUserModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('editor');
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  async function submit() {
    setErr(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || undefined, password, role })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === 'string' ? data.error : 'Failed to create user');
        setSubmitting(false);
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setErr('Network error');
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl border border-neutral-200 w-full max-w-md">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Admin</div>
            <div className="display text-base">Invite user</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>
        <div className="p-5 space-y-3 text-xs">
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              placeholder="name@acme.com"
              autoFocus
            />
          </Field>
          <Field label="Display name (optional)">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              placeholder="Alex Example"
            />
          </Field>
          <Field label="Initial password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent mono"
              placeholder="at least 6 characters"
            />
            <div className="text-[10px] text-neutral-500 mt-1">
              Share this with the user out-of-band. They can change it from their account page.
            </div>
          </Field>
          <Field label="Role">
            <div className="grid grid-cols-3 gap-1.5">
              {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`px-2 py-1.5 border rounded text-[11px] capitalize ${role === r ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">
              Admins can manage users and tokens. Editors can modify content. Viewers are read-only.
            </div>
          </Field>
          {err && <div className="text-[11px] text-danger">{err}</div>}
        </div>
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md hover:bg-neutral-50">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || !email || password.length < 6}
            className="px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function EditUserButton({ user, isSelf }: { user: UserRow; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-0.5 text-[11px] rounded text-accent hover:underline"
      >
        Edit
      </button>
      {open && <EditUserModal user={user} isSelf={isSelf} onClose={() => setOpen(false)} />}
    </>
  );
}

function EditUserModal({
  user,
  isSelf,
  onClose
}: {
  user: UserRow;
  isSelf: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState(user.name ?? '');
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<Role>(user.role);
  const [disabled, setDisabled] = useState(!!user.disabledAt);
  const [err, setErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwOk, setPwOk] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  async function save() {
    setErr(null);
    setSubmitting(true);
    const body: any = {};
    if (name !== (user.name ?? '')) body.name = name;
    if (email !== user.email) body.email = email;
    if (!isSelf && role !== user.role) body.role = role;
    if (!isSelf && disabled !== !!user.disabledAt) body.disabled = disabled;
    try {
      const res = await fetch(`/api/v1/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(typeof data.error === 'string' ? data.error : 'Failed to save');
        setSubmitting(false);
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setErr('Network error');
      setSubmitting(false);
    }
  }

  async function resetPassword() {
    setPwErr(null);
    setPwOk(false);
    setPwSubmitting(true);
    try {
      const res = await fetch(`/api/v1/users/${user.id}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setPwErr(typeof data.error === 'string' ? data.error : 'Failed to reset');
        setPwSubmitting(false);
        return;
      }
      setPwOk(true);
      setNewPassword('');
      setPwSubmitting(false);
    } catch {
      setPwErr('Network error');
      setPwSubmitting(false);
    }
  }

  async function remove() {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    const res = await fetch(`/api/v1/users/${user.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(typeof data.error === 'string' ? data.error : 'Failed to delete');
      return;
    }
    router.refresh();
    onClose();
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-md shadow-xl border border-neutral-200 w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">
              {isSelf ? 'Your profile' : 'Edit user'}
            </div>
            <div className="display text-base">{user.email}</div>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">✕</button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-5 text-xs">
          <div className="space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Profile</div>
            <Field label="Display name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent mono"
              />
            </Field>
            {!isSelf && (
              <Field label="Role">
                <div className="grid grid-cols-3 gap-1.5">
                  {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-2 py-1.5 border rounded text-[11px] capitalize ${role === r ? 'border-accent bg-accent-soft text-accent' : 'border-neutral-200 hover:bg-neutral-50'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            {!isSelf && (
              <label className="flex items-center gap-2 text-[11px]">
                <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
                <span>Disabled — user can't sign in and existing sessions stop working on next request.</span>
              </label>
            )}
            {err && <div className="text-[11px] text-danger">{err}</div>}
          </div>

          <div className="space-y-3 pt-4 border-t border-neutral-100">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Reset password</div>
            <Field label={isSelf ? 'New password (you must currently be signed in as this user)' : 'Set new password for this user'}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-md focus:outline-none focus:border-accent mono"
                placeholder="at least 6 characters"
              />
              <div className="text-[10px] text-neutral-500 mt-1">
                {isSelf
                  ? 'For self-service change, use the Account page which prompts for your current password.'
                  : 'Admin reset — no current password required. Share the new password out-of-band.'}
              </div>
            </Field>
            {pwErr && <div className="text-[11px] text-danger">{pwErr}</div>}
            {pwOk && <div className="text-[11px] text-ok">Password updated.</div>}
            <button
              onClick={resetPassword}
              disabled={pwSubmitting || newPassword.length < 6 || isSelf}
              className="px-3 py-1.5 text-xs rounded-md border border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
            >
              {pwSubmitting ? 'Saving…' : 'Reset password'}
            </button>
          </div>

          {!isSelf && (
            <div className="space-y-2 pt-4 border-t border-neutral-100">
              <div className="text-[10px] uppercase tracking-wider text-danger">Danger zone</div>
              <button
                onClick={remove}
                className="px-3 py-1.5 text-xs rounded-md border border-danger/30 text-danger hover:bg-danger/5"
              >
                Delete user
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs rounded-md hover:bg-neutral-50">
            Close
          </button>
          <button
            onClick={save}
            disabled={submitting}
            className="px-3 py-1.5 text-xs rounded-md bg-ink-950 text-paper hover:bg-ink-900 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
