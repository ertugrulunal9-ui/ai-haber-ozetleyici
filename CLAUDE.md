# CLAUDE.md — AI Haber Özetleyici

Chrome eklentisi + Supabase Edge Function mimarisine sahip haber özetleme projesi.
Kullanıcı bir haber makalesindeyken eklenti popup'ını veya sidebar'ını açar; makale metni
arka planda OpenAI GPT-4o-mini'ye gönderilir ve özet, anahtar kelimeler, ilgili kaynaklar
kullanıcıya gösterilir. Ek olarak taraflılık analizi, soru-cevap ve oylama özellikleri vardır.

---

## Mimari Genel Bakış

```
Kullanıcı (popup / sidebar)
        │
        ▼
background.js  ──── chrome.runtime.sendMessage ────▶ popup.js / content.js
        │
        ├── chrome.tabs.executeScript ──▶ extractor.js  (aktif sekmede geçici çalışır)
        │
        ├── fetch ──▶ Supabase Edge Function (JWT + origin allowlist)
        │                │
        │                ├── OpenAI GPT-4o-mini
        │                └── Supabase PostgreSQL (usage, votes, feedback)
        │
        └── fetch ──▶ Google News RSS  (ilgili kaynaklar için)
```

### Katman Sorumlulukları

| Katman | Dosyalar | Görevi | Sınırı |
|--------|----------|--------|--------|
| **Popup UI** | `popup/popup.js`, `popup-ui.js`, `popup-auth.js`, `popup-result.js`, `popup-history.js`, `popup-stats.js` | Kullanıcı etkileşimi, view geçişleri | DOM işlemleri burada; iş mantığı background'da |
| **Sidebar UI** | `content/content.js`, `sidebar-ui.js` | Sayfa içi sidebar montajı | Sayfanın DOM'una dokunur; eklenti DOM'una değil |
| **Background** | `background/background.js`, `auth-manager.js`, `api-client.js`, `rss-fetcher.js` | Auth, API köprüsü, RSS, caching, alarms | Tek kaynak; tüm dış çağrılar buradan |
| **Client State** | `utils/client-state.js` | `chrome.storage.local` okuma/yazma | Storage'a doğrudan erişim yalnızca bu modülden |
| **Stats Engine** | `utils/stats-engine.js` | İstatistik hesaplama | Saf fonksiyon — DOM yok, storage yok, test edilebilir |
| **Summary Surface** | `utils/summary-surface.js` | Özet HTML render | Paylaşılan render yardımcıları; popup ve sidebar ortak kullanır |
| **UI Common** | `utils/ui-common.js` | i18n çevirisi, hata mesajları, format | Saf yardımcı; yan etki yok |
| **Extractor** | `utils/extractor.js` | Aktif sekmeden makale metni çekme | Yalnızca içerik sayfasında çalışır |
| **Edge Function** | `supabase/functions/summarize/` | OpenAI çağrısı, rate limit, DB yazma | Tüm server-side mantık burada |

---

## Kritik Dosyalar

### Extension Tarafı

**`extension/background/background.js`** (217 satır — ince orkestratör)
- CONFIG, paylaşılan yardımcılar (`parseJson`, `createApiError`) ve `chrome.runtime.onMessage` dispatch
- Modüller `importScripts` ile yüklenir: `auth-manager.js`, `api-client.js`, `rss-fetcher.js`
- `chrome.alarms`: `pruneStats` (90 günden eski istatistikleri siler), `dailyDigest` (dün aktifse badge koyar)

**`extension/background/auth-manager.js`** (IIFE)
- Anonymous + email + Google OAuth PKCE akışı
- Supabase JWT token yönetimi, `getUser`, `getUsage`, `signOut`

**`extension/background/api-client.js`** (IIFE)
- Supabase edge function'a tüm istekler: `summarizeArticle`, `askQuestion`, `analyzeBias`, `submitVote`, vb.
- Özet job'larını LRU Map'inde tutar (TTL: 5 dakika, en fazla 20 kayıt)

