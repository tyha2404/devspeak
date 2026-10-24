import type { Metadata } from "next";
import { PracticeClient } from "./PracticeClient";

export const metadata: Metadata = { title: "Tình huống · DevQuest English" };

export default function PracticePage() {
  return <PracticeClient />;
}
