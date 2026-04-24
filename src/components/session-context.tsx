'use client';
import { createContext, useContext } from 'react';

type SessionCtx = { initials: string; email: string };

const Ctx = createContext<SessionCtx>({ initials: '', email: '' });

export function SessionProvider({ value, children }: { value: SessionCtx; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSessionChip() {
  return useContext(Ctx);
}
