export default function Loading() {
  return (
    <div className="page-section" role="status">
      <span className="sr-only">Memuat halaman</span>
      <div
        className="h-40 rounded-2xl bg-muted motion-safe:animate-pulse"
        aria-hidden="true"
      />
    </div>
  );
}
