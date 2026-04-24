'use client';

// Whitelisted runtime closure exposed to compiled component blocks.
// The compiler rewrites `import { ... } from 'react'` into `const { ... } = RT;`
// so anything component code references must live here.
//
// Anything *not* in this object is unreachable from within a block.
// Expand carefully — each addition widens the surface area for mistakes.

import * as React from 'react';
import { useState, useEffect, useRef, useId, useMemo, useCallback, useLayoutEffect, useReducer, Fragment } from 'react';

// Minimal scheme helper — maps a scheme name to Tailwind-ish classes.
// Expand as more schemes are authored.
export function getSchemeClasses(scheme?: string): { background: string; text: string } {
  switch (scheme) {
    case 'dark':
      return { background: 'bg-ink-950 text-paper', text: 'text-paper' };
    case 'accent':
      return { background: 'bg-accent-soft', text: 'text-accent' };
    case 'paper':
      return { background: 'bg-paper', text: 'text-ink-950' };
    case 'default':
    default:
      return { background: 'bg-white', text: 'text-ink-950' };
  }
}

type MediaLike = { url?: string; src?: string; alt?: string; width?: number; height?: number } | string | null | undefined;

// Minimal ImageMedia — accepts either a string URL or a `{ url, alt }` object.
// Mirrors the shape of the Payload CMS component the sample code was originally written against.
export function ImageMedia({
  resource,
  className,
  imgClassName,
  fill,
  alt,
}: {
  resource?: MediaLike;
  className?: string;
  imgClassName?: string;
  fill?: boolean;
  alt?: string;
}) {
  const src = typeof resource === 'string'
    ? resource
    : resource?.url ?? resource?.src ?? '';
  const a = alt ?? (typeof resource === 'object' && resource ? resource.alt : '') ?? '';
  if (!src) {
    return <div className={className} style={fill ? { position: 'absolute', inset: 0, background: '#e5e5e5' } : undefined} />;
  }
  return (
    <div className={className} style={fill ? { position: 'absolute', inset: 0 } : undefined}>
      <img
        src={src}
        alt={a}
        className={imgClassName}
        style={fill ? { width: '100%', height: '100%', objectFit: 'cover' } : undefined}
      />
    </div>
  );
}

export const BLOCK_RUNTIME = Object.freeze({
  React,
  useState,
  useEffect,
  useRef,
  useId,
  useMemo,
  useCallback,
  useLayoutEffect,
  useReducer,
  Fragment,
  getSchemeClasses,
  ImageMedia,
});

export type BlockRuntime = typeof BLOCK_RUNTIME;
