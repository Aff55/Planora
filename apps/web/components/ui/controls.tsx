"use client";

import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { useId } from "react";

/**
 * Controls.
 *
 * Every interactive target is at least 44px tall. Colour choices follow
 * DESIGN.md §2 — in particular the primary fill is `accent-strong`, not
 * `accent`, because white on `accent` measures 3.56:1 and fails AA.
 */

const buttonBase =
  "focus-ring inline-flex min-h-touch items-center justify-center gap-2 rounded-md px-5 text-callout font-semibold " +
  "transition duration-state ease-enter active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

const buttonVariants = {
  primary: "bg-accent-strong text-white hover:bg-accent-hover",
  secondary: "border border-line bg-surface text-ink hover:bg-sunken",
  ghost: "text-muted hover:bg-sunken hover:text-ink",
  danger: "bg-critical text-white hover:opacity-90"
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  children,
  type = "button",
  onClick,
  disabled,
  variant = "primary",
  className,
  title,
  ariaLabel
}: {
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  className?: string;
  title?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      className={clsx(buttonBase, buttonVariants[variant], className)}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  variant = "secondary",
  className
}: {
  icon: LucideIcon;
  /** Required: an icon alone is never self-describing. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "secondary" | "ghost";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={clsx(
        "focus-ring grid size-touch shrink-0 place-items-center rounded-md text-muted",
        "transition duration-state ease-enter active:scale-95 disabled:cursor-not-allowed disabled:opacity-50",
        variant === "secondary" ? "border border-line bg-surface hover:bg-sunken hover:text-ink" : "hover:bg-sunken hover:text-ink",
        className
      )}
    >
      <Icon className="size-[1.125rem]" aria-hidden="true" />
    </button>
  );
}

export const inputClass =
  "min-h-touch w-full rounded-md border border-line bg-surface px-3.5 text-body text-ink outline-none " +
  "transition duration-state placeholder:text-muted focus:border-accent-strong";

export const textareaClass =
  "min-h-28 w-full resize-y rounded-md border border-line bg-surface px-3.5 py-3 text-body text-ink outline-none " +
  "transition duration-state placeholder:text-muted focus:border-accent-strong";

/**
 * A labelled field. `error` is wired to `aria-describedby` and `aria-invalid`
 * so a server-side validation message is announced, not just coloured — this
 * is how field-level detail from a 400 reaches the user.
 */
export function Field({
  label,
  children,
  hint,
  error,
  htmlFor
}: {
  label: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => React.ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
}) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-callout font-semibold text-ink">
        {label}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error && (
        <p id={errorId} className="mt-2 text-footnote font-medium text-critical">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="mt-2 text-footnote text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  icon: Icon,
  disabled
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  return (
    <div className={clsx("flex items-start justify-between gap-4 px-5 py-4", disabled && "opacity-55")}>
      <span className="flex min-w-0 items-start gap-3.5">
        {Icon && <Icon className="mt-0.5 size-5 shrink-0 text-accent-text" aria-hidden="true" />}
        <span className="min-w-0">
          <span className="block text-callout font-medium text-ink">{label}</span>
          {description && <span className="mt-1 block text-footnote text-muted">{description}</span>}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          "focus-ring relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors duration-state",
          checked ? "bg-accent-strong" : "bg-sunken border border-line",
          disabled && "cursor-not-allowed"
        )}
      >
        <span
          className={clsx(
            "absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-state ease-enter",
            checked ? "translate-x-6" : "translate-x-1",
            !checked && "bg-muted"
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={clsx("no-scrollbar flex gap-1 overflow-x-auto rounded-md border border-line bg-sunken p-1", className)}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              "focus-ring min-h-[2.25rem] shrink-0 rounded-sm px-4 text-footnote font-semibold transition duration-state",
              active ? "bg-surface text-ink" : "text-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A native select styled to match, kept native for platform accessibility. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  id,
  describedBy,
  invalid,
  includeEmpty,
  className
}: {
  value: T | "";
  onChange: (next: string) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  id?: string;
  describedBy?: string;
  invalid?: boolean;
  includeEmpty?: string;
  className?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      onChange={(event) => onChange(event.target.value)}
      className={clsx(inputClass, className)}
    >
      {includeEmpty !== undefined && <option value="">{includeEmpty}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
