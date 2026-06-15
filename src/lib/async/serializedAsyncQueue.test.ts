import { describe, expect, it } from "vitest";
import { createSerializedAsyncQueue } from "./serializedAsyncQueue";

describe("createSerializedAsyncQueue", () => {
  it("runs async tasks one at a time in request order", async () => {
    const enqueue = createSerializedAsyncQueue();
    const events: string[] = [];

    const first = enqueue(async () => {
      events.push("first:start");
      await Promise.resolve();
      events.push("first:end");
      return "first";
    });
    const second = enqueue(async () => {
      events.push("second:start");
      events.push("second:end");
      return "second";
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["first", "second"]);
    expect(events).toEqual(["first:start", "first:end", "second:start", "second:end"]);
  });

  it("continues processing after a task rejects", async () => {
    const enqueue = createSerializedAsyncQueue();
    const events: string[] = [];

    const first = enqueue(async () => {
      events.push("first");
      throw new Error("boom");
    });
    const second = enqueue(async () => {
      events.push("second");
      return "ok";
    });

    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe("ok");
    expect(events).toEqual(["first", "second"]);
  });
});
