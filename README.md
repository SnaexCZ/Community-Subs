# 🎬 Community Subs (Stremio Addon)

Tento doplněk pro [Stremio](https://www.stremio.com/) automaticky vyhledává a stahuje **české a slovenské titulky** k seriálům a anime.

Data jsou získávána ("scrapována") přímo ze stránky [svetserialu.io](https://svetserialu.io), což zajišťuje přístup ke komunitním titulkům, které často nejsou dostupné na OpenSubtitles.

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

### Možnost A: Hugging Face (Doporučeno) ✅
Hugging Face Spaces nabízí v bezplatné verzi dostatek RAM (16GB), aby Puppeteer běžel stabilně.

1.  Přihlaste se na **GitHub**.
2.  Vpravo nahoře na této stránce klikněte na tlačítko **Fork** (vytvoří se kopie tohoto repozitáře na vašem profilu).
3.  Přejděte na [Hugging Face](https://huggingface.co/) a vytvořte nový **Space**.
4.  Jako **Space SDK** vyberte **Docker**.
5.  V sekci "Repository" zvolte svůj **nově vytvořený (forknutý) GitHub repozitář**.
6.  Vytvořte Space.
7.  **DŮLEŽITÉ:** V nastavení Space (Settings) -> **Variables and secrets** klikněte na **New Secret**.
    * **Name:** `COOKIE`
    * **Value:** (Vložte zkopírovaný řetězec z kroku "Konfigurace")
8.  Space se restartuje a doplněk bude plně funkční.

### Možnost B: Lokálně / VPS (Docker)

# 1. Stáhněte repozitář
git clone [https://github.com/SnaexCZ/Community-Subs.git](https://github.com/SnaexCZ/Community-Subs.git)
cd Community-Subs

# 2. Sestavte image
docker build -t community-subs .

# 3. Spusťte kontejner s nastavenou Cookie (nahraďte VASE_COOKIE_ZDE)
docker run -d -p 7000:7000 -e COOKIE="VASE_COOKIE_ZDE" --name community-subs community-subs


#Licence

Tento projekt je open-source pod licencí MIT.

Slouží ke studijním účelům. Autor nenese odpovědnost za obsah stahovaný z třetích stran.
