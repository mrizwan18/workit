import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="text-lg font-medium text-white">Page not found</p>
      <Link href="/" className="mt-4 text-accent underline">
        Back to home
      </Link>
    </div>
  );
}
