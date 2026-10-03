# AI Haber Ozetleyici - Chrome Eklentisi

Bu repo iki parcadan olusur:

- `extension/`: Chrome extension
- `supabase/functions/summarize/`: OpenAI cagrilarini yapan Supabase Edge Function

## Mimari

Akis su sekilde calisir:

1. Popup istegi background service worker'a yollar.
2. Background service worker aktif sekmede extractor scriptini gecici olarak calistirir.
3. Background service worker Supabase edge function'a, semantik kaynak eslestirme katmanina ve Google News RSS'e istek atar.
4. Edge function ozet, soru-cevap, taraflilik analizi, oy ve kullanim kotasi yanitlarini dondurur.

## Kurulum

### 1. Supabase projesi olustur

Bir Supabase projesi olustur ve proje URL'ini not et.

Auth > Providers altinda Anonymous Sign-Ins ozelligini etkinlestir.

### 2. Migrationlari uygula

Repo icindeki migration dosyalari:

- `usage`
- `article_votes`

Yerelde:

```bash
supabase start
supabase db push
```

Remote projeye:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. Edge Function secretlarini ayarla

Supabase Dashboard > Edge Functions > Secrets altinda su degiskenleri tanimla:

- `OPENAI_API_KEY`

Notlar:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY` ve `SUPABASE_SERVICE_ROLE_KEY` Supabase tarafinda varsayilan olarak saglanir.
- `ALLOWED_ORIGIN` icine izin verilen extension origin degerlerini ekle. Ornek: `chrome-extension://<extension-id>`
- Extension build adiminda ayni projenin publishable key'ini `SUPABASE_PUBLISHABLE_KEY` olarak ver.

### 4. Edge Function'i deploy et

Function Supabase gateway JWT verification ile calisacak sekilde deploy edilmelidir:

```bash
supabase functions deploy summarize
```

Yerelde test etmek istersen:

```bash
supabase functions serve summarize
```

### 5. Extension endpoint ve publishable key'i ayarla

Su dosyada kendi Supabase function URL'ini gir:

- `extension/background/background.js`

`EDGE_URL` degerini su formata gore guncelle:

```text
https://<your-project-ref>.supabase.co/functions/v1/summarize
```

Ardindan distributable extension'i build et:

```bash
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
./scripts/build-extension.sh
```

### 6. Chrome'a yukle

1. `chrome://extensions` ac
2. Gelistirici modunu ac
3. `Paketlenmemis oge yukle` sec
4. `dist/extension/` klasorunu sec

## Runtime davranisi

- Extension tarafinda `deviceId`, dil secimi, son sonuc, gecmis ve Supabase anonymous session'i `chrome.storage.local` icinde tutulur.
- Ham haber metni kalici history/cache kayitlarina yazilmaz; sadece ozetlenmis sonuc ve temel makale metadatasi saklanir.
- Gunluk ozet hakki server-side hesaplanir.
- Edge function her API yanitinda `remaining` alanini dondurur.
- RSS cagirilari tek noktadan background service worker uzerinden yapilir.
- OpenAI yanitlari Structured Outputs JSON Schema kontratlariyla alinir; ozet, soru-cevap ve taraflilik analizi serbest metin parse etmeye dayanmaz.
- Semantik kaynak eslestirme, Supabase Postgres `pgvector` ve OpenAI embedding cagrilariyla son 48 saatteki yakin olaylari bulur; Google News RSS yedek kaynak katmani olarak kalir.

## Guvenlik notlari

- Extension istekleri allowlisted origin + Supabase Auth Bearer token ile korunur.
- Chrome extension kodu kullanici cihazinda acik oldugu icin extension icine gomulen client secret degerlerine guvenlik siniri olarak dayanilmaz.
- Supabase gateway once JWT'yi dogrular; edge function daha sonra allowlisted origin ve rate limit kontrollerini uygular.
- `ALLOWED_ORIGIN` bos birakilmaz; bos veya hataliysa function fail-closed davranir.
- AI endpoint'lerinde hem gunluk kota hem de kisa pencere rate limit uygulanir.
- OpenAI anahtari sadece edge function tarafinda kullanilir.
- Database istekleri service role ile edge function icinde yapilir.
- `usage`, `article_votes` ve `summary_feedback` tablolarinda RLS aktiftir.
- Analytics view'lari public REST erisimine kapatilmalidir; bunun icin repo migration'larini tam uygulayin.

## Dosya yapisi

```text
extension/
|-- manifest.json
|-- background/
|-- content/
|-- popup/
`-- utils/

supabase/
|-- config.toml
|-- functions/summarize/index.ts
|-- migrations/
`-- seed.sql
```
