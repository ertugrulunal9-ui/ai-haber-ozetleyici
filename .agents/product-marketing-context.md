# Ürün Pazarlama Bağlamı

*Son güncelleme: 2026-04-23*

## Ürün Genel Bakış
**Tek cümlelik tanım:** Haber makalelerini yapay zeka ile özetleyen; siyasi taraflılığı, duygusal tonu ve clickbait'i ortaya çıkaran bir Chrome eklentisi — daha hızlı ve daha az manipüle olarak okumanı sağlar.

**Ne yapar:** Herhangi bir haber sayfasında tek tıklama ile kısa bir AI özeti, siyasi (sol/sağ) ve duygusal (nesnel/duygusal) taraflılık ölçeri, topluluk tarafından oylanan bir clickbait göstergesi ve aynı haberi başka kaynakların nasıl işlediğini gösteren bir liste üretir. Kullanıcı ayrıca makale hakkında ek sorular sorabilir.

**Ürün kategorisi:** Haber özetleme / medya okuryazarlığı tarayıcı eklentisi (raf: "AI haber okuyucu", "haber özetleyici eklenti", "taraflılık kontrolörü").

**Ürün tipi:** OpenAI'ı çağıran bir Supabase edge function ile desteklenen Chrome eklentisi (Manifest V3).

**İş modeli:** Şu an ücretsiz; kullanıcı başına günlük 10 özet ve 10 asistan isteği ile sınırlı. Önceliği önce kullanıcı edinmek; premium katman ve fiyatlandırma sonraya bırakıldı. Limit ekranındaki "Beni Bilgilendir" butonu, ileride bir premium katman için talep sinyali topluyor.

## Hedef Kitle
**Hedef pazar:** Sadece Türkiye. Birincil kitle Türkçe konuşan haber okurları. İngilizce yerelleştirme repoda bulunuyor ama GTM odağı değil.

**Hedef kullanıcı profili:** Birden fazla kaynağı takip eden, başlıklara şüpheyle yaklaşan, kutuplaşmış haberlerden yorulmuş düzenli haber tüketicileri.

**Karar verici:** Bireysel tüketici (B2C). Satın alma komitesi yok.

**Ana kullanım senaryosu:** "Bu makalenin aslında ne dediğini — ve ne kadar taraflı olduğunu — tamamını okumadan veya beş kaynağı karşılaştırmadan öğrenmek istiyorum."

**Jobs to be Done (hedef işler):**
- Haberi tam açmadan birkaç saniyede özünü yakalamak
- Bir başlığın/kaynağın bir ajanda mı dayatıyor olduğunu içselleştirmeden önce anlamak
- Farklı yayın organlarının aynı olayı nasıl çerçevelediğini karşılaştırmak
- Makaleyi tekrar okumadan spesifik bir soru sormak

**Kullanım senaryoları:**
- Sabah haber taraması — 2 makaleyi okuyacak sürede 10 makaleyi özetlemek
- Sosyal medyada paylaşılan bir başlığı tekrar paylaşmadan önce doğrulamak
- Tıklamadan önce haberin clickbait olup olmadığını kontrol etmek
- Yabancı dilde haber okumak (özet + örtük çeviri, model sayesinde)

## Personalar
Uygulanmaz — tüketici ürünü, tek kullanıcı.

## Problemler ve Sorun Noktaları
**Temel problem:** Türk haberleri yoğun, kutuplaşmış ve clickbait yüklü. Okurlar ya göz gezdirip bağlamı kaçırır ya da derinlemesine okuyup çerçevelemenin manipülasyonuna maruz kalır.

**Alternatifler neden yetersiz kalıyor:**
- Farklı kaynakları manuel karşılaştırmak haber başına 10+ dakika alır
- Tarayıcıların dahili "okuma modu" reklamları kaldırır ama ne özetler ne de analiz eder
- Genel AI sohbet robotları (ChatGPT) her seferinde kopyala-yapıştır gerektirir; taraflılık puanı yoktur
- Haber agregatörleri (Google News) başlıkları gösterir ama yorumlamaz

