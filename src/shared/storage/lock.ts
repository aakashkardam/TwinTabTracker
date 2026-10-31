const LOCK_NAME = 'twintabtracker.storage';

type LockFn<T> = () => Promise<T>;

let fallbackChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: LockFn<T>): Promise<T> {
  const run = fallbackChain.then(fn, fn);
  fallbackChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function withStorageLock<T>(fn: LockFn<T>): Promise<T> {
  const locks = globalThis.navigator?.locks;
  if (locks && typeof locks.request === 'function') {
    return locks.request(LOCK_NAME, fn);
  }
  return enqueue(fn);
}
