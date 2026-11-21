export default function Loading() {
  return (
    <div className="page-section" role="status">
      <span className="sr-only">Memuat halaman</span>
      <div
        className="mb-6 h-10 w-48 rounded-lg bg-muted motion-safe:animate-pulse"
        aria-hidden="true"
      />
      <div
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        aria-hidden="true"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="aspect-[3/4] rounded-xl bg-muted motion-safe:animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}
