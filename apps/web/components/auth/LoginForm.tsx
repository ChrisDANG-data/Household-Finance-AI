"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "register";

type AuthUser = { id: string; username: string };

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  showPassword,
  onToggleShow,
  isHero,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  showPassword: boolean;
  onToggleShow: () => void;
  isHero: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={cn(
          "mb-1.5 block text-sm font-medium",
          isHero ? "text-white/90" : "text-foreground",
        )}
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={showPassword ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-input bg-background py-2 pr-11 pl-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          required
          minLength={8}
          disabled={disabled}
        />
        <button
          type="button"
          className={cn(
            "absolute inset-y-0 right-0 z-10 flex w-10 items-center justify-center rounded-r-lg transition-colors",
            isHero
              ? "text-emerald-800/60 hover:bg-emerald-500/10 hover:text-emerald-900"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          onClick={onToggleShow}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          disabled={disabled}
        >
          {showPassword ? (
            <EyeOff className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          ) : (
            <Eye className="size-4 shrink-0" strokeWidth={2} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}

type LoginFormProps = {
  className?: string;
  /** Called after auth succeeds, before navigation. */
  onSuccess?: (user: AuthUser, mode: AuthMode) => void;
  defaultMode?: AuthMode;
  showRegister?: boolean;
  variant?: "hero" | "card";
};

export function LoginForm({
  className,
  onSuccess,
  defaultMode = "signin",
  showRegister = true,
  variant = "hero",
}: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function goHome() {
    router.replace("/");
    router.refresh();
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const endpoint = mode === "register" ? "/api/auth/register" : "/api/auth/login";
    const submittedUsername = username.trim();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: submittedUsername, password }),
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { user?: AuthUser };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success || !payload.data?.user) {
        setError(payload.error?.message ?? "Authentication failed");
        return;
      }

      const user = payload.data.user;
      notifyAuthSessionChanged();
      onSuccess?.(user, mode);

      if (mode === "register") {
        setSuccessMessage(
          `You have successfully signed up as ${user.username}.`,
        );
        window.setTimeout(() => {
          goHome();
        }, 1800);
        return;
      }

      goHome();
    } catch {
      setError("Unable to connect. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const isHero = variant === "hero";

  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      {showRegister ? (
        <div
          className={cn(
            "mb-4 flex rounded-full p-1",
            isHero
              ? "border border-white/20 bg-white/10 backdrop-blur-sm"
              : "border border-border bg-muted/40",
          )}
        >
          <button
            type="button"
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              mode === "signin"
                ? isHero
                  ? "bg-white text-emerald-800 shadow"
                  : "bg-background text-foreground shadow"
                : isHero
                  ? "text-white/85 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("signin");
              setConfirmPassword("");
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={loading || Boolean(successMessage)}
          >
            Sign in
          </button>
          <button
            type="button"
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              mode === "register"
                ? isHero
                  ? "bg-white text-emerald-800 shadow"
                  : "bg-background text-foreground shadow"
                : isHero
                  ? "text-white/85 hover:text-white"
                  : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => {
              setMode("register");
              setConfirmPassword("");
              setError(null);
              setSuccessMessage(null);
            }}
            disabled={loading || Boolean(successMessage)}
          >
            Create account
          </button>
        </div>
      ) : null}

      <form
        className={cn(
          "rounded-2xl p-6 text-left shadow-xl",
          isHero
            ? "border border-white/20 bg-white/10 backdrop-blur-md"
            : "border border-border/60 bg-card/80",
        )}
        onSubmit={onSubmit}
      >
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            isHero ? "text-white/70" : "text-muted-foreground",
          )}
        >
          {mode === "register" ? "New household account" : "Welcome back"}
        </p>
        <h2
          className={cn(
            "mt-1 text-xl font-semibold",
            isHero ? "text-white" : "text-foreground",
          )}
        >
          {mode === "register" ? "Create your account" : "Sign in to FinIntel"}
        </h2>

        <div className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="username"
              className={cn(
                "mb-1.5 block text-sm font-medium",
                isHero ? "text-white/90" : "text-foreground",
              )}
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              required
              disabled={Boolean(successMessage)}
            />
          </div>

          <PasswordInput
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((visible) => !visible)}
            isHero={isHero}
            disabled={Boolean(successMessage)}
          />

          {mode === "register" ? (
            <PasswordInput
              id="confirmPassword"
              label="Confirm password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((visible) => !visible)}
              isHero={isHero}
              disabled={Boolean(successMessage)}
            />
          ) : null}
        </div>

        {error ? (
          <p className={cn("mt-4 text-sm", isHero ? "text-red-200" : "text-destructive")} role="alert">
            {error}
          </p>
        ) : null}

        {successMessage ? (
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm font-medium",
              isHero
                ? "bg-white/15 text-emerald-100"
                : "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
            )}
            role="status"
          >
            {successMessage} Redirecting to home…
          </p>
        ) : null}

        <Button
          type="submit"
          className={cn(
            "mt-5 w-full",
            isHero && "bg-white text-emerald-800 hover:bg-white/90",
          )}
          disabled={loading || Boolean(successMessage)}
        >
          {loading
            ? "Please wait…"
            : successMessage
              ? "Success"
              : mode === "register"
                ? "Create account"
                : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
