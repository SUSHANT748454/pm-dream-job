export default function JobsLoading() {
  return (
    <div className="container-page py-10">
      <div className="h-8 w-72 animate-pulse rounded bg-[var(--bg-card)]" />
      <div className="mt-6 h-14 w-full animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-card)]" />
      <div className="mt-8 grid gap-10 lg:grid-cols-[16rem_1fr]">
        <div className="hidden lg:block">
          <div className="h-[28rem] animate-pulse rounded-[var(--radius)] bg-[var(--bg-card)]" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-card)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
