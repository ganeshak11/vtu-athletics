'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Stored in localStorage, so the banner shows once per browser until site data is cleared.
const STORAGE_KEY = 'vtu-aura-welcome-banner-dismissed';

export default function WelcomeBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== '1') setOpen(true);
    } catch {
      // Storage blocked (private mode etc.): skip the banner rather than show it on every visit.
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  function close() {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  // Portal to <body> so no ancestor stacking context (transforms/z-index on the landing page)
  // can paint over the overlay.
  return createPortal(
    <div
      className="welcome-banner-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Dr. ACS AURA 2026 announcement"
      onClick={close}
    >
      <div className="welcome-banner-frame" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="welcome-banner-close"
          aria-label="Close banner"
          onClick={close}
          autoFocus
        >
          ×
        </button>
        <img
          src="/banner.jpeg"
          alt="28th VTU Inter-Collegiate State Level Athletic Meet 2026 — Dr. ACS AURA 2026"
          className="welcome-banner-img"
          width={1200}
          height={628}
        />
      </div>
    </div>,
    document.body
  );
}
