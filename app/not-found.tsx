import Link from 'next/link';
export default function NotFound() {
  return (<main className="px-5 py-8"><h1 className="text-lg font-semibold">Page not found</h1><p className="mt-2 text-muted">No screen exists at this address.</p><Link className="btn mt-3" href="/">Go to your home screen</Link></main>);
}
