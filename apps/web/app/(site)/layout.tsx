import { SiteFooter, SiteHeader } from "../../components/site/SiteChrome";

/**
 * The public site. Indexable, and every page below is a Server Component —
 * the only client boundary is the header, which needs the theme toggle and an
 * auth-aware call to action.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link focus-ring">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}
