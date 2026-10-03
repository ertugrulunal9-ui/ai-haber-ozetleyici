# AI Haber Ozetleyici Product Roadmap

Bu dokuman, urunun PMF analizi ve Red Team risk analizinden uretilmis uygulama yol haritasidir. Amac, urunu "tek tik AI haber ozeti" aracindan "kisisel medya farkindaligi ve guven katmani"na tasimaktir.

## Ana Strateji

Urunun en buyuk firsati sadece haber ozetlemek degil; kullaniciya okudugu haberin ozunu, tonunu, manipulasyon riskini ve alternatif kaynaklardaki yansimasini gostermektir.

Ana konumlandirma:

> Okudugun haberin ozunu, tonunu ve farkli kaynaklardaki yansimasini tek tikla gor.

Basari icin urun su eksende ilerlemelidir:

- Ozet: Haberde ne oldu?
- Ton: Haber nasil anlatiliyor?
- Kaynak: Diger kaynaklar ayni olayi nasil cerceveliyor?
- Davranis: Kullanici zaman icinde nasil bir medya diyeti tuketiyor?

Kacinilacak pozisyonlar:

- Mutlak tarafsizlik hakemi gibi davranmak.
- Haber dogrulama kurumu gibi kesin hukum vermek.
- Her haber sitesini kusursuz destekleme iddiasi tasimak.
- Degeri sadece "daha fazla ozet" uzerinden satmak.

## Faz 0: Urun Netlestirme ve Stratejik Temizlik

Amac: Ne insa ettigimizi, kimin icin insa ettigimizi ve neyi yapmayacagimizi netlestirmek.

Hedef segmentler:

- Genel haber okuyucusu
- Politik gundem takipcisi
- Ogrenci / arastirmaci
- Gazeteci / editor
- Finans / ekonomi takipcisi
- Icerik / PR ekipleri

Ilk odak segment onerisi:

Yogun haber tuketen bilincili bireysel kullanici. Bu kullanici politika, ekonomi veya teknoloji gundemini takip eder; zaman kaybi, kaynak guveni, manipulasyon ve perspektif eksikligi sorunlarini hisseder.

Yapilacaklar:

- Urun vaadini "AI ile ozetle" dilinden "oz, ton ve kaynak farkini gor" diline tasimak.
- Bias ve taraflilik dil rehberi olusturmak.
- Riskli iddialari ve kesin hukumleri urun metinlerinden temizlemek.
- Ilk sprint icin ekran ve ozellik envanteri cikarmak.

Cikti:

- 1 sayfalik urun manifestosu.
- "Koru / gelistir / geri plana al / kaldir" ozellik envanteri.

## Faz 1: Cekirdek Sonuc Deneyimini Guclendirme

Amac: Kullanici bir haber sayfasinda urunu actiginda degeri 10 saniyede anlamali.

### Faz 1 Teknik Kalite Kapisi: Structured Outputs

Serbest model ciktisindan `KEYWORDS:` veya benzeri string isaretleriyle veri
parse etmek uzun vadeli urun guvenilirligi icin kabul edilebilir degildir.
Edge Function tarafindaki AI kontrati OpenAI Structured Outputs ile JSON Schema
zorlamasina tasinmalidir.

Beklenen sonuc:

- Ozet yaniti `{ summary, keywords }` seklinde typed kontratla doner.
- Soru-cevap yaniti `{ answer }` seklinde typed kontratla doner.
- Taraflilik analizi `{ political, emotional, note }` seklinde typed kontratla doner.
- Regex/string parsing yerine TypeScript tarafinda dar ve test edilebilir
  normalizasyon fonksiyonlari kullanilir.
- Parse hatalari urun davranisinin normal parcasi olmaktan cikar; kalan hata
  sinifi model/API hatasi veya schema ihlali olarak ele alinir.

Oncelikli ekran:

Sonuc ekrani.

Yeni sonuc yapisi:

1. Haberin Ozu
   - 3-5 maddelik kisa ozet.
   - Ana aktorler.
   - Olayin sonucu veya etkisi.
   - Gerekirse "neden onemli?" satiri.

