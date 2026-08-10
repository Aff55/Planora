"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { loginSchema, registerSchema } from "@planora/shared";
import { Logo } from "../brand/Logo";
import { Button, Field, Segmented, inputClass } from "../ui/controls";
import { Group } from "../ui/surfaces";
import { Banner, SkeletonPage } from "../ui/feedback";
import { ApiError, apiRequest, toMessage } from "../../lib/api";
import { useSession } from "../../lib/session";
import type { CurrentUser } from "../../lib/types";
import { Onboarding } from "./Onboarding";

/**
 * Sign in and register.
 *
 * Validation runs against the shared schemas before the request goes out, so
 * the rules cannot drift from the server's. Anything the client lets through
 * and the server rejects comes back as field-level detail and is shown against
 * the field it belongs to.
 */
type Mode = "login" | "register";

export function AuthScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, adopt } = useSession();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [onboardingFor, setOnboardingFor] = useState<string | null>(null);

  const next = params.get("next");
  const destination = next && next.startsWith("/app") ? next : "/app";

  // Someone who is already signed in has no business on this screen.
  useEffect(() => {
    if (status === "authenticated" && !onboardingFor) router.replace(destination);
  }, [status, destination, router, onboardingFor]);

  if (status === "unknown") return <SkeletonPage metrics={0} rows={3} />;

  function validate(): boolean {
    const issues: Record<string, string> = {};
    if (mode === "register") {
      const parsed = registerSchema.safeParse({
        name,
        email,
        password,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        rememberMe
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) issues[String(issue.path[0] ?? "")] = issue.message;
      }
    } else {
      const parsed = loginSchema.safeParse({ email, password, rememberMe });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) issues[String(issue.path[0] ?? "")] = issue.message;
      }
    }
    setFieldErrors(issues);
    return Object.keys(issues).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const payload =
        mode === "register"
          ? { name, email, password, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", rememberMe }
          : { email, password, rememberMe };

      const data = await apiRequest<{ token: string; user: CurrentUser }>(
        mode === "register" ? "/auth/register" : "/auth/login",
        { method: "POST", body: payload }
      );

      adopt(data.user);

      if (mode === "register") {
        setOnboardingFor(data.user.name);
        return;
      }
      router.replace(destination);
    } catch (cause) {
      if (cause instanceof ApiError && cause.details.length > 0) {
        const issues: Record<string, string> = {};
        for (const issue of cause.details) issues[issue.path] = issue.message;
        setFieldErrors(issues);
      }
      setFormError(toMessage(cause));
    } finally {
      setSubmitting(false);
    }
  }

  if (onboardingFor !== null) {
    return <Onboarding name={onboardingFor} onDone={() => router.replace("/app")} />;
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-sm flex-col justify-center py-6">
      <div className="mb-8 text-center">
        <Link href="/" className="focus-ring inline-block rounded-md" aria-label="Planora home">
          <Logo variant="mark" size="lg" className="mx-auto mb-5 w-fit" />
        </Link>
        <h1 className="text-title-1">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
        <p className="mx-auto mt-2 max-w-xs text-callout text-muted">
          Your records live in the database on this machine and are scoped to your account.
        </p>
      </div>

      <Segmented
        label="Sign in or register"
        className="mb-5"
        value={mode}
        onChange={(value) => {
          setMode(value);
          setFormError(null);
          setFieldErrors({});
        }}
        options={[
          { value: "login", label: "Sign in" },
          { value: "register", label: "Register" }
        ]}
      />

      <Group>
        <form onSubmit={submit} className="space-y-5 p-5" noValidate>
          {mode === "register" && (
            <Field label="Name" error={fieldErrors.name}>
              {({ id, describedBy, invalid }) => (
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  required
                />
              )}
            </Field>
          )}

          <Field label="Email" error={fieldErrors.email}>
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                className={inputClass}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            )}
          </Field>

          <Field
            label="Password"
            error={fieldErrors.password}
            hint={mode === "register" ? "At least 8 characters." : undefined}
          >
            {({ id, describedBy, invalid }) => (
              <div className="relative">
                <input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                  className={`${inputClass} pr-12`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="focus-ring absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:text-ink"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            )}
          </Field>

          <label className="flex min-h-touch cursor-pointer items-center gap-3 text-callout text-muted">
            <input
              type="checkbox"
              className="size-4 accent-[color:var(--accent-strong)]"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            Keep me signed in on this device
          </label>

          {formError && <Banner tone="error">{formError}</Banner>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {submitting ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
          </Button>

          {process.env.NODE_ENV !== "production" && mode === "login" && (
            <button
              type="button"
              onClick={() => {
                setEmail("demo@planora.local");
                setPassword("Planora123!");
              }}
              className="focus-ring w-full rounded py-1 text-footnote font-medium text-accent-text"
            >
              Fill the local demo account
            </button>
          )}
        </form>
      </Group>

      <p className="mt-6 text-center text-footnote text-muted">
        <Link href="/" className="focus-ring rounded underline underline-offset-2">
          Back to the site
        </Link>
      </p>
    </div>
  );
}
