import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * The small surface the app needs from Claude. Production uses the Anthropic SDK; tests and
 * key-less local dev use `FakeLlm` (set `LLM_FAKE=1`), which keeps batches in memory.
 */
export interface BatchRequest {
  customId: string;
  params: Anthropic.MessageCreateParamsNonStreaming;
}

export interface BatchResult {
  customId: string;
  type: "succeeded" | "errored" | "expired" | "canceled";
  text?: string;
  stopReason?: string | null;
  usage?: Anthropic.Usage;
  error?: string;
}

export interface ChatResult {
  text: string;
  stopReason: string | null;
  usage: Anthropic.Usage;
  requestId: string | null;
}

export interface LlmClient {
  createBatch(requests: BatchRequest[]): Promise<string>;
  batchStatus(
    id: string,
  ): Promise<{ ended: boolean; succeeded: number; errored: number; expired: number }>;
  batchResults(id: string): AsyncIterable<BatchResult>;
  message(params: Anthropic.MessageCreateParamsNonStreaming): Promise<ChatResult>;
}

const textOf = (content: Anthropic.ContentBlock[]) =>
  content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

export class AnthropicLlm implements LlmClient {
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey, timeout: 30_000, maxRetries: 1 });
  }

  async createBatch(requests: BatchRequest[]) {
    const batch = await this.client.messages.batches.create({
      requests: requests.map((r) => ({ custom_id: r.customId, params: r.params })),
    });
    return batch.id;
  }

  async batchStatus(id: string) {
    const b = await this.client.messages.batches.retrieve(id);
    return {
      ended: b.processing_status === "ended",
      succeeded: b.request_counts.succeeded,
      errored: b.request_counts.errored,
      expired: b.request_counts.expired,
    };
  }

  async *batchResults(id: string): AsyncIterable<BatchResult> {
    // Results arrive in any order: callers key by customId.
    for await (const r of await this.client.messages.batches.results(id)) {
      if (r.result.type === "succeeded") {
        const m = r.result.message;
        yield {
          customId: r.custom_id,
          type: "succeeded",
          text: textOf(m.content),
          stopReason: m.stop_reason,
          usage: m.usage,
        };
      } else if (r.result.type === "errored") {
        yield { customId: r.custom_id, type: "errored", error: r.result.error.error.type };
      } else {
        yield { customId: r.custom_id, type: r.result.type };
      }
    }
  }

  async message(params: Anthropic.MessageCreateParamsNonStreaming): Promise<ChatResult> {
    const { data, request_id } = await this.client.messages.create(params).withResponse();
    return {
      text: textOf(data.content),
      stopReason: data.stop_reason,
      usage: data.usage,
      requestId: request_id ?? null,
    };
  }
}

type FakeHandler = (
  params: Anthropic.MessageCreateParamsNonStreaming,
  customId?: string,
) => unknown;

const fakeStore = ((
  globalThis as unknown as { __dqFakeBatches?: Map<string, BatchRequest[]> }
).__dqFakeBatches ??= new Map());

const fakeUsage = (): Anthropic.Usage =>
  ({
    input_tokens: 1200,
    output_tokens: 600,
    cache_read_input_tokens: 2400,
    cache_creation_input_tokens: 0,
  }) as Anthropic.Usage;

/** Deterministic in-memory stand-in. `handler` returns the JSON object the model would produce. */
export class FakeLlm implements LlmClient {
  constructor(private readonly handler: FakeHandler) {}

  async createBatch(requests: BatchRequest[]) {
    const id = `fakebatch_${crypto.randomUUID()}`;
    fakeStore.set(id, requests);
    return id;
  }

  async batchStatus(id: string) {
    const reqs = fakeStore.get(id) ?? [];
    return { ended: true, succeeded: reqs.length, errored: 0, expired: 0 };
  }

  async *batchResults(id: string): AsyncIterable<BatchResult> {
    const reqs = [...(fakeStore.get(id) ?? [])].reverse(); // out of order on purpose
    for (const r of reqs) {
      try {
        const out = this.handler(r.params, r.customId);
        yield {
          customId: r.customId,
          type: "succeeded",
          text: typeof out === "string" ? out : JSON.stringify(out),
          stopReason: "end_turn",
          usage: fakeUsage(),
        };
      } catch (e) {
        yield { customId: r.customId, type: "errored", error: String(e) };
      }
    }
  }

  async message(params: Anthropic.MessageCreateParamsNonStreaming): Promise<ChatResult> {
    const out = this.handler(params);
    return {
      text: typeof out === "string" ? out : JSON.stringify(out),
      stopReason: "end_turn",
      usage: fakeUsage(),
      requestId: null,
    };
  }
}
