import { SpinnerIcon } from "~/app/_components/icons/spinner-icon";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div>
        <div className="relative h-8 w-80 overflow-hidden rounded-full border border-foreground/25 bg-foreground/10 shadow-inner">
          <div className="absolute top-1/2 -translate-y-1/2 animate-ball-slide">
            <div className="animate-ball-spin">
              <SpinnerIcon className="h-6 w-6" spin={false} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
