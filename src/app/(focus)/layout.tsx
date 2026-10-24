import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Toasts } from "@/components/app/Toasts";

export const metadata: Metadata = { robots: { index: false } };

/** Distraction-free screens (lessons, exams, onboarding): no navigation chrome. */
export default function FocusLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toasts />
    </>
  );
}
