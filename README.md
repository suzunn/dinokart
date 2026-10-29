# Dinokart 🦕

Elif'in İngilizce, Almanca ve Fransızca kelime kartları. iPhone'da ana ekrana eklenen web uygulaması (PWA).

Adres: https://suzunn.github.io/dinokart/

## Ne yapıyor

- **Ekle:** dil seç, kelimeyi yaz (Almanca/Fransızcada artikeliyle). Türkçesi önce sözlükten gelir
  (İngilizce Wiktionary, Almanca Netzverb, Fransızca Wiktionnaire), sözlükte yoksa Google Çeviri'den. Kutu
  düzeltilebilir, alternatifler dokunarak seçilir, elle yazılan anlamın üstüne asla yazılmaz. Örnek cümleyi
  [Tatoeba](https://tatoeba.org) verir; Türkçesi yoksa o da çevrilir (Google, olmazsa MyMemory).
  Tureng denendi ama Cloudflare bot koruması otomatik istekleri geri çeviriyor.
- **Kart:** önde kelime + altında cümle (kelime vurgulu), arkada Türkçesi. Dokun = çevir.
  Sağa kaydır = bildim, sola = tekrar gelsin. Hoparlör = telefonun sesiyle okuma.
- **Artikel renkleri:** der/le mavi, die/la kırmızı, das yeşil.
- **Aralıklı tekrar:** bilinen kelime 1, 3, 7, 16, 35, 90 gün sonra geri gelir; bilinmeyen başa döner
  ve aynı turda 3 kart sonra yeniden çıkar. İlk görüşte bilinen kelime doğrudan 7 günlük kutuya gider.
  7+ günlük aralığa çıkan kelime "oturdu" sayılır. Tur 20 kart.
- **Seri:** art arda çalışılan gün sayısı.
- **Duocards'tan aktar:** app.duocards.com'dan (tarayıcıdan) inen CSV, Kelimeler sekmesinden yüklenir.
  Ayırıcı, başlık ve sütunlar tahmin edilir, önizlemede düzeltilir; kayıtlı kelimeler atlanır; yeni kartlar
  günde 20/50/100 tane açılır. Duocards'ta anlamı İngilizce yazılmış kartlar (Türkçeye özgü harf yoksa)
  işaretlenir; "Eksikleri tamamla" (aktarmadan sonra kendiliğinden başlar) bunların Türkçesini bulur, İngilizcesi
  notta kalır, cümlesi olmayanlara da cümle bulur.
- **Yedek:** veri sadece telefonda (localStorage). Kelimeler sekmesinden JSON yedek alınır/yüklenir.

## Geliştirme

```
npm install
npm run dev     # http://localhost:5173
npm test        # kart mantığı testleri (src/kart.test.ts)
npm run build
```

`main`'e her push GitHub Actions ile Pages'e yayınlanır (`.github/workflows/yayinla.yml`).

Sözlük sunucusu ayrı: Netlify'da `dinokart-sozluk` sitesi, tek fonksiyon `netlify/functions/sozluk.mjs`
(`/api/sozluk?dil=en|de|fr&q=...`), ayıklayıcılar `netlify/sozluk-ayikla.mjs`. Yayın:
`npx netlify-cli deploy --prod` (ayar `netlify.toml`). Sunucu çalışmazsa uygulama Google'a düşer.
Kod: `src/kart.ts` (model + tekrar mantığı), `src/cumle.ts` (Tatoeba), `src/ses.ts`, `src/depo.ts`,
ekranlar `src/App.tsx`, `src/Calisma.tsx`, `src/Form.tsx`, `src/KartYuz.tsx`.
