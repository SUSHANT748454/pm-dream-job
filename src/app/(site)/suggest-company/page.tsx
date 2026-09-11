import type { Metadata } from "next";

import { SuggestCompanyForm } from "@/components/suggest-company-form";
import { TrackView } from "@/components/analytics/track-view";

export const metadata: Metadata = {
  title: "Suggest a company",
  description:
    "Tell us which company to add to PM Dream Job — the board is fed from a curated list of public job boards.",
  alternates: { canonical: "/suggest-company" },
};

export default function SuggestCompanyPage() {
  return (
    <div className="container-page py-10">
      <TrackView
        event={{ name: "page_viewed", props: { path: "/suggest-company" } }}
      />
      <header className="max-w-xl">
        <h1 className="font-display text-3xl tracking-tight text-text">
          Suggest a company
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Help grow the board — point us at a company whose careers page or
          job board (Greenhouse, Lever, Ashby) lists Product roles in India.
        </p>
      </header>
      <div className="mt-8 max-w-xl">
        <SuggestCompanyForm />
      </div>
    </div>
  );
}
