export type Drama = {
  id: number | string;
  title: string;
  episodes: number;
  poster: string;
  spriteX?: number;
  synopsis: string;
  sourceProvider?: string;
  sourceId?: string;
};

// The first six covers use the user-supplied reference image as a CSS sprite.
// Replace these preview crops with standalone licensed covers before release.
export const dramas: Drama[] = [
  {
    "id": 1,
    "title": "My Unstoppable Bodyguard",
    "episodes": 92,
    "poster": "/posters/reference-layout.png",
    "spriteX": 192,
    "synopsis": ""
  },
  {
    "id": 2,
    "title": "My Husband Is One of Them",
    "episodes": 80,
    "poster": "/posters/reference-layout.png",
    "spriteX": 444,
    "synopsis": ""
  },
  {
    "id": 3,
    "title": "A Mother Made of Strength",
    "episodes": 50,
    "poster": "/posters/reference-layout.png",
    "spriteX": 696,
    "synopsis": ""
  },
  {
    "id": 4,
    "title": "A Vow of Sweetness and Sorrow",
    "episodes": 52,
    "poster": "/posters/reference-layout.png",
    "spriteX": 948,
    "synopsis": ""
  },
  {
    "id": 5,
    "title": "What Love Made Me Do",
    "episodes": 40,
    "poster": "/posters/reference-layout.png",
    "spriteX": 1200,
    "synopsis": ""
  },
  {
    "id": 6,
    "title": "I Cured the CEO’s Aphasia",
    "episodes": 50,
    "poster": "/posters/reference-layout.png",
    "spriteX": 1452,
    "synopsis": ""
  },
  {
    "id": 7,
    "title": "Kembali dari Menara Setinggi 300 Meter",
    "episodes": 50,
    "poster": "/posters/catalog-01.webp",
    "synopsis": ""
  },
  {
    "id": 8,
    "title": "Rahasia di Bawah Bantal",
    "episodes": 40,
    "poster": "/posters/catalog-02.webp",
    "synopsis": ""
  },
  {
    "id": 9,
    "title": "Delapan belas tahun yang salah arah",
    "episodes": 56,
    "poster": "/posters/catalog-03.webp",
    "synopsis": ""
  },
  {
    "id": 10,
    "title": "Perjanjian Pertukaran Pasangan",
    "episodes": 38,
    "poster": "/posters/catalog-04.webp",
    "synopsis": ""
  },
  {
    "id": 11,
    "title": "Kehidupan Balik Arah Ayam Bulu Reeds",
    "episodes": 36,
    "poster": "/posters/catalog-05.webp",
    "synopsis": ""
  },
  {
    "id": 12,
    "title": "Angin musim semi melintasi pegunungan dan ladang",
    "episodes": 43,
    "poster": "/posters/catalog-06.webp",
    "synopsis": ""
  },
  {
    "id": 13,
    "title": "Kau rasa terindah di duniaku",
    "episodes": 65,
    "poster": "/posters/catalog-07.webp",
    "synopsis": ""
  },
  {
    "id": 14,
    "title": "Cinta Usia Tua Paling Indah",
    "episodes": 55,
    "poster": "/posters/catalog-08.webp",
    "synopsis": ""
  },
  {
    "id": 15,
    "title": "Pemandangan Indah, Masa Lalu",
    "episodes": 69,
    "poster": "/posters/catalog-09.webp",
    "synopsis": ""
  },
  {
    "id": 16,
    "title": "Kembali 3 Tahun Lalu, Lindungi Menantu",
    "episodes": 80,
    "poster": "/posters/catalog-10.webp",
    "synopsis": ""
  },
  {
    "id": 17,
    "title": "Penulis yang Menghancurkan Dunia Kerja Abadi",
    "episodes": 65,
    "poster": "/posters/catalog-11.webp",
    "synopsis": ""
  },
  {
    "id": 18,
    "title": "Armada Antariksa: Hanya Wanita",
    "episodes": 65,
    "poster": "/posters/catalog-12.webp",
    "synopsis": ""
  },
  {
    "id": 19,
    "title": "CEO Asli di Pernikahanku",
    "episodes": 64,
    "poster": "/posters/catalog-13.webp",
    "synopsis": ""
  },
  {
    "id": 20,
    "title": "Bukan Laut Yang Dulu",
    "episodes": 70,
    "poster": "/posters/catalog-14.webp",
    "synopsis": ""
  },
  {
    "id": 21,
    "title": "Sangkar kurungan",
    "episodes": 72,
    "poster": "/posters/catalog-15.webp",
    "synopsis": ""
  },
  {
    "id": 22,
    "title": "Sadar, kutendang lima tunangan",
    "episodes": 80,
    "poster": "/posters/catalog-16.webp",
    "synopsis": ""
  }
];
