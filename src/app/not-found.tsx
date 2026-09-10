import Link from "next/link";

import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <div className="container-page flex min-h-[60vh] flex-1 flex-col items-center justify-center text-center py-20">
      <p className="font-display text-6xl text-gold-soft">404</p>
      <h1 className="mt-4 font-display text-2xl text-text">
        This page has moved on
      </h1>
      <p className="mt-2 max-w-sm text-sm text-text-muted">
        The role may have been filled or the link is out of date. The board is
        still full of open roles.
      </p>
        <Button asChild className="mt-6">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
      <SiteFooter />
    </>
  );
}
