import type { Metadata } from "next";
import { TrackClient } from "../_track/TrackClient";

export const metadata: Metadata = {
  title: "Lộ trình từ vựng · DevSpeak",
  robots: { index: false },
};

export default function Page() {
  return <TrackClient track="vocab" />;
}
