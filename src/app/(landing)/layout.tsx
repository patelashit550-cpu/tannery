import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ minHeight: "100svh" }}>
      <Header />
      <main className="p3-landing-main w-full flex-1 flex flex-col">{children}</main>
    </div>
  );
}
