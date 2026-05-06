import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offline — LokalWeb',
  description: 'You are currently offline.',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center text-3xl" aria-hidden="true">
          📡
        </div>
        <h1 className="text-2xl font-bold">Ti je offline</h1>
        <p className="text-muted-foreground">
          Nuk kemi mundur të lidhemi me serverin. Kontrollo lidhjen e internetit dhe provo përsëri.
        </p>
        <p className="text-xs text-muted-foreground/70">
          You appear to be offline. Check your internet connection and try again.
        </p>
      </div>
    </div>
  );
}
