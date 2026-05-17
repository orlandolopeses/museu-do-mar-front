import SiteHeader from "./SiteHeader";
import Hero from "./sections/Hero";
import HowItWorks from "./sections/HowItWorks";
import EntryPaths from "./sections/EntryPaths";
import MangueRoster from "./sections/MangueRoster";
import AgendaHighlights from "./sections/AgendaHighlights";
import SiteFooter from "./SiteFooter";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-amber-50 text-slate-900">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <Hero />
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HowItWorks className="lg:col-span-1" />
          <EntryPaths className="lg:col-span-2" />
        </section>
        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <MangueRoster className="lg:col-span-2" />
          <AgendaHighlights className="lg:col-span-1" />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