**Kullanıcıya maliyeti:** Zaman (3 gerçeği çıkarmak için tam makale okumak), bilişsel yük (yüklü dili ayıklamak) ve epistemik maliyet (taraflılığı bilinçsizce içselleştirmek).

**Duygusal gerilim:** Kutuplaşmış medyadan yorgunluk, kaynaklara güvensizlik, "dikkatli okumuyor olma" suçluluğu, manipüle edilme kaygısı.

## Rekabet Ortamı
**Doğrudan:** Diğer AI özetleyici eklentileri (ör. TLDR This, Glarity'nin Summarize, Wiseone) — çoğu sadece özete odaklanır; siyasi *ve* duygusal taraflılık puanlaması veya entegre çok kaynaklı karşılaştırma sunan azdır. Çoğu yalnız İngilizce — Türkiye pazarında yerel rakip çok az.

**İkincil:** ChatGPT / Claude (makaleyi yapıştır, özet iste) — çalışır ama her seferinde manuel akış gerektirir, taraflılık arayüzü ve istatistik yoktur.

**Dolaylı:** Tarayıcı okuma modu, haber agregatörleri (Google News, Feedly), medya taraflılık siteleri (AllSides, Ad Fontes) — hiçbiri özet + taraflılık + clickbait + soru-cevabı okuduğun sayfada tek tıkla birleştirmez.

## Farklılaşma
**Temel farklılaştırıcılar:**
- Hem siyasi hem duygusal taraflılık ölçeri (çoğu araç ikisini de yapmaz)
- Topluluk clickbait oylaması (sadece AI kararı değil, sosyal sinyal)
- Google News RSS üzerinden tek tıkla çok kaynaklı karşılaştırma
- Makale özelinde soru-cevap
- Okuma istatistikleri: seriler, haftalık sayılar, kişisel taraflılık haritası, en çok okunan kaynaklar
- Türkçe öncelikli UX (İngilizce ağırlıklı rakiplere karşı eksik karşılanan bir pazar)
- Gizlilik odaklı: makale metni hiçbir zaman saklanmaz, AB'de barındırılan backend

**Neden daha iyi:** Kullanıcı, sayfadan ayrılmadan her makalenin üzerine eksiksiz bir medya okuryazarlığı katmanı ekler — özet + çerçeveleme kontrolü + akran sinyali.

**Müşteriler neden bizi seçiyor:** "Haber linki gördüm" anından "ne dediğini, ne kadar taraflı olduğunu ve diğer kaynakların nasıl çerçevelediğini biliyorum" anına en hızlı yol — ve Türkçe doğar doğmaz.

## İtirazlar
| İtiraz | Yanıt |
|--------|-------|
| "AI özetleri nüansı kaçırır." | Özet tamamlayıcıdır, yerine koymaz — taraflılık ölçeri, özetin düzlediği şeyleri yüzeye çıkarır. |
| "Taraflılık puanına nasıl güveneyim?" | Makale başına AI tarafından üretilir ve bir karar değil, yönlendirici sinyal olarak gösterilir. Clickbait oyu ise crowdsource ile doğrulanır. |
| "Okumalarım takip ediliyor mu?" | Makale metni saklanmaz. Yalnızca özet çıktıları, oylar ve kullanım sayaçları tutulur. AB'de barındırılır. |
| "Neden günde sadece 10?" | Her istek bize gerçek para (OpenAI) olarak mal oluyor. Ücretsiz katman normal okuma için cömerttir; yoğun kullanıcılar "Beni Bilgilendir" ile haber alabilir. |

**Anti-persona:** Birincil kaynak ve net alıntılara ihtiyaç duyan profesyonel gazeteciler veya analistler — araç, araştırma düzeyinde analiz için değil, hızlı tüketici okuması için tasarlandı.

## Geçiş Dinamikleri
**İtme (Push):** Fazla açık sekme, çapraz kontrol edilecek çok fazla kaynak, clickbait başlıklarından duyulan rahatsızlık, çerçevelemeye güvensizlik.

**Çekme (Pull):** Tek tıklama 10 dakikalık iş akışının yerine geçiyor; taraflılık ölçeri hiçbir rakibin göstermediği bir şey.

**Alışkanlık:** "Ben yine makaleyi okurum." Başlığa güvenme alışkanlığını kırmak, temel davranış değişikliği.

**Kaygı:** "Yanlış yorumlarsa?" / "Okuma geçmişim sızar mı?" — taraflılık-sinyal çerçevelemesi ve açık "saklanmaz" gizlilik politikasıyla karşılanıyor.

## Müşteri Dili
*(Eksik — henüz kullanıcı geri bildirimi toplanmadı. Bu bölüm ilk kullanıcı yorumları, DM'ler veya mülakatlar geldikçe güncellenmeli.)*

**Arayüzde geçen Türkçe terimler (yer tutucu):**
- "Özetle"
- "Taraflılık Analizi"
- "Clickbait mi?"
- "Diğer Kaynaklar"
- "Günlük özet hakkın"

**Kaçınılacak kelimeler:** "İçerik tüketimi", "dezenformasyon", "fact-check" (araçtan çok şey vaat ediyor — bu bir doğruluk yargıcı değil, çerçeveleme sinyalidir).

**Sözlük:**
| Terim | Anlamı |
|-------|--------|
| Taraflılık ölçeri | İki eksenli AI puanı: siyasi (sol↔sağ) + duygusal (nesnel↔duygusal) |
| Clickbait oyu | Başlığın yanıltıp yanıltmadığına dair topluluk beğenisi/beğenmemesi |
| Seri (streak) | Kullanıcının en az bir makale özetlediği ardışık günler |
| Kaynak profili | Kullanıcının kendi okumalarına göre her yayın organının toplam taraflılık eğilimi |

## Marka Sesi
**Ton:** Samimi, doğrudan, hafif oyunbaz. Türkçe metin "sen" dili kullanıyor ("Günlük 10 özet hakkın doldu. Yarın tekrar kullanabilirsin!" — arkadaşça, kurumsal değil).

**Stil:** Kısa cümleler, fayda öncelikli, jargonsuz. Arayüzde emojiler sınırlı kullanılıyor (👎 👍 📊).

**Kişilik:** Şüpheci, verimli, güvenilir, Türkçe-yerel, gizliliğe saygılı.

## Kanıt Noktaları
*(Çoğu boş — ürün ivme kazandıkça doldurulacak.)*

**Metrikler:** Henüz yok.
**Müşteriler:** Henüz yok (erken aşama).
**Referanslar:** Henüz yok.
**Değer temaları:**
| Tema | Kanıt |
|------|-------|
| Hız | Tek tıklama, saniyeler içinde özet (popup açılışından sonuca ölçülür) |
| Taraflılık şeffaflığı | Her makalede görünen iki eksenli ölçer |
| Gizlilik | Makale metni hiçbir zaman kalıcı değildir; politika docs/privacy-policy.md'de yayınlandı |
| Yerel öncelikli | Çeviriyle sonradan eklenmemiş, Türkçe-yerel arayüz |

## Hedefler
**İş hedefi (bu aşama):** Ücretsiz katmanın kullanıcı tabanını büyütmek. Premium ve fiyatlandırma kararları, anlamlı bir kullanıcı kitlesi oluştuktan sonra ele alınacak.

**Dönüşüm aksiyonu:** Eklentiyi yükle → hesap oluştur → en az bir makale özetle → alışkanlık oluştur (seri devamı). Limit ekranında "Beni Bilgilendir" butonuyla talep sinyali topla.

**Mevcut metrikler:** Henüz takip edilmiyor — erken kurulum, özetleme ve 1-gün retention verisi toplamaya değer.
