import { Nav } from "~/app/_components/nav";
import { BeerStakes } from "~/app/_components/beer-stakes";

export default function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1f0a] to-[#0d1117] text-white">
      <Nav />
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-2 text-3xl font-bold">Betting Rules</h1>
        <p className="mb-8 text-white/60">
          How the beer betting system works.
        </p>
        <BeerStakes />
      </main>
    </div>
  );
}
