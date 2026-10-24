import type { Metadata } from "next";
import { PathClient } from "./PathClient";

export const metadata: Metadata = { title: "Lộ trình · DevQuest English" };

export default function PathPage() {
  return <PathClient />;
}
