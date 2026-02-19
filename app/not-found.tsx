import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 rounded-full bg-velora-gradient" />
        <h1 className="mt-5 text-4xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-foreground/70">The page you are looking for does not exist.</p>
        <Link href="/" className="mt-5 inline-flex h-11 items-center rounded-2xl bg-velora-gradient px-5 text-sm font-semibold text-white">Back home</Link>
      </div>
    </main>
  );
}
