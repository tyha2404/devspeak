import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { GoogleGenAI, type GenerateContentResponse, type InlinedRequest } from "@google/genai";
import type { BatchRequest, BatchResult, ChatResult, LlmClient } from "./llm";

/**
 * Google AI Studio (Gemini API) behind the same `LlmClient` surface. Prompts are still built in the
 * Anthropic shape (prompts.ts); this adapter translates system/messages/max_tokens/JSON-schema output
 * into a Gemini request and maps usage back so pricing and logging stay unchanged.
 */
const textOfBlocks = (c: string | Array<{ type: string; text?: string }>) =>
  typeof c === "string" ? c : c.map((b) => (b.type === "text" ? (b.text ?? "") : "")).join("");

function toGemini(p: Anthropic.MessageCreateParamsNonStreaming): InlinedRequest {
  const system = p.system === undefined ? undefined : textOfBlocks(p.system);
  const format = (p as { output_config?: { format?: { type?: string; schema?: unknown } } })
    .output_config?.format;
  return {
    model: p.model,
    contents: p.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: textOfBlocks(m.content as string | Array<{ type: string; text?: string }>) }],
    })),
    config: {
      ...(system ? { systemInstruction: system } : {}),
      maxOutputTokens: p.max_tokens,
      ...(format?.type === "json_schema"
        ? { responseMimeType: "application/json", responseJsonSchema: format.schema }
        : {}),
    },
  };
}

const usageOf = (r: GenerateContentResponse): Anthropic.Usage => {
  const u = r.usageMetadata ?? {};
  const cached = u.cachedContentTokenCount ?? 0;
  return {
    input_tokens: (u.promptTokenCount ?? 0) - cached,
    // Thinking tokens are billed as output.
    output_tokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
    cache_read_input_tokens: cached,
    cache_creation_input_tokens: 0,
  } as Anthropic.Usage;
};

const stopOf = (r: GenerateContentResponse) => {
  const reason = r.candidates?.[0]?.finishReason;
  if (reason === "MAX_TOKENS") return "max_tokens";
  return reason === "STOP" || reason === undefined ? "end_turn" : String(reason).toLowerCase();
};

const DONE = [
  "JOB_STATE_SUCCEEDED",
  "JOB_STATE_FAILED",
  "JOB_STATE_CANCELLED",
  "JOB_STATE_EXPIRED",
];

/** Free-tier "batches" run inline and live in memory until polled (same process only). */
const freeStore = ((
  globalThis as unknown as { __dqGeminiFree?: Map<string, BatchResult[]> }
).__dqGeminiFree ??= new Map<string, BatchResult[]>());

const FREE_PREFIX = "geminifree_";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GeminiLlm implements LlmClient {
  private readonly ai: GoogleGenAI;

  /**
   * `free`: the AI Studio free tier has no Batch API and a low requests-per-minute cap, so requests
   * are sent one by one, spaced to `rpm`, with a back-off on 429.
   */
  constructor(
    apiKey?: string,
    private readonly opts: { free?: boolean; rpm?: number } = {},
  ) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  private async freeBatch(requests: BatchRequest[]) {
    const gap = Math.ceil(60_000 / (this.opts.rpm ?? 8));
    const results: BatchResult[] = [];
    for (const [i, r] of requests.entries()) {
      if (i > 0) await sleep(gap);
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await this.message(r.params);
          results.push({ customId: r.customId, type: "succeeded", ...res });
          break;
        } catch (e) {
          const limited = /429|RESOURCE_EXHAUSTED/.test(String(e));
          if (limited && attempt < 3) {
            await sleep(30_000 * (attempt + 1));
            continue;
          }
          results.push({ customId: r.customId, type: "errored", error: String(e) });
          break;
        }
      }
    }
    const id = `${FREE_PREFIX}${crypto.randomUUID()}`;
    freeStore.set(id, results);
    return id;
  }

  async createBatch(requests: BatchRequest[]) {
    if (this.opts.free) return this.freeBatch(requests);
    const model = requests[0]?.params.model;
    if (!model || requests.some((r) => r.params.model !== model)) {
      throw new Error("Gemini batches need exactly one model per batch");
    }
    const job = await this.ai.batches.create({
      model,
      src: requests.map((r) => {
        const req = toGemini(r.params);
        delete req.model; // set once on the job
        return { ...req, metadata: { customId: r.customId } };
      }),
    });
    if (!job.name) throw new Error("Gemini batch created without a name");
    return job.name;
  }

  async batchStatus(id: string) {
    if (id.startsWith(FREE_PREFIX)) {
      const rs = freeStore.get(id) ?? [];
      const succeeded = rs.filter((r) => r.type === "succeeded").length;
      return { ended: true, succeeded, errored: rs.length - succeeded, expired: 0 };
    }
    const job = await this.ai.batches.get({ name: id });
    const ended = DONE.includes(String(job.state));
    let succeeded = 0;
    let errored = 0;
    for (const r of job.dest?.inlinedResponses ?? []) {
      if (r.error) errored++;
      else succeeded++;
    }
    return {
      ended,
      succeeded,
      errored,
      expired: String(job.state) === "JOB_STATE_EXPIRED" ? 1 : 0,
    };
  }

  async *batchResults(id: string): AsyncIterable<BatchResult> {
    if (id.startsWith(FREE_PREFIX)) {
      yield* freeStore.get(id) ?? [];
      freeStore.delete(id);
      return;
    }
    const job = await this.ai.batches.get({ name: id });
    for (const r of job.dest?.inlinedResponses ?? []) {
      const customId = r.metadata?.customId ?? "";
      if (r.error || !r.response) {
        yield { customId, type: "errored", error: r.error?.message ?? "no response" };
        continue;
      }
      yield {
        customId,
        type: "succeeded",
        text: r.response.text ?? "",
        stopReason: stopOf(r.response),
        usage: usageOf(r.response),
      };
    }
  }

  async message(params: Anthropic.MessageCreateParamsNonStreaming): Promise<ChatResult> {
    const req = toGemini(params);
    const res = await this.ai.models.generateContent({
      model: params.model,
      contents: req.contents!,
      config: req.config,
    });
    return {
      text: res.text ?? "",
      stopReason: stopOf(res),
      usage: usageOf(res),
      requestId: res.responseId ?? null,
    };
  }
}