**`extension/background/rss-fetcher.js`** (IIFE)
- Google News RSS fetch + XML parse + ilgili kaynak önerileri

**`extension/utils/client-state.js`** (425 satır, IIFE)
- `chrome.storage.local` üzerindeki tüm okuma/yazma işlemleri
- Eş zamanlı read-modify-write çakışmalarını önlemek için key bazlı async mutex (`_withMutex`)
- Doğrudan `chrome.storage.local.get/set` çağrısı yapma — her zaman bu modülü kullan
- Başka bir dosyadan storage'a el atma: mimari ihlali

**`extension/utils/stats-engine.js`** (IIFE, saf fonksiyon)
- DOM erişimi yok, storage okuma yok
- Test edilebilir; `tests/stats-engine.test.js` kapsamlı
- Bias hesaplama, streak, HHI kaynak çeşitliliği skoru, medya diyet özeti

**`extension/popup/popup.js`** (218 satır — ince orkestratör)
- State tanımı, init akışı ve event binding
- Özellikler ayrı modüllere bölünmüştür: `popup-auth.js`, `popup-result.js`, `popup-history.js`, `popup-stats.js`
- Yeni özellik eklerken yeni bir `popup-<feature>.js` modülü aç

### Edge Function Tarafı (`supabase/functions/summarize/`)

| Dosya | Görevi |
|-------|--------|
| `index.ts` | HTTP entrypoint — auth, limit, handler dispatch |
| `handlers.ts` | Action dispatch: summarize, ask, bias, vote, feedback, getvotes |
| `limits.ts` | Cihaz + IP bazlı günlük ve burst rate limit mantığı |
| `openai.ts` | GPT-4o-mini çağrıları; Structured Outputs JSON Schema kontratları |
| `prompt.ts` | Dile göre (tr/en) sistem prompt ve kullanıcı prompt builder |
| `auth.ts` | JWT'den token çıkarma ve origin whitelist doğrulama |
| `request.ts` | Payload parse + alan uzunluğu doğrulama |
| `response.ts` | `json()`, CORS header, `withRemaining()` yardımcıları |
| `limits.ts` | Tek kaynak: her rate limit mantığı burada |
| `errors.ts` | `HttpError` sınıfı |
| `env.ts` | `getRequiredEnv()` — eksik env var'da erken hata fırlatır |

---

## Geliştirme Komutları

```bash
# Testleri çalıştır
npm test

# Test watch modu
npm run test:watch

# Extension build (env değişkenleri zorunlu)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx \
npm run build:extension
# → dist/extension/ klasörüne yazar

# Local Supabase başlat
supabase start

# Edge function local test
supabase functions serve summarize

# Migrationları uygula
supabase db push

# Edge function deploy
supabase functions deploy summarize
```

### Chrome'a Yükleme
1. `chrome://extensions` → Geliştirici modu aç
2. "Paketlenmemiş öge yükle" → `dist/extension/` seç

---

## Environment Variables

| Değişken | Nerede Tanımlanır | Açıklama |
|----------|-------------------|----------|
| `OPENAI_API_KEY` | Supabase Edge Function secret | Yalnızca edge function görür |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase otomatik sağlar | Yalnızca edge function; DB yazma yetkisi |
| `SUPABASE_URL` | Supabase otomatik sağlar | |
| `SUPABASE_ANON_KEY` | Supabase otomatik sağlar | JWT doğrulama için |
| `ALLOWED_ORIGIN` | Edge Function secret | Virgülle ayrılmış extension origin listesi; boş bırakılırsa fail-closed |
| `SUPABASE_PUBLISHABLE_KEY` | Build env | Extension içine gömülür; güvenli, secret değil |

> Chrome extension kodu kullanici cihazinda acik oldugu icin extension icine
> gomulen client secret degerlerine guvenlik siniri olarak dayanma. Guvenlik
> Supabase Auth Bearer token, origin allowlist, RLS ve server-side rate limit
> kontrolleri uzerinde durmalidir.

---

