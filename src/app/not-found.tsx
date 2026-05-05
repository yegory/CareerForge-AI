import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f6f7f4] px-4 text-[#152023]">
      <section className="w-full max-w-md rounded-lg border border-[#d9d4c8] bg-white p-5">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#627174]">
          This page is not part of the workspace.
        </p>
        <Link
          href="/app"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-[#cfc7ba] px-3 text-sm font-medium"
        >
          <ArrowLeft className="size-4" />
          Back to workspace
        </Link>
      </section>
    </main>
  );
}