2. Ton ve Manipulasyon Sinyali
   - Duygusal yogunluk.
   - Sansasyon / clickbait riski.
   - Politik cerceve sinyali.
   - Eksik perspektif uyarisi.

3. Diger Kaynaklar
   - Ayni konudaki alternatif haberler.
   - Kaynak isimleri.
   - Baslik karsilastirmasi.
   - Mumkunse kisa fark notu.

4. Soru-Cevap
   - Haber hakkinda soru sorma.
   - Ana degerin onune gecmeyecek sekilde ikincil konum.

5. Aksiyonlar
   - Kopyala.
   - Paylas.
   - Kaydet.
   - Clickbait oyu ver.
   - Daha sonra oku.

Bias dili icin guvenli ornekler:

- "Metin yuksek duygusal yogunluk iceriyor."
- "Baslik, metne gore daha iddiali bir cerceve kuruyor."
- "Karsi goruse sinirli yer verilmis."
- "Bu analiz kesin hukum degil, metinsel sinyaller uzerinden uretilmistir."

Basari metrikleri:

- Ozet sonrasi bias bolumu acilma orani.
- Alternatif kaynaklara tiklama orani.
- Ilk kullanim sonrasi ayni hafta tekrar kullanim orani.
- Clickbait oyu verme orani.

Cikti:

Daha net, daha guvenli ve daha ayirt edici sonuc deneyimi.

## Faz 2: Kisisel Medya Diyeti

Amac: Urun tekil haber analizi yapan aractan kullaniciya ozel bir panele donussun.

Ana alan:

Medya Diyeti / Istatistiklerim.

Gosterilecek bilgiler:

- Haftalik okuma sayisi.
- En cok okunan kaynaklar.
- En cok takip edilen konular.
- Ortalama duygusal ton.
- Bias dagilimi.
- Clickbait maruziyeti.
- Kaynak cesitliligi.
- Okuma serisi / streak.

Ekranin vaadi:

> Bu hafta haberleri nasil tukettin?

Risk:

Bu ekran fazla oyun gibi gorunurse ciddiyet kaybeder.

Savunma:

Gamification hafif kalmali. Streak destekleyici olabilir ama merkezi deger farkindalik olmali.

Basari metrikleri:

- Istatistik ekrani acilma orani.
- Haftalik geri donus orani.
- Kaydedilen haber sayisi.
- Kullanici basina haftalik analiz sayisi.

Cikti:

Kullanicinin urune kisisel veri ve aliskanlik yatirimi yapmasini saglayan panel.

## Faz 3: Kaynak Karsilastirma Motoru

Amac: Urunun en savunulabilir tarafini guclendirmek.

Minimum ozellikler:

- Ayni olayla ilgili 3-5 haber bulmak.
- Basliklari karsilastirmak.
- Kaynaklari listelemek.
- Kelime secimi ve cerceve farklarini gostermek.
- Duygusal ton farkini gostermek.

### Maliyet Kontrollu Semantik Eslesme Stratejisi

Google News RSS ve baslik benzerligi MVP icin yeterlidir; ancak urunun
savunulabilir kaynagi semantik olay eslesmesi olmalidir. Bu katmanda buyuk LLM
cagrilarini ilk filtre olarak kullanmak maliyeti gereksiz buyutur.

Onerilen mimari:

- Haber basligi, kaynak, yayin zamani ve ilk paragraf icin hafif bir olay
  kaydi tutulur.
- Baslik + giris paragrafi `text-embedding-3-small` gibi dusuk maliyetli bir
  embedding modeliyle vektore cevrilir.
- Supabase Postgres uzerinde `pgvector` ile son 48 saatteki yakin olaylar
  cosine similarity ile bulunur.
- LLM sadece yeterli yakinliktaki haber kumesinin cerceve farkini ozetlemek
  icin kullanilir.
- Kumeleme sonucu `ayni olay`, `yakin olay`, `zayif eslesme` olarak ayrilir.

