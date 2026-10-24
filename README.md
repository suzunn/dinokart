# Dinokart 🦕

Elif'in İngilizce, Almanca ve Fransızca kelime kartları. iPhone'da ana ekrana eklenen web uygulaması (PWA).

Adres: https://suzunn.github.io/dinokart/

## Ne yapıyor

- **Ekle:** dil seç, kelimeyi yaz (Almanca/Fransızcada artikeliyle). Türkçesi Google Çeviri'nin
  anahtarsız uç noktasından (`translate.googleapis.com`, resmi olmayan) sözlük alternatifleriyle kendiliğinden
  gelir; düzeltilebilir, alternatifler dokunarak seçilir, elle yazılan anlamın üstüne asla yazılmaz.
  Örnek cümleyi uygulama [Tatoeba](https://tatoeba.org)'dan bulur; Türkçesi yoksa o da çevrilir (Google,
  olmazsa [MyMemory](https://mymemory.translated.net)). MyMemory tek kelimede kullanılmaz, "window"a "açar" diyor.
  "Başka cümle" ile değiştirilir, "Kendim yazayım" ile elle yazılır.
- **Kart:** önde kelime + altında cümle (kelime vurgulu), arkada Türkçesi. Dokun = çevir.
  Sağa kaydır = bildim, sola = tekrar gelsin. Hoparlör = telefonun sesiyle okuma.
- **Artikel renkleri:** der/le mavi, die/la kırmızı, das yeşil.
- **Aralıklı tekrar:** bilinen kelime 1, 3, 7, 16, 35, 90 gün sonra geri gelir; bilinmeyen başa döner
  ve aynı turda 3 kart sonra yeniden çıkar. 16+ günlük aralığa çıkan kelime "oturdu" sayılır. Tur 20 kart.
- **Seri:** art arda çalışılan gün sayısı.
- **Yedek:** veri sadece telefonda (localStorage). Kelimeler sekmesinden JSON yedek alınır/yüklenir.

## Geliştirme

```
npm install
npm run dev     # http://localhost:5173
npm test        # kart mantığı testleri (src/kart.test.ts)
npm run build
```

`main`'e her push GitHub Actions ile Pages'e yayınlanır (`.github/workflows/yayinla.yml`).
Kod: `src/kart.ts` (model + tekrar mantığı), `src/cumle.ts` (Tatoeba), `src/ses.ts`, `src/depo.ts`,
ekranlar `src/App.tsx`, `src/Calisma.tsx`, `src/Form.tsx`, `src/KartYuz.tsx`.
