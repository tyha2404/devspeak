import type { Metadata } from "next";
import { WordsClient } from "./WordsClient";

export const metadata: Metadata = { title: "Sổ tay · DevQuest English" };

export default function WordsPage() {
  return <WordsClient />;
}