Bu yaklasim AI maliyetini kontrol ederken kaynak karsilastirma kalitesini
baslik token benzerliginin otesine tasir.

### Faz 3 Uygulama Notu - Semantik Olay Eslesmesi ve Paylasilabilir Rapor

Baslatilan kapsam:

- Supabase `pgvector` tabanli `article_events` semantik olay indeksi eklendi.
- Edge Function tarafina `relatedsources` action'i eklendi.
- Haber basligi ve acilis bolumunden `text-embedding-3-small` ile embedding
  uretilip son 48 saatteki yakin olaylar cosine similarity ile esleniyor.
- Background akisi, semantik eslesmeleri Google News RSS sonuclariyla
  birlestirip mevcut kaynak karsilastirma yuzeyine besliyor.
- Kaynak kartlarina semantik eslesme sinyali eklendi.
- Popup ve sidebar istatistik ekranlarinda haftalik medya diyeti raporu
  kopyalanabilir paylasim metnine donusturuldu.

Dogrulama notu:

- Vitest calistirildi.
- 5 test dosyasi ve 138 test basarili gecti.
- Deno CLI bu makinede PATH uzerinde olmadigi icin Edge Function Deno testleri
  yerelde calistirilamadi.

Gelismis ozellikler:

- "Bu kaynak olayi ekonomik acihan ele aliyor."
- "Bu kaynak politik sorumluluk cercevesinden veriyor."
- "Bu kaynak daha sansasyonel baslik kullaniyor."
- "Bu kaynak daha notr bir dil kullaniyor."

Basari metrikleri:

- Alternatif kaynak gosterilen haber orani.
- Kaynak karsilastirmasi acilma orani.
- Kaynaklara tiklama orani.
- Kullanici memnuniyet geri bildirimi.

Cikti:

"Ozetleyici"den "haber karsilastirma asistani"na gecis.

## Faz 4: Kanal Genisletme

Amac: Chrome eklentisine sikismamak ve haber tuketiminin gercek kanallarina girmek.

Oncelik sirasi:

1. Web link analiz sayfasi
   - Kullanici haber linki yapistirir.
   - Sonuc alir.
   - Paylasilabilir analiz sayfasi olusabilir.

2. Telegram botu
   - Turkiye icin guclu kanal.
   - Kullanici link gonderir.
   - Bot ozet, ton ve kaynak karsilastirmasi dondurur.

3. Mobil paylasim akisi
   - PWA veya mobil uygulama ile desteklenebilir.
   - Kullanici telefonda haber linkini paylasarak analiz alir.

4. Sosyal medya link analizi
   - X gonderisi.
   - YouTube haber videosu.
   - Telegram veya sosyal paylasim linkleri.

Basari metrikleri:

- Chrome disi analiz orani.
- Telegram kullanici tekrar orani.
- Link paylasimindan gelen analiz sayisi.
- Mobil kullanim orani.

Cikti:

Urun davranis degistirmek yerine mevcut haber tuketim davranisina dahil olur.

## Faz 5: Monetization Deneyleri

Amac: Kullanicilarin neye para odeyecegini test etmek.

Yanlis monetization:

- "Daha cok ozet icin para ver."

Daha dogru monetization:

- "Daha iyi takip, karsilastirma, raporlama ve arsiv icin para ver."

Ucretsiz plan:

- Gunluk sinirli ozet.
- Temel ton analizi.
- Sinirli gecmis.
- Temel kaynak listesi.

Pro plan:

- Gelismis kaynak karsilastirma.
- Haftalik medya diyeti raporu.
- Konu takibi.
- Gelismis arsiv.
- Sinirsiz veya yuksek limit.
- PDF / paylasilabilir rapor.
- Oncelikli analiz.

Alternatif odeme modelleri:

- Kredi paketi.
- Aylik abonelik.
- Profesyonel rapor paketi.
- Ekip hesabi.

B2B / B2Pro adaylari:

- PR ajanslari.
- Icerik ekipleri.
- Gazeteciler.
- Akademisyenler.
- Finans arastirma ekipleri.
- Medya takip firmalari.

