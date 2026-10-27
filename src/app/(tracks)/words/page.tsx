import type { Metadata } from "next";
import { WordsClient } from "./WordsClient";

export const metadata: Metadata = { title: "Sổ tay · DevSpeak" };

export default function WordsPage() {
  return <WordsClient />;
}
