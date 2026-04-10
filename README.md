# TechBot – L1/L2/L3 AI Support System
## Technická dokumentácia & Inštalačný manuál

---

## 1. Prehľad architektúry

```
Frontend (GitHub Pages / static hosting)
    ↓ HTTPS POST
GAS Endpoint (Google Apps Script)
    ↓ Drive API / UrlFetch
Google Drive (KB, Config, Cases, Logs)
    ↓ AI API calls
Claude / GPT / Gemini
```

**Bezpečnostný princíp:** Žiadne API kľúče, PIN ani admin heslo sa nikdy nenachádzajú vo frontendovom kóde. Všetko citlivé je za GAS vrstvou v Script Properties.

---

## 2. Štruktúra projektu

```
techbot/
├── index.html                  – Hlavný HTML vstup
├── styles/
│   └── main.css                – Dark-mode design system
├── scripts/
│   ├── app.js                  – Hlavný controller (routing, stav, admin)
│   ├── auth.js                 – PIN & admin autentifikácia
│   ├── api.js                  – GAS komunikačná vrstva
│   └── offline-cache.js        – LocalStorage cache + sync queue
├── config-loader/
│   └── config.js               – Načítanie a cachovanie konfigurácie
├── components/
│   ├── ai-output.js            – Renderovanie AI výstupov (Kolo 1 & 2)
│   └── case-close.js           – Formulár uzatvorenia case-u
├── modules/
│   ├── hw.js                   – HW modul (kompletný flow)
│   ├── m365.js                 – M365/Win + factory pre ostatné moduly
│   ├── wifi.js                 – WiFi modul (stub)
│   ├── digi.js                 – DigiEDU modul (stub)
│   └── other.js                – Iný modul (stub)
├── gas/
│   └── Code.gs                 – Google Apps Script backend
├── config/
│   ├── app-config.json         – Konfigurácia (uložiť na Google Drive)
│   └── hardware-catalog.json   – Katalóg HW (uložiť na Google Drive)
└── kb/
    ├── KB_HW/                  – Dummy dáta HW knowledge base
    ├── KB_365/                 – Dummy dáta 365/Win knowledge base
    ├── KB_WIFI/                – Dummy dáta WiFi knowledge base
    └── KB_INE/                 – Šablóny, slovník, universal QA
```

---

## 3. Inštalácia – krok za krokom

### 3.1 Google Apps Script