Basari metrikleri:

- Ucretsizden Pro'ya donusum.
- Kredi satin alma orani.
- Kullanici basina gelir.
- AI maliyeti / kullanici geliri orani.
- Ucretli kullanicilarin tekrar kullanim orani.

Cikti:

Kimin, hangi deger icin para odediginin gercek cevabi.

## Faz 6: Ekosistem ve Savunulabilirlik

Amac: Urunu kolay kopyalanabilir AI aracindan veri ve aliskanlik tabanli platforma donusturmek.

Ekosistem ozellikleri:

- Topluluk clickbait skoru.
- Kaynak profili.
- Kisisel medya skoru.
- Konu bazli gundem takibi.
- Kurumsal dashboard.
- Paylasilabilir analiz kartlari.
- Haftalik kamu gundemi raporlari.

Paylasilabilir medya diyeti raporlari:

- Haftalik clickbait maruziyeti.
- Kaynak cesitliligi ve en baskin kaynak.
- Duygusal ton dagilimi.
- Konu/kategori dagilimi.
- Anonim trend karsilastirmasi.

Bu raporlar urunun organik yayilim mekanizmasi olabilir; veri modeli ekran
goruntusuyle paylasilabilecek kisisel ama guvenli icgoruleri destekleyecek
sekilde kurgulanmalidir.

Savunulabilirlik kaynaklari:

- Kullanici gecmisi.
- Topluluk oylari.
- Kaynak profilleri.
- Kisisellestirilmis medya diyeti.
- Raporlama aliskanligi.
- Cok kanalli kullanim.

Cikti:

Urun sadece AI cagirisi yapan eklenti olmaktan cikar, kendi veri katmanina sahip medya zekasi urunune donusur.

## Ilk Uygulama Sirasi

Ilk gercek uygulama sirasi:

1. Urun konumlandirmasini netlestir.
2. Sonuc ekranini yeniden tasarla.
3. Bias dilini guvenli ve aciklanabilir hale getir.
4. Kaynak karsilastirmasini guclendir.
5. Medya diyeti panelini sade ama degerli hale getir.
6. Haftalik rapor mantigini ekle.
7. Web link analiz sayfasi veya Telegram botunu planla.
8. Monetization deneylerini sonra baslat.

## Sprint 1 Onerisi

Baslik:

Sprint 1: Sonuc Deneyimini Yeniden Konumlandirma

Sprint hedefi:

Kullanici bir haberi actiginda sadece "ozet" degil, "bu haber bana ne anlatiyor, nasil anlatiyor ve baska kim nasil anlatiyor?" sorularinin cevabini almali.

Sprint kapsam adaylari:

- Mevcut sonuc ekraninin envanteri.
- Sonuc ekraninda "Haberin Ozu", "Ton Sinyalleri", "Diger Kaynaklar" blok yapisi.
- Bias ve clickbait metinlerinin guvenli dile cekilmesi.
- Kaynak listesinin daha belirgin hale getirilmesi.
- Metrik event isimlerinin belirlenmesi.

Sprint disi kalacaklar:

- Mobil uygulama.
- Telegram botu.
- Kurumsal dashboard.
- Odeme sistemi.
- Kapsamli sosyal medya analizi.

### Sprint 1 Uygulama Notu - 2026-05-14

Baslatilan kapsam:

- Popup ve sidebar sonuc ekranlarinda "Haberin Ozu", "Ton ve Cerceve Sinyalleri", "Baslik Sinyali" ve "Baska Kaynaklar" diline gecildi.
- Bias analizi daha guvenli bir dille "kesin hukum degil, metinsel sinyal" olarak konumlandirildi.
- Kaynaklar bolumu ayri ve daha belirgin bir karsilastirma kartina tasindi.
- Onboarding ve extension aciklamasi "sadece ozet" yerine "oz, ton ve kaynak farki" vaadine cekildi.

Dogrulama notu:

- Locale JSON dosyalari ve manifest parse edildi.
- Vitest calistirilamadi; bu PowerShell oturumunda `node` / `npm` PATH uzerinde bulunamadi.

