"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, LogIn, LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  AUTH_SESSION_CHANGED_EVENT,
  notifyAuthSessionChanged,
} from "@/lib/auth/auth-events";
import { isClientAuthEnabled } from "@/lib/auth/client-config";
import { cn } from "@/lib/utils";

type SessionState = {
  authEnabled: boolean;
  authenticated: boolean;
  user: { id: string; username: string } | null;
};

async function fetchSessionState(): Promise<SessionState | null> {
  const response = await fetch("/api/auth/session", { cache: "no-store" });
  if (!response.ok) return null;

  const payload = (await response.json()) as {
    success?: boolean;
    data?: SessionState;
  };
  if (payload.success && payload.data) {
    return payload.data;
  }
  return null;
}

function fallbackSession(): SessionState {
  return {
    authEnabled: isClientAuthEnabled(),
    authenticated: false,
    user: null,
  };
}

export function AuthNavActions({ onHero }: { onHero: boolean }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionState | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // Ignore a response that arrives after this component unmounted or re-ran.
    let ignore = false;

    function refreshSession() {
      fetchSessionState()
        .then((data) => {
          if (!ignore) setSession(data ?? fallbackSession());
        })
        .catch(() => {
          if (!ignore) setSession(fallbackSession());
        });
    }

    refreshSession();
    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
    return () => {
      ignore = true;
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, refreshSession);
    };
  }, []);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) return;

      setSession((prev) =>
        prev
          ? { ...prev, authenticated: false, user: null }
          : { ...fallbackSession(), authEnabled: true },
      );
      notifyAuthSessionChanged();
      router.replace("/");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }, [router]);

  const buttonClass = cn(
    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
    onHero
      ? "text-white/90 hover:bg-white/12 hover:text-white"
      : "text-muted-foreground hover:bg-emerald-500/10 hover:text-foreground",
  );

  if (session === null) {
    if (!isClientAuthEnabled()) return null;
    return (
      <Link href="/" className={buttonClass}>
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  if (!session.authEnabled) {
    return null;
  }

  if (!session.authenticated) {
    return (
      <Link href="/" className={buttonClass}>
        <LogIn className="size-3.5" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "hidden text-xs font-medium sm:inline",
          onHero ? "text-white/75" : "text-muted-foreground",
        )}
      >
        {session.user?.username}
      </span>
      <Link href="/api-keys" className={buttonClass} title="API keys">
        <KeyRound className="size-3.5" />
        <span className="hidden lg:inline">API keys</span>
      </Link>
      <button
        type="button"
        className={buttonClass}
        onClick={() => void signOut()}
        disabled={signingOut}
      >
        <LogOut className="size-3.5" />
        <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}
