# AI Haber Ozetleyici - Chrome Eklentisi

Bu repo iki parcadan olusur:

- `extension/`: Chrome extension
- `supabase/functions/summarize/`: OpenAI cagrilarini yapan Supabase Edge Function

## Mimari

Akis su sekilde calisir:

1. Content script sayfadaki haber metnini cikarir.
2. Popup veya sidebar istegi background service worker'a yollar.
3. Background service worker Supabase edge function'a ve Google News RSS'e istek atar.
4. Edge function ozet, soru-cevap, taraflilik analizi, oy ve kullanim kotasi yanitlarini dondurur.

## Kurulum

### 1. Supabase projesi olustur

Bir Supabase projesi olustur ve proje URL'ini not et.

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
- `SUPABASE_SERVICE_ROLE_KEY`

Notlar:

- `SUPABASE_URL` Supabase tarafinda otomatik saglanir.
- `APP_SECRET` artik kullanilmiyor.
- Function public calisir; koruma server-side rate limit ile saglanir.

### 4. Edge Function'i deploy et

Function artik public oldugu icin JWT dogrulamasi kapali deploy edilmelidir:

```bash
supabase functions deploy summarize --no-verify-jwt
```

Yerelde test etmek istersen:

```bash
supabase functions serve summarize --no-verify-jwt
```

### 5. Extension endpoint'ini guncelle

Su dosyada kendi Supabase function URL'ini gir:

- `extension/background/background.js`

`EDGE_URL` degerini su formata gore guncelle:

```text
https://<your-project-ref>.supabase.co/functions/v1/summarize
```

### 6. Chrome'a yukle

1. `chrome://extensions` ac
2. Gelistirici modunu ac
3. `Paketlenmemis oge yukle` sec
4. `extension/` klasorunu sec

## Runtime davranisi

- Extension tarafinda `deviceId`, dil secimi, son sonuc ve gecmis `chrome.storage.local` icinde tutulur.
- Gunluk ozet hakki server-side hesaplanir.
- Edge function her API yanitinda `remaining` alanini dondurur.
- RSS cagirilari tek noktadan background service worker uzerinden yapilir.

## Guvenlik notlari

- Client tarafinda artik `APP_SECRET` yok.
- OpenAI anahtari sadece edge function tarafinda kullanilir.
- Database istekleri service role ile edge function icinde yapilir.
- `usage` ve `article_votes` tablolarinda RLS aktiftir.

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
