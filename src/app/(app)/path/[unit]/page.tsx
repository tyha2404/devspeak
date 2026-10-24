import type { Metadata } from "next";
import { UnitClient } from "./UnitClient";

export const metadata: Metadata = { title: "Unit · DevQuest English" };

export default async function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit } = await params;
  return <UnitClient slug={unit} />;
}
