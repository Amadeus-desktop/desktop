export function createSerializedAsyncQueue() {
  let tail = Promise.resolve();

  return function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = tail.catch(() => undefined).then(task);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}
