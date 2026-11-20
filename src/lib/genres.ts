export const genres = {
  action: "Aksi",
  adventure: "Petualangan",
  comedy: "Komedi",
  drama: "Drama",
  fantasy: "Fantasi",
  horror: "Horor",
  mystery: "Misteri",
  romance: "Romansa",
  "sci-fi": "Fiksi ilmiah",
  "slice-of-life": "Kehidupan sehari-hari",
  sports: "Olahraga",
} as const;

export type Genre = keyof typeof genres;
