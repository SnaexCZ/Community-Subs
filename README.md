# 🎬 Community Subs (Stremio Addon)

Tento doplněk pro [Stremio](https://www.stremio.com/) automaticky vyhledává a stahuje **české a slovenské titulky** k seriálům a anime.

Data jsou získávána ("scrapována") přímo ze stránky [svetserialu.io](https://svetserialu.io).

## ⚠️ Důležité: Požadavek na Premium

Pro správnou funkčnost doplňku je vyžadován **Premium účet** na webu *svetserialu.io*.
Bez premium účtu stránka obsahuje agresivní reklamy a vyskakovací okna, která brání robotovi (Puppeteer) ve správném načtení titulků.

Doplněk se musí přihlásit vaším jménem pomocí **Cookies**.

---

## 🔐 Konfigurace (Jak nastavit Cookies)

Aby doplněk fungoval, musíte mu předat své přihlašovací údaje.

**Jak získat Cookie řetězec:**
1.  Jděte na `svetserialu.io` a přihlaste se.
2.  Stiskněte `F12` (otevře se vývojářská konzole).
3.  Přejděte na záložku **Network** (Síť).
4.  Obnovte stránku (`F5`).
5.  Klikněte na první požadavek v seznamu (název domény `svetserialu.io`).
6.  Vpravo v sekci **Request Headers** najděte řádek **Cookie**.
7.  Zkopírujte celý text za dvojtečkou (vypadá cca takto: `PHPSESSID=xyz123...; uid=...`).

---

## 🚀 Jak spustit vlastní instanci

Aby vám doplněk fungoval spolehlivě a měli jste nad ním kontrolu, doporučujeme vytvořit si vlastní instanci.

### Možnost A: Hugging Face (Zdarma & Doporučeno) ✅
Hugging Face Spaces nabízí v bezplatné verzi dostatek RAM (16GB), aby Puppeteer běžel stabilně.

1.  **Stáhněte si tento repozitář:**
    * Klikněte na zelené tlačítko **<> Code** na tomto GitHubu a zvolte **Download ZIP**.
    * ZIP soubor v počítači rozbalte.
2.  Přejděte na [Hugging Face](https://huggingface.co/new-space) a vytvořte nový **Space**:
    * **Space name:** Zvolte libovolný název (např. `moje-titulky`).
    * **License:** `MIT`.
    * **Space SDK:** Vyberte **Docker** (Blank).
    * Klikněte na **Create Space**.
3.  **Nahrajte soubory:**
    * V novém Space klikněte nahoře na záložku **Files**.
    * Klikněte na tlačítko **Add file** -> **Upload files**.
    * Přetáhni tam soubory `index.js`, `package.json` a `Dockerfile` z rozbalené složky.
    * Dole klikněte na **Commit changes to main**.
4.  **Nastavte Cookies (Secret):**
    * Klikněte nahoře na záložku **Settings**.
    * Najděte sekci **Variables and secrets**.
    * Klikněte na **New Secret**.
    * **Name:** `COOKIE`
    * **Value:** (Vložte zkopírovaný řetězec z kroku "Konfigurace").
5.  Space se automaticky restartuje a po chvíli (až zmizí "Building") bude funkční.

### Možnost B: Lokálně / VPS (Docker)

```bash
# 1. Stáhněte repozitář
git clone [https://github.com/SnaexCZ/Community-Subs.git](https://github.com/SnaexCZ/Community-Subs.git)
cd Community-Subs

# 2. Sestavte image
docker build -t community-subs .

# 3. Spusťte kontejner s nastavenou Cookie (nahraďte VASE_COOKIE_ZDE)
docker run -d -p 7000:7000 -e COOKIE="VASE_COOKIE_ZDE" --name community-subs community-subs

```

## 🔌 Instalace do Stremia

Jakmile máte doplněk spuštěný a máte jeho URL adresu (např. `https://vase-jmeno-space.hf.space`):

1.  Otevřete Stremio.
2.  Přejděte do sekce **Add-ons** (Doplňky).
3.  Do vyhledávacího řádku vložte URL adresu vašeho běžícího doplňku.
4.  Klikněte na **Install**.

---

## 📝 Licence

Tento projekt je open-source pod licencí **MIT**.
Slouží ke studijním účelům. Autor nenese odpovědnost za obsah stahovaný z třetích stran.