### Sprint 1 Devam Notu - Kaynak Karsilastirma Yuzeyi

Baslatilan kapsam:

- "Baska Kaynaklar" listesi baslik + kaynak metadata yapisina tasindi.
- Bos kaynak durumunda bolum sessizce kaybolmak yerine neden alternatif kaynak bulunamadigini acikliyor.
- Popup ve sidebar icin kaynak karti stili hizalandi.
- Mevcut haberin kendi linki alternatif kaynak listesine dusmesin diye RSS/API kaynaklari filtrelenmeye baslandi.

Sonraki gelistirme adayi:

- Baslik farki, ton farki ve kaynak cercevesi icin dusuk maliyetli bir "karsilastirma notu" uretmek.
- Kaynaklari ayni olay / yakin olay / zayif eslesme gibi siniflandirmak.

### Sprint 1 Devam Notu - Dusuk Maliyetli Kaynak Sinyalleri

Baslatilan kapsam:

- Kaynak kartlarina AI maliyeti yaratmayan sinyal rozetleri eklendi.
- Ayni hosttan gelen kaynaklar "Ayni kaynak" olarak isaretleniyor.
- Baslik token benzerligi yeterli olan haberler "Yakin eslesme" olarak isaretleniyor.
- Zayif baslik benzerligi olan haberlerde "Cerceveyi kontrol et" uyarisi veriliyor.
- Popup ve sidebar rozet stilleri hizalandi.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 62 test basarili gecti.

### Faz 2 Baslangic Notu - Medya Diyeti Ozeti

Baslatilan kapsam:

- Istatistikler ekranina "Medya Diyetim" ozeti eklendi.
- Haftalik kaynak sayisi, kaynak cesitliligi skoru, en baskin kaynak ve duygusal maruziyet sinyali hesaplanmaya baslandi.
- Popup ve sidebar istatistik ekranlarinda ayni medya diyeti karti gosteriliyor.
- Kaynak cesitliligi ve medya diyeti hesaplamalari saf helper olarak testlendi.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 67 test basarili gecti.

### Faz 2 Devam Notu - Medya Diyeti Onerileri

Baslatilan kapsam:

- Medya diyeti kartina aksiyon alinabilir oneriler eklendi.
- Dar kaynak cesitliliginde alternatif kaynak ekleme onerisi veriliyor.
- Yuksek duygusal maruziyette daha sakin kaynakla karsilastirma onerisi veriliyor.
- Tek kaynagin haftaya baskin oldugu durumlarda dengeleme onerisi gosteriliyor.
- Kaynak cesitliligi saglikli oldugunda olumlu ama sade bir durum sinyali veriliyor.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 70 test basarili gecti.

### Faz 2 Devam Notu - Haftalik Konu Dagilimi

Baslatilan kapsam:

- Ozet sonucunda gelen keyword'ler gunluk istatistiklere konu sinyali olarak kaydedilmeye baslandi.
- Haftalik istatistik toplama akisina `topics` agregasyonu eklendi.
- Popup ve sidebar istatistik ekranlarina "En Cok Takip Edilen Konular" karti eklendi.
- Konular etiket/chip yapisinda, okunabilir ve kompakt gosteriliyor.
- Konu siralama helper'i test edildi.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 73 test basarili gecti.

### Faz 2 Devam Notu - Kaydet ve Arsiv Baslangici

Baslatilan kapsam:

- Sonuc ekranina "Kaydet" aksiyonu eklendi.
- Kaydedilen haberler `savedArticles` deposunda history'den ayri tutulmaya baslandi.
- Popup ve sidebar ana ekranlarina "Kaydedilenler" bolumu eklendi.
- Kaydedilen haberler tekrar acildiginda sonuc ekraninda gosteriliyor.
- Ayni haber ikinci kez kaydedilmiyor; mevcut kayit one aliniyor.
- Gunluk limit dolu olsa bile kaydedilmis haberler varsa ana ekran kullanilabilir kaliyor.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 73 test basarili gecti.

