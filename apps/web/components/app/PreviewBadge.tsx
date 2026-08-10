import { FlaskConical } from "lucide-react";
import { PREVIEW_NOTICE } from "../../lib/features/flags";

/**
 * Marks a surface whose data does not come from the API.
 *
 * Deliberately loud and not dismissible. In a product whose argument is that
 * it never fabricates a record, a mock that reads as real data would be worse
 * than not shipping the surface at all.
 */
export function PreviewBadge({ children }: { children?: React.ReactNode }) {
  return (
    <div className="rounded-md border border-caution/40 bg-caution-wash px-4 py-3">
      <p className="flex items-center gap-2 text-callout font-semibold text-caution">
        <FlaskConical className="size-4 shrink-0" aria-hidden="true" />
        {PREVIEW_NOTICE}
      </p>
      {children && <p className="mt-1.5 text-footnote leading-relaxed text-caution">{children}</p>}
    </div>
  );
}
