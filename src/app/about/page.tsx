import { z } from "zod";
import { Card } from "@/components/feedback";
import { pepperCarrotLicense } from "@/lib/peppercarrot-paths";

export const metadata = { title: "Tentang dan kredit" };

const link = "font-semibold text-primary underline";

export default function Page() {
  const contact = z.email().safeParse(process.env.CONTACT_EMAIL).data;
  return (
    <section className="page-section">
      <h1 className="mb-5 text-4xl font-bold tracking-tight">
        Tentang ComicHub
      </h1>
      <div className="grid gap-4">
        <Card>
          <p className="max-w-prose text-muted-foreground">
            ComicHub adalah proyek pribadi nonkomersial untuk membaca komik
            berbahasa Indonesia. ComicHub tidak menayangkan iklan, tidak menjual
            akses, dan tidak menyimpan salinan komik. Semua katalog dan gambar
            dimuat langsung dari sumbernya.
          </p>
        </Card>
        <Card>
          <h2 className="mb-3 text-2xl font-bold">Kredit sumber</h2>
          <ul className="grid max-w-prose gap-3 text-muted-foreground">
            <li>
              <a className={link} href="https://mangadex.org">
                MangaDex
              </a>{" "}
              menyediakan katalog, daftar chapter, dan gambar chapter melalui
              API publiknya. Setiap judul dan chapter menautkan kembali ke
              halamannya di MangaDex.
            </li>
            <li>
              Terjemahan di MangaDex dikerjakan oleh grup scanlation. Nama grup
              ditampilkan di samping setiap chapter dan di dalam reader, dengan
              tautan ke halaman grup tersebut.
            </li>
            <li>
              <a className={link} href="https://www.peppercarrot.com">
                Pepper &amp; Carrot
              </a>{" "}
              adalah karya David Revoy dengan lisensi{" "}
              <a className={link} href={pepperCarrotLicense}>
                CC BY 4.0
              </a>
              . Kredit lengkap tersedia di setiap episode.
            </li>
          </ul>
        </Card>
        <Card>
          <h2 className="mb-3 text-2xl font-bold">Permintaan penghapusan</h2>
          <p className="max-w-prose text-muted-foreground">
            Grup scanlation dan pemegang hak dapat meminta karyanya tidak
            ditayangkan di ComicHub. Permintaan dari pengurus grup akan
            dipenuhi.{" "}
            {contact ? (
              <>
                Kirim permintaan ke{" "}
                <a className={link} href={`mailto:${contact}`}>
                  {contact}
                </a>
                .
              </>
            ) : (
              "Hubungi pengelola ComicHub untuk mengajukannya."
            )}
          </p>
        </Card>
      </div>
    </section>
  );
}
