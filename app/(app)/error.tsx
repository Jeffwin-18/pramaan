'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="max-w-[640px]">
      <h1 className="text-lg font-semibold">Could not load this screen</h1>
      <p className="mt-2 text-muted">The data service did not respond. Nothing was changed.</p>
      <button className="btn btn-primary mt-3" onClick={reset}>Retry</button>
    </div>
  );
}
