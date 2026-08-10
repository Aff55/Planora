import clsx from "clsx";
import Link from "next/link";

/**
 * Surfaces.
 *
 * The app is built from one repeating shape: a quiet uppercase label, then a
 * single rounded container whose rows are divided by hairlines. Never a card
 * inside a card. Per DESIGN.md §5, resting surfaces carry a border and no
 * shadow — shadow is reserved for things that float temporarily.
 */

export const surface = "border border-line bg-surface";

export function Section({
  title,
  action,
  description,
  children,
  className,
  headingLevel = 2
}: {
  title?: string;
  action?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={clsx("enter-route", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-end justify-between gap-4 px-1">
          {title && (
            <Heading className="text-micro font-bold uppercase text-muted">{title}</Heading>
          )}
          {action}
        </div>
      )}
      {description && <p className="mb-3 px-1 text-footnote text-muted">{description}</p>}
      {children}
    </section>
  );
}

/** Rounded container whose direct children become hairline-separated rows. */
export function Group({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("divide-hairline overflow-hidden rounded-lg", surface, className)}>{children}</div>;
}

/** A standalone panel, for content that is not a list of rows. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx("rounded-lg p-5", surface, className)}>{children}</div>;
}

type RowProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

export function Row({ children, className, href, onClick, ariaLabel }: RowProps) {
  const base = clsx("flex w-full items-center gap-4 px-5 py-4 text-left", className);

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel} className={clsx(base, "focus-ring row-hover")}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className={clsx(base, "focus-ring row-hover")}>
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}