### Faz 2 Devam Notu - Clickbait Maruziyeti

Baslatilan kapsam:

- Clickbait oylari artik sadece toplam oy olarak degil, `clickbaitYes` ve `clickbaitNo` olarak da gunluk istatistiklere isleniyor.
- Haftalik istatistik toplama akisina clickbait evet/hayir toplamları eklendi.
- Medya Diyeti kartina clickbait maruziyeti sinyali eklendi.
- Clickbait maruziyeti yuksekse kullaniciya basliklari paylasmadan once karsilastirma onerisi veriliyor.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 76 test basarili gecti.

### Faz 2 Devam Notu - Ana Ekran Haftalik Medya Raporu

Baslatilan kapsam:

- Popup ve sidebar ana ekranlarina haftalik medya raporu karti eklendi.
- Kart, haftalik okuma hacmini ve Medya Diyeti motorundan gelen en onemli oneriyi gosteriyor.
- Haftalik rapor sadece kullanicinin bu hafta verisi varsa gorunuyor.
- Rapor detay aksiyonu mevcut detayli istatistik ekranina baglandi.
- Gunluk rapor, haftalik rapor, streak ve istatistik ekrani ayni veri hikayesinin parcasi haline getirildi.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 76 test basarili gecti.

### Faz 3 Baslangic Notu - Kaynak Cerceve Notlari

Baslatilan kapsam:

- Kaynak karsilastirma kartlarina dusuk maliyetli cerceve notu eklendi.
- Baslik kelime secimine gore ekonomik, politik, hukuki, guvenlik ve sansasyonel cerceve sinyalleri yakalanmaya baslandi.
- Ayni kaynak ve yakin eslesme durumlarinda kullaniciya nasil yorumlamasi gerektigini soyleyen kisa notlar gosteriliyor.
- Popup ve sidebar kaynak karti stilleri ayni yapiya getirildi.
- Cerceve tespiti saf helper olarak test edildi; ek AI maliyeti olusturmuyor.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 79 test basarili gecti.

### Faz 3 Devam Notu - Kaynak Karsilastirma Ozeti

Baslatilan kapsam:

- Baska Kaynaklar bolumune kaynak karsilastirma ozeti eklendi.
- Ozet, kac bagimsiz kaynak bulundugunu ve kac kaynagin yakin eslesme oldugunu gosteriyor.
- Alternatif basliklardan yakalanan ekonomik, politik, hukuki, guvenlik ve sansasyonel cerceveler topluca listeleniyor.
- Popup ve sidebar icin ayni ozet yuzeyi ve stilleri eklendi.
- Kaynak karsilastirma ozeti saf helper olarak test edildi; ek AI maliyeti olusturmuyor.

Dogrulama notu:

- Portable Node.js ile Vitest calistirildi.
- 4 test dosyasi ve 81 test basarili gecti.

## Red Team Riskleri ve Savunmalar

Risk: Urun nice-to-have kalir.

Savunma: Ozet yerine guven, kaynak karsilastirmasi ve medya diyeti farkindaligini merkeze almak.

Risk: Chrome eklentisi masaustu kullanima sikisir.

Savunma: Web link analiz sayfasi, Telegram botu ve mobil paylasim akisi planlamak.

Risk: AI maliyeti gelirden hizli buyur.

Savunma: Cache, tekrar kullanilan haber sonuclari, daha ucuz model katmanlari ve sinirli ucretsiz plan kullanmak.

Risk: Bias analizi tepki ve guven sorunu yaratir.

Savunma: Kesin hukum yerine metinsel sinyal dili kullanmak ve analiz metodolojisini aciklamak.

Risk: Kullanici "haber zaten ucretsiz" diyerek odeme yapmaz.

Savunma: "Daha fazla ozet" degil; rapor, arsiv, konu takibi, karsilastirma ve profesyonel is akisi icin odeme istemek.

Risk: Turkiye'de odeme ve guven esigi yuksek kalir.

Savunma: Gizlilik vaadini netlestirmek, kredi paketlerini denemek ve B2Pro segmentleri erken test etmek.
