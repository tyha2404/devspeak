import type { Metadata } from "next";
import { HomeClient } from "./HomeClient";

export const metadata: Metadata = { title: "Hôm nay · DevQuest English" };

export default function LearnPage() {
  return <HomeClient />;
}
