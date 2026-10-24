import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamRunner } from "@/components/learn/ExamRunner";

export const metadata: Metadata = { title: "Bài kiểm tra · DevQuest English" };

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { kind, id } = await params;
  const { from } = await searchParams;
  const n = Number(id);
  if ((kind !== "test-out" && kind !== "checkpoint") || !Number.isInteger(n) || n <= 0) notFound();
  const backHref = from === "grammar" || from === "vocab" ? `/${from}` : "/career/path";
  return (
    <ExamRunner
      kind={kind}
      id={n}
      backHref={backHref}
      track={from === "grammar" || from === "vocab"}
    />
  );
}
