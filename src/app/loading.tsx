export default function Loading() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-foreground/10" />
        <div className="h-32 rounded bg-foreground/10" />
        <div className="h-32 rounded bg-foreground/10" />
      </div>
    </main>
  );
}
