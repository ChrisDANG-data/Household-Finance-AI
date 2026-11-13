"use client";

import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { notifyAuthSessionChanged } from "@/lib/auth/auth-events";
import { cn } from "@/lib/utils";

type AuthMode = "signin" | "register" | "reset";

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
  placeholder,
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
  placeholder?: string;
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
          placeholder={placeholder}
          className="w-full rounded-lg border border-input bg-background py-2 pr-11 pl-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
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

const ENDPOINTS: Record<AuthMode, string> = {
  signin: "/api/auth/login",
  register: "/api/auth/register",
  reset: "/api/auth/reset-password",
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
  const [recoveryInput, setRecoveryInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  /** Set after sign-up or password reset: the user must save the code before continuing. */
  const [issued, setIssued] = useState<{
    user: AuthUser;
    mode: AuthMode;
    recoveryCode: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  function goHome() {
    router.replace("/");
    router.refresh();
  }

  function switchMode(next: AuthMode) {
    setMode(next);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRecoveryInput("");
    setError(null);
  }

  function finish(user: AuthUser, finishedMode: AuthMode) {
    notifyAuthSessionChanged();
    onSuccess?.(user, finishedMode);
    goHome();
  }

  async function copyRecoveryCode() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    if (mode !== "signin" && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const submittedUsername = username.trim();
    const body =
      mode === "reset"
        ? {
            username: submittedUsername,
            recovery_code: recoveryInput,
            new_password: password,
          }
        : { username: submittedUsername, password };

    try {
      const response = await fetch(ENDPOINTS[mode], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "same-origin",
      });
      const payload = (await response.json()) as {
        success?: boolean;
        data?: { user?: AuthUser; recovery_code?: string };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success || !payload.data?.user) {
        setError(payload.error?.message ?? "Authentication failed");
        return;
      }

      const user = payload.data.user;
      const recoveryCode = payload.data.recovery_code;

      if (mode !== "signin" && recoveryCode) {
        // Hold the session-changed event until the user confirms they saved the code —
        // otherwise the page swaps this form away and the code is lost.
        setPassword("");
        setConfirmPassword("");
        setRecoveryInput("");
        setCopied(false);
        setIssued({ user, mode, recoveryCode });
        return;
      }

      finish(user, mode);
    } catch {
      setError("Unable to connect. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const isHero = variant === "hero";
  const cardClass = cn(
    "rounded-2xl p-6 text-left shadow-xl",
    isHero
      ? "border border-white/20 bg-white/10 backdrop-blur-md"
      : "border border-border/60 bg-card/80",
  );
  const eyebrowClass = cn(
    "text-xs font-semibold uppercase tracking-wider",
    isHero ? "text-white/70" : "text-muted-foreground",
  );
  const headingClass = cn(
    "mt-1 text-xl font-semibold",
    isHero ? "text-white" : "text-foreground",
  );
  const noteClass = cn(
    "text-sm",
    isHero ? "text-white/80" : "text-muted-foreground",
  );
  const linkClass = cn(
    "text-sm font-medium underline-offset-4 hover:underline",
    isHero ? "text-white" : "text-emerald-700 dark:text-emerald-300",
  );
  const primaryButtonClass = cn(
    "mt-5 w-full",
    isHero && "bg-white text-emerald-800 hover:bg-white/90",
  );
  const tabClass = (active: boolean) =>
    cn(
      "flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
      active
        ? isHero
          ? "bg-white text-emerald-800 shadow"
          : "bg-background text-foreground shadow"
        : isHero
          ? "text-white/85 hover:text-white"
          : "text-muted-foreground hover:text-foreground",
    );

  if (issued) {
    return (
      <div className={cn("mx-auto w-full max-w-md", className)}>
        <div className={cardClass} role="status">
          <p className={eyebrowClass}>
            {issued.mode === "register" ? "Account created" : "Password updated"}
          </p>
          <h2 className={headingClass}>Save your recovery code</h2>
          <p className={cn("mt-3", noteClass)}>
            {issued.mode === "register"
              ? `You are signed up as ${issued.user.username}.`
              : "Your old recovery code no longer works."}{" "}
            This code is the only way to reset a forgotten password, and it is
            shown only once. Passwords can’t be recovered, so save your
            password and this code somewhere safe.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="block flex-1 break-all rounded-lg bg-background px-3 py-2 text-center font-mono text-sm text-foreground">
              {issued.recoveryCode}
            </code>
            <Button
              type="button"
              variant="outline"
              onClick={() => void copyRecoveryCode()}
            >
              <Copy className="size-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <Button
            type="button"
            className={primaryButtonClass}
            onClick={() => finish(issued.user, issued.mode)}
          >
            I’ve saved it — continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-md", className)}>
      {showRegister && mode !== "reset" ? (
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
            className={tabClass(mode === "signin")}
            onClick={() => switchMode("signin")}
            disabled={loading}
          >
            Sign in
          </button>
          <button
            type="button"
            className={tabClass(mode === "register")}
            onClick={() => switchMode("register")}
            disabled={loading}
          >
            Create account
          </button>
        </div>
      ) : null}

      <form className={cardClass} onSubmit={onSubmit}>
        <p className={eyebrowClass}>
          {mode === "register"
            ? "New household account"
            : mode === "reset"
              ? "Forgot your password"
              : "Welcome back"}
        </p>
        <h2 className={headingClass}>
          {mode === "register"
            ? "Create your account"
            : mode === "reset"
              ? "Reset your password"
              : "Sign in to FinIntel"}
        </h2>

        {mode === "reset" ? (
          <p className={cn("mt-2", noteClass)}>
            Enter the recovery code you saved when you created your account.
          </p>
        ) : null}

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
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
              required
            />
          </div>

          {mode === "reset" ? (
            <div>
              <label
                htmlFor="recoveryCode"
                className={cn(
                  "mb-1.5 block text-sm font-medium",
                  isHero ? "text-white/90" : "text-foreground",
                )}
              >
                Recovery code
              </label>
              <input
                id="recoveryCode"
                name="recoveryCode"
                autoComplete="off"
                spellCheck={false}
                value={recoveryInput}
                onChange={(event) => setRecoveryInput(event.target.value)}
                placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
                required
              />
            </div>
          ) : null}

          <PasswordInput
            id="password"
            label={mode === "reset" ? "New password" : "Password"}
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            showPassword={showPassword}
            onToggleShow={() => setShowPassword((visible) => !visible)}
            isHero={isHero}
          />

          {mode !== "signin" ? (
            <PasswordInput
              id="confirmPassword"
              label={mode === "reset" ? "Confirm new password" : "Confirm password"}
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((visible) => !visible)}
              isHero={isHero}
            />
          ) : null}
        </div>

        {mode === "register" ? (
          <p className={cn("mt-4", noteClass)}>
            Passwords can’t be recovered, so save yours somewhere safe. After
            you sign up you’ll get a one-time recovery code — it is the only
            way to reset a forgotten password.
          </p>
        ) : null}

        {error ? (
          <p className={cn("mt-4 text-sm", isHero ? "text-red-200" : "text-destructive")} role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" className={primaryButtonClass} disabled={loading}>
          {loading
            ? "Please wait…"
            : mode === "register"
              ? "Create account"
              : mode === "reset"
                ? "Reset password"
                : "Sign in"}
        </Button>

        {mode === "signin" ? (
          <p className="mt-4 text-center">
            <button
              type="button"
              className={linkClass}
              onClick={() => switchMode("reset")}
              disabled={loading}
            >
              Forgot password?
            </button>
          </p>
        ) : null}

        {mode === "reset" ? (
          <p className="mt-4 text-center">
            <button
              type="button"
              className={linkClass}
              onClick={() => switchMode("signin")}
              disabled={loading}
            >
              Back to sign in
            </button>
          </p>
        ) : null}
      </form>
    </div>
  );
}