## Değişiklik Yaparken Dikkat

### Yapılmalı
- Storage okuma/yazma için her zaman `client-state.js` içindeki fonksiyonları kullan
- Yeni istatistik hesabı eklerken `stats-engine.js`'e koy — DOM'a dokunmayan saf fonksiyon
- Popup ve sidebar'da paylaşılan render mantığını `summary-surface.js`'e ekle
- Edge function'a yeni action eklerken `handlers.ts` → `actionHandlers` map'ini genişlet

### Yapılmamalı
- `chrome.storage.local.get/set` çağrısını `client-state.js` dışında kullanma
- `popup.js`'e yeni özellik eklerken aynı dosyada yeni 200+ satırlık blok oluşturma
  — yeni bir `popup-<feature>.js` modülü aç
- Edge function içinde `SUPABASE_SERVICE_ROLE_KEY`'i log'a yazdırma
- `ALLOWED_ORIGIN`'i boş bırakma — tüm istekleri bloklar

### Mimari Sınır: Neden background.js?
Tüm dış API çağrıları background service worker üzerinden geçer çünkü:
- Content script'ler CSP kısıtlamalarına takılabilir
- Popup kapandığında devam eden işler background'da yaşamaya devam eder
- Auth token'ı tek noktada tutmak token yenileme yarış durumunu önler

---

## Test Stratejisi

```
tests/
├── background.test.js      → RSS parser edge case'leri (CDATA, eksik tag, geçersiz URL)
├── client-state.test.js    → Mutex doğruluğu, atomic okuma/yazma, streak, history, saved articles
├── stats-engine.test.js    → Bias hesaplama, streak, HHI, medya diyet özeti
├── summary-surface.test.js → HTML render, XSS escape, link doğrulama
└── ui-common.test.js       → i18n çevirisi, hata mesaj lookup, remaining format

supabase/functions/summarize/
├── request_test.ts         → Payload parse, boyut limiti
├── auth_test.ts            → JWT ve origin doğrulama
├── prompt_test.ts          → Türkçe/İngilizce sistem mesajı seçimi
├── response_test.ts        → CORS header üretimi
└── openai_test.ts          → GPT yanıt parse
```

**Kural:** `stats-engine.js` ve `ui-common.js` fonksiyonları saf kalmalı — test
dosyalarına bakarak DOM veya storage bağımlılığı getirme.

---

## Veritabanı Şeması (Özet)

```sql
usage           (device_id, date, count)          -- günlük kota sayacı
article_votes   (url, device_id, is_clickbait)    -- tıklama tuzağı oylaması
summary_feedback(id, url, device_id, rating)      -- özet kalite geri bildirimi

-- Analytics view'ları (read-only, public REST erişimine kapalı olmalı)
analytics_daily_active
analytics_usage_by_bucket
analytics_top_voted_articles
analytics_retention
```

Rate limit mantığı `usage` tablosunu kullanır; `device_id` hem UUID hem
`ip_*` ve `assistant:burst:*` prefix'li satırlar için çalışır.

---

## Mimari Notlar

Aşağıdaki maddeler önceki sürümlerde teknik borç olarak kayıtlıydı; tamamı giderilmiştir:

- `popup.js` modüllere ayrıldı (`popup-auth.js`, `popup-result.js`, `popup-history.js`, `popup-stats.js`)
- `background.js` sorumlulukları ayrıldı (`auth-manager.js`, `api-client.js`, `rss-fetcher.js`)
- Polling (800ms interval) kaldırıldı; background push modeliyle değiştirildi
- `deviceId` artık `chrome.storage.sync`'e de yedekleniyor
- `client-state.js` write operasyonları async mutex ile korunuyor (eş zamanlı yazar yarışı giderildi)

### Kabul Edilen Mimari Kısıt

Chrome extension kodu kullanici cihazinda acik oldugu icin client tarafina
gomulen degerler secret sayilmaz. Guvenlik Supabase Auth Bearer token,
allowlisted origin, RLS ve server-side rate limit uzerinde durur.
