import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppSidebar, AppMobileBar } from "@/components/app/app-sidebar";
import { SyncNudge } from "@/components/auth/sync-nudge";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · PM Dream Job" },
  robots: { index: false, follow: false },
};

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] bg-bg">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileBar />
        <div className="min-w-0 flex-1">
          <SyncNudge />
          {children}
        </div>
      </div>
    </div>
  );
}
