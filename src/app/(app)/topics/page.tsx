import type { Metadata } from "next";
import { TopicsClient } from "./TopicsClient";

export const metadata: Metadata = { title: "Kiến thức · DevQuest English" };

export default function TopicsPage() {
  return <TopicsClient />;
}
