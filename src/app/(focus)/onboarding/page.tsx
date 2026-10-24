import type { Metadata } from "next";
import { Onboarding } from "./Onboarding";

export const metadata: Metadata = { title: "Bắt đầu · DevQuest English" };

export default function OnboardingPage() {
  return <Onboarding />;
}
