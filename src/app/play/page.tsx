import type { Metadata } from "next";
import GameClient from "./GameClient";

export const metadata: Metadata = {
  title: "Play · DevQuest English",
  robots: { index: false },
};

export default function PlayPage() {
  return <GameClient />;
}
