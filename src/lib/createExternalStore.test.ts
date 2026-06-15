import { describe, expect, it } from "vitest";
import { createExternalStore } from "./createExternalStore";

describe("createExternalStore", () => {
  it("returns the same snapshot reference until setSnapshot", () => {
    const store = createExternalStore({ count: 0 });
    const first = store.getSnapshot();
    const second = store.getSnapshot();

    expect(first).toBe(second);

    store.setSnapshot({ count: 1 }, { notify: false });

    expect(store.getSnapshot()).not.toBe(first);
    expect(store.getSnapshot().count).toBe(1);
  });

  it("notifies subscribers only when notify is true", () => {
    const store = createExternalStore({ count: 0 });
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });

    store.setSnapshot({ count: 1 }, { notify: false });
    expect(notifications).toBe(0);

    store.setSnapshot({ count: 2 });
    expect(notifications).toBe(1);
  });
});