1. Otvorte [script.google.com](https://script.google.com) a vytvorte nový projekt
2. Skopírujte obsah `gas/Code.gs` do editora
3. Uložte a prejdite do **Project Settings → Script Properties**
4. Pridajte tieto properties:

| Kľúč             | Hodnota                     |
|------------------|-----------------------------|
| `APP_PIN`        | váš 6-ciferný PIN           |
| `ADMIN_PASSWORD` | admin heslo                 |
| `CLAUDE_API_KEY` | sk-ant-...                  |
| `OPENAI_API_KEY` | sk-...  (ak používate GPT)  |
| `GEMINI_API_KEY` | AIza...  (ak používate Gemini)|

5. Kliknite **Deploy → New Deployment → Web App**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Skopírujte deployment URL

### 3.2 Google Drive – konfiguračné súbory

1. Otvorte priečinok [CONFIG](https://drive.google.com/drive/folders/1HqXvq0nB8E5ADwSDQutSEeSPhE94Llik)
2. Nahrajte `config/app-config.json` a `config/hardware-catalog.json`
3. Upravte `app-config.json` – nastavte správne hodnoty (AI provider, KB URL, atď.)

### 3.3 Inicializácia štruktúry priečinkov

1. V GAS editore spustite funkciu `initDriveFolderStructure()` jednorazovo
2. Skontrolujte priečinok KB_SET – malo by byť vytvorených 8 podpriečinkov

### 3.4 Frontend

1. Otvorte `config-loader/config.js`
2. Nahraďte `GAS_URL` vaším deployment URL z kroku 3.1
3. Nahrajte celý projekt na GitHub a zapnite **GitHub Pages**
   - Settings → Pages → Source: main branch, /root

### 3.5 Dummy KB dáta (voliteľné)

Nahrajte súbory z `kb/` na Google Drive do príslušných podpriečinkov v `KB_SET`:
- `kb/KB_HW/cases/*.json` → Drive: `KB_SET/KB_HW/cases/`
- `kb/KB_365/cases/*.json` → Drive: `KB_SET/KB_365/cases/`
- atď.

---

## 4. Tok aplikácie

```
[Login – PIN]
      ↓
[Hlavné menu]
      ↓
[Výber modulu] → HW / 365 / WiFi / DigiEDU / Iný
      ↓
[Popis problému + screenshot (opt.)]
      ↓
[AI Kolo 1] ─ Round A prompt → GAS → Claude/GPT/Gemini
      ↓
[Výstup: Rada + Tipy + Otázky + Príčiny + Odporúčania]
      ↓
[Označenie nepomohnutých kariet + doplnenie]
      ↓
[AI Kolo 2] ─ Round A2 prompt (spresnená diagnóza)
      ↓
[Ukončenie CASE]
      ├─ Výsledok: Vyriešené / Nevyriešené
      ├─ Text technika
      ├─ AI jazyková korekcia (Round B prompt)
      └─ Potvrdenie → Uloženie
            ↓
      [GAS saveCase]
            ├─ CASES/CASE-ID.json
            ├─ KB_MODULE/cases/
            ├─ KB_MODULE/faq/
            └─ LOGS/events-dnes.log
```

---

## 5. AI Prompty – štruktúra

### Round A – Kolo 1 (obsahové)
- Vstup: HW metadáta + popis problému + screenshot text + KB kontext
- Výstup: JSON so 5 sekciami (main_advice, quick_tips, questions, possible_causes, recommendations)
- Model: nastaviteľný v admin paneli (default: claude-sonnet-4-6)

### Round A2 – Kolo 2 (spresnenie)
- Vstup: pôvodný problém + označené nepomohnuté karty + doplňujúci text
- Výstup: čistý text (200–800 znakov) – finálna rada
- Model: rovnaký ako Round A

### Round B – Jazyková korekcia
- Vstup: surový text technika
- Výstup: gramaticky a štylisticky opravený slovenský text
- Model: nastaviteľný v admin paneli (môže byť iný/lacnejší)

---

## 6. Knowledge Base – pravidlá budovania

### Štruktúra každého KB záznamu (povinné polia)
```json
{
  "type": "case | faq | topic | template",
  "module": "KB_HW | KB_365 | KB_WIFI | KB_ADMIN | KB_WEB | KB_INE",
  "title": "krátky popis",
  "tags": ["tag1", "tag2"],
  "synonyms": ["alternatívny názov 1"],
  "created_at": "ISO timestamp"
}
```

### Pravidlá nasýtenosti témy
| Stav       | case_count | Pomer KB/Web |
|------------|-----------|--------------|
| `new`      | 0–2       | 50/50        |
| `growing`  | 3–9       | 60/40        |
| `saturated`| 10+       | 90/10        |

### Import externej KB
1. Pripravte JSON podľa schémy v `gas/Code.gs` (sekcia `_buildKBEntry`)
2. Nahrajte do Drive: `KB_SET/IMPORT/incoming-json/`
3. Spustite GAS funkciu `processImport()` (TODO: implementovať vo Fáze 2)

---

## 7. Offline režim

| Funkcia                     | Online | Offline |
|-----------------------------|--------|---------|
| Prihlásenie (cache PIN)     | ✓      | ✓*      |
| Prezeranie KB cache         | ✓      | ✓       |
| AI analýza                  | ✓      | ✗       |
| Ukladanie case-u            | ✓      | Queue   |
| Sync fronty                 | ✓      | —       |

*Offline prihlásenie funguje len ak bol PIN raz overený a je v lokálnej cache.

**Sync queue:** Ak nie je internet, case-y sa uložia do `localStorage` sync fronty. Po obnovení spojenia sa automaticky odošlú na GAS (prípadne manuálne cez Admin panel).

---

## 8. Admin panel

Dostupný po zadaní admin hesla cez tlačidlo ⚙ v headeri.

### Čo môže admin meniť
- AI provider a model pre Kolo A a Kolo B
- URL pre tlačidlo "Čítať KB"
- PIN (mení sa v GAS Script Properties)
- Admin heslo
- Manuálna synchronizácia offline fronty
- Vymazanie KB cache

### Script Properties (meniť priamo v GAS)
- `APP_PIN` – prístupový PIN
- `ADMIN_PASSWORD` – admin heslo
- `CLAUDE_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` – AI kľúče

---

## 9. MVP Fázy

### ✅ Fáza 1 (tento scaffold)
- [x] Login cez PIN
- [x] Hlavné menu
- [x] HW modul – kompletný flow (Kolo 1, Kolo 2, Ukončenie)
- [x] M365, WiFi, DigiEDU, Iný – základný flow
- [x] Ukladanie case-u cez GAS
- [x] Zápis do KB (cases + faq)
- [x] Admin panel (AI config, cache, sync)
- [x] Offline cache + sync queue
- [x] Tmavý dizajn (dark-mode tech)

### 🔲 Fáza 2
- [ ] FAQ generovanie (Round B) s automatickým zápisom
- [ ] Import JSON KB
- [ ] Export manuálu
- [ ] KB index viewer
- [ ] Web search integrácia do AI promptov

### 🔲 Fáza 3
- [ ] Nasýtenosť tém (saturation tracking)
- [ ] Prepojenia medzi KB knižnicami (cross-links)
- [ ] Pokročilé tagy a synonymá
- [ ] Logovanie a reporty
- [ ] Optimalizácia promptov podľa KB stavu

---

## 10. Dôležité bezpečnostné pravidlá

1. **GAS URL** je v `config-loader/config.js` – je viditeľná, ale to je OK. GAS endpointy sú chránené PINom a admin heslom.
2. **API kľúče nikdy** nesmú byť vo frontendovom kóde.
3. **PIN a admin heslo** sú v GAS Script Properties – nikdy nie v Drive súboroch.
4. **Screenshot** sa odosiela iba do AI API na analýzu, neukladá sa na Drive.
5. **Admin panel** vyžaduje druhú autentifikáciu (admin heslo) aj po prihlásení PINom.

---

## 11. Kontakt a ďalší rozvoj

Projekt je navrhnutý modulárne – každý modul (`hw.js`, `m365.js`, atď.) je nezávislý.
Nové moduly možno pridať jednoducho cez `_createStandardModule()` factory v `m365.js`.

Pre rozšírenie KB knižníc stačí nahrať nové JSON súbory do príslušných podpriečinkov na Google Drive.
