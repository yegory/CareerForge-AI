"use client";

import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 text-[#152023]">
          <section className="w-full max-w-md rounded-lg border border-[#d9d4c8] bg-white p-5">
            <h1 className="text-2xl font-semibold">Something went sideways</h1>
            <p className="mt-3 text-sm leading-6 text-[#627174]">
              The workspace hit an unexpected error. Retry the view, and check
              operations metrics if it keeps happening.
            </p>
            <Button
              className="mt-5 h-10 rounded-lg bg-[#153f4a] text-white hover:bg-[#1f5664]"
              onClick={() => reset()}
            >
              <RefreshCcw className="size-4" />
              Retry
            </Button>
          </section>
        </main>
      </body>
    </html>
  );
}
