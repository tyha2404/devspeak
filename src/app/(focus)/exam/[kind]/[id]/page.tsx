import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/learn/ExamRunner";

export const metadata: Metadata = { title: "Bài kiểm tra · DevQuest English" };

export default async function ExamPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  const n = Number(id);
  if ((kind !== "test-out" && kind !== "checkpoint") || !Number.isInteger(n) || n <= 0) notFound();
  return <ExamRunner kind={kind} id={n} />;
}
