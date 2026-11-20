import type { ReactNode } from "react";

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-7">
      {children}
    </div>
  );
}

export function Placeholder({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="page-section">
      <h1 className="mb-5 text-4xl font-bold tracking-tight">{title}</h1>
      <Card>
        <p className="text-muted-foreground">{message}</p>
      </Card>
    </section>
  );
}
