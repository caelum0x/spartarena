import { childLogger } from "../../lib/logger.js";

/**
 * Minimal in-process FIFO job queue.
 *
 * The plan calls for BullMQ + Redis; for the MVP we ship a dependency-free,
 * sequential in-memory queue so the API runs with only Postgres. It preserves
 * the queue *interface* (enqueue → async processing) so swapping in BullMQ later
 * is a drop-in change. Jobs are processed one at a time to keep nonce-sensitive
 * chain writes ordered. If `REDIS_URL` is set, a future implementation can route
 * here instead.
 */
const log = childLogger("execution.queue");

export type JobHandler<T, R> = (payload: T) => Promise<R>;

export class InMemoryQueue<T, R> {
  private readonly handler: JobHandler<T, R>;
  private chain: Promise<unknown> = Promise.resolve();

  public constructor(private readonly name: string, handler: JobHandler<T, R>) {
    this.handler = handler;
  }

  /**
   * Enqueue a job and await its result. Jobs run sequentially in submission
   * order; a failure in one job does not poison the queue for the next.
   */
  public enqueue(payload: T): Promise<R> {
    const run = this.chain.then(
      () => this.handler(payload),
      () => this.handler(payload),
    );
    // Keep the chain alive regardless of individual job outcome.
    this.chain = run.catch((err) => {
      log.error({ err, queue: this.name }, "Queued job failed");
    });
    return run;
  }
}
