import { Card } from "@/components/feedback";
import { ReaderSettingsFields } from "@/components/reader/reader-settings";

export const metadata = { title: "Setelan" };

export default function Page() {
  return (
    <section className="page-section">
      <h1 className="mb-5 text-3xl font-bold tracking-tight">Setelan</h1>
      <div className="grid gap-4">
        <Card>
          <h2 className="mb-1 text-xl font-bold">Reader</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Berlaku untuk semua chapter dan tersimpan di perangkat ini. Setelan
            yang sama bisa diubah saat membaca.
          </p>
          <ReaderSettingsFields />
        </Card>
        <Card>
          <h2 className="mb-1 text-xl font-bold">Tema</h2>
          <p className="text-sm text-muted-foreground">
            Ganti tema gelap atau terang lewat tombol di pojok kanan atas.
          </p>
        </Card>
      </div>
    </section>
  );
}
