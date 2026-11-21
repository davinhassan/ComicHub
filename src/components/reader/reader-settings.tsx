"use client";

import { useReaderSettings } from "@/lib/reader-settings";

const field = "grid gap-1 text-sm font-semibold";
const toggle = "flex min-h-11 items-center gap-3 text-sm font-semibold";

export function ReaderSettingsFields() {
  const [settings, update] = useReaderSettings();
  return (
    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className={field}>
        Mode baca
        <select
          className="catalog-field font-normal"
          value={settings.mode}
          onChange={(event) =>
            update({ mode: event.target.value === "paged" ? "paged" : "strip" })
          }
        >
          <option value="strip">Gulir vertikal</option>
          <option value="paged">Per halaman</option>
        </select>
      </label>
      <label className={field}>
        Lebar halaman
        <select
          className="catalog-field font-normal"
          value={settings.width}
          onChange={(event) =>
            update({
              width:
                event.target.value === "wide"
                  ? "wide"
                  : event.target.value === "full"
                    ? "full"
                    : "medium",
            })
          }
        >
          <option value="medium">Sedang</option>
          <option value="wide">Lebar</option>
          <option value="full">Selebar layar</option>
        </select>
      </label>
      <label className={field}>
        Arah baca per halaman
        <select
          className="catalog-field font-normal"
          value={settings.direction}
          onChange={(event) =>
            update({ direction: event.target.value === "rtl" ? "rtl" : "ltr" })
          }
        >
          <option value="ltr">Kiri ke kanan</option>
          <option value="rtl">Kanan ke kiri (manga)</option>
        </select>
      </label>
      <label className={toggle}>
        <input
          type="checkbox"
          className="size-5"
          checked={settings.gap}
          onChange={(event) => update({ gap: event.target.checked })}
        />
        Beri jarak antarhalaman
      </label>
      <label className={toggle}>
        <input
          type="checkbox"
          className="size-5"
          checked={settings.dataSaver}
          onChange={(event) => update({ dataSaver: event.target.checked })}
        />
        Hemat data untuk chapter MangaDex
      </label>
    </div>
  );
}
