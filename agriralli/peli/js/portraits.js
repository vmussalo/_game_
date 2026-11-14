/* AgriRalli – Hahmo- ja muotokuvajärjestelmä (Portraits & Driver Roster System)
   Piirtää dynaamiset, korkealaatuiset vektorimuotokuvat Canvasille.
   Tukee hahmojen rungon kustomointia (kaaret, rintavarustus, lantio, lihaskunto, asut)
   sekä Beach Mod: Bikini Edition -rantamuotia! */
(function () {
  'use strict';
  const AR = window.AR = window.AR || {};
  const U = AR.U || { TAU: Math.PI * 2, clamp: (v, min, max) => Math.max(min, Math.min(max, v)) };

  const P = AR.Portraits = {
    cache: new Map()
  };

  // Vakiomääritteet kuskien ulkonäölle
  P.SKINS = {
    fair: '#fbe4d0',
    peach: '#f7d3ba',
    tan: '#e8b896',
    bronze: '#c98a5e',
    pale: '#fff0e5',
    dark: '#8d5536'
  };

  P.HAIR_COLORS = {
    blonde: '#f7d779',
    pink: '#ff4f93',
    raven: '#202024',
    red: '#e64226',
    brunette: '#663d23',
    cyan: '#2cd5f0',
    silver: '#dce2ec',
    strawberry: '#f59267'
  };

  // Dystopia-teeman kuskien ulkonäköprofiilit (15 kuskia + pomo)
  // Enimmäkseen kauniita naisia, muutama karski mies
  P.ROSTER_DYSTOPIA = [
    { id: 'milla', name: 'Nitro-Milla', gender: 'f', skin: 'tan', hair: 'pink', hairStyle: 'ponytail', eye: '#2cd5f0', bust: 4, hips: 4, tone: 4, outfit: 3, beachSuit: '#ff2d75', quote: 'Paina kaasua tai haihdu savuna ilmaan!' },
    { id: 'ronja', name: 'Ronja Rautakissa', gender: 'f', skin: 'pale', hair: 'raven', hairStyle: 'bob', eye: '#39ff14', bust: 3, hips: 3, tone: 5, outfit: 3, beachSuit: '#111111', quote: 'Koneeni puree, ja minä puren kovempaa.' },
    { id: 'vanessa', name: 'Vanessa Viper', gender: 'f', skin: 'peach', hair: 'brunette', hairStyle: 'long', eye: '#b83dba', bust: 5, hips: 5, tone: 3, outfit: 2, beachSuit: '#8b008b', quote: 'Kauneus ja kuolema samassa paketissa.' },
    { id: 'cindy', name: 'Cindy Kipinä', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'twintails', eye: '#2890ff', bust: 4, hips: 3, tone: 3, outfit: 2, beachSuit: '#ffd700', quote: 'Katsotaan kestääkö maalit pintasi!' },
    { id: 'elena', name: 'Kyber-Elena', gender: 'f', skin: 'pale', hair: 'silver', hairStyle: 'bob', eye: '#ff00aa', bust: 3, hips: 4, tone: 4, outfit: 3, beachSuit: '#00ffff', quote: 'Tarkkuus 99.8%. Tuhosi on varma.' },
    { id: 'pena', name: 'Pultti-Pena', gender: 'm', skin: 'tan', hair: 'brunette', hairStyle: 'beard', eye: '#444444', bust: 2, hips: 3, tone: 4, outfit: 1, beachSuit: '#335588', quote: 'Öljyä suoniin ja peltiä ruttuun!' },
    { id: 'jessica', name: 'Jessica Liekki', gender: 'f', skin: 'peach', hair: 'red', hairStyle: 'long', eye: '#ff8800', bust: 5, hips: 4, tone: 4, outfit: 3, beachSuit: '#ff3300', quote: 'Poltetaan tämä rata poroksi!' },
    { id: 'scarlett', name: 'Scarlett Ruusu', gender: 'f', skin: 'fair', hair: 'raven', hairStyle: 'ponytail', eye: '#aa0033', bust: 4, hips: 5, tone: 3, outfit: 2, beachSuit: '#880022', quote: 'Jälkeeni jää vain ruusunpunainen savu.' },
    { id: 'sanna', name: 'Sinkki-Sanna', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'bandana', eye: '#33aacc', bust: 3, hips: 3, tone: 5, outfit: 2, beachSuit: '#00cc88', quote: 'Hitsaan teidät toisiinne kiinni.' },
    { id: 'linda', name: 'Linda Aavikko', gender: 'f', skin: 'bronze', hair: 'strawberry', hairStyle: 'long', eye: '#d4aa00', bust: 4, hips: 4, tone: 5, outfit: 3, beachSuit: '#e69900', quote: 'Aavikon tuuli ei armoa tunne.' },
    { id: 'lasse', name: 'Lyijy-Lasse', gender: 'm', skin: 'tan', hair: 'raven', hairStyle: 'short', eye: '#222222', bust: 3, hips: 4, tone: 5, outfit: 1, beachSuit: '#444444', quote: 'Lyijy painaa ja murskaa.' },
    { id: 'minttu', name: 'Minttu Megawatti', gender: 'f', skin: 'fair', hair: 'cyan', hairStyle: 'twintails', eye: '#00ffff', bust: 3, hips: 3, tone: 3, outfit: 3, beachSuit: '#00e5ff', quote: 'Täydet voltit tankkiin ja menoksi!' },
    { id: 'aura', name: 'Aura Aave', gender: 'f', skin: 'pale', hair: 'raven', hairStyle: 'long', eye: '#7733bb', bust: 4, hips: 4, tone: 4, outfit: 2, beachSuit: '#4a0e4e', quote: 'Et ehdi nähdä minua ennen kuin olen ohi.' },
    { id: 'rauno', name: 'Romu-Rauno', gender: 'm', skin: 'tan', hair: 'silver', hairStyle: 'cap', eye: '#555555', bust: 3, hips: 4, tone: 4, outfit: 1, beachSuit: '#556633', quote: 'Nuoret hosuu, vanha rauta jyrää.' },
    { id: 'tara', name: 'Tara Torpeedo', gender: 'f', skin: 'peach', hair: 'red', hairStyle: 'bob', eye: '#00bb66', bust: 4, hips: 5, tone: 5, outfit: 3, beachSuit: '#ff0055', quote: 'Suora linja maaliin kaiken läpi!' }
  ];

  // Kyläraitti-teeman kuskien ulkonäköprofiilit (15 kuskia + pomo)
  P.ROSTER_KYLA = [
    { id: 'sini', name: 'Sini Peltoprinsessa', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'ponytail', eye: '#2277ee', bust: 4, hips: 4, tone: 3, outfit: 2, beachSuit: '#4488ff', quote: 'Traktori keulii ja letti liehuu!' },
    { id: 'kyllikki', name: 'Emäntä Kyllikki', gender: 'f', skin: 'peach', hair: 'brunette', hairStyle: 'bun', eye: '#884422', bust: 5, hips: 5, tone: 2, outfit: 1, beachSuit: '#dd2255', quote: 'Tästä ei ohi mennä ilman lupaa!' },
    { id: 'kirsi', name: 'Kioski-Kirsi', gender: 'f', skin: 'fair', hair: 'strawberry', hairStyle: 'long', eye: '#33aacc', bust: 4, hips: 3, tone: 3, outfit: 2, beachSuit: '#ff66aa', quote: 'Jäätelö sulaa jos et aja kovempaa!' },
    { id: 'tytti', name: 'Tilan Tytti', gender: 'f', skin: 'tan', hair: 'brunette', hairStyle: 'twintails', eye: '#33aa44', bust: 3, hips: 4, tone: 5, outfit: 2, beachSuit: '#22bb77', quote: 'Pellot on kynnetty ja kisa on auki!' },
    { id: 'minttuk', name: 'Minttu Mansikka', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'bob', eye: '#22aacc', bust: 3, hips: 3, tone: 3, outfit: 2, beachSuit: '#ff4466', quote: 'Kesäasukkaan terveiset takapuskuriin!' },
    { id: 'hakkarainen', name: 'Isäntä Hakkarainen', gender: 'm', skin: 'tan', hair: 'red', hairStyle: 'cap', eye: '#553311', bust: 3, hips: 4, tone: 4, outfit: 1, beachSuit: '#335533', quote: 'Kunnan raitilla määrään minä.' },
    { id: 'jasmin', name: 'Jasmin Heinäneito', gender: 'f', skin: 'peach', hair: 'raven', hairStyle: 'long', eye: '#553311', bust: 5, hips: 5, tone: 4, outfit: 3, beachSuit: '#ffaa00', quote: 'Heinät pölisee ja sydämet särkyy.' },
    { id: 'leena', name: 'Lypsy-Leena', gender: 'f', skin: 'peach', hair: 'brunette', hairStyle: 'bun', eye: '#2288bb', bust: 5, hips: 4, tone: 3, outfit: 2, beachSuit: '#ff3388', quote: 'Aamulypsy on tehty, nyt ajetaan!' },
    { id: 'ronjar', name: 'Ronja Rämeeltä', gender: 'f', skin: 'tan', hair: 'raven', hairStyle: 'bandana', eye: '#22aa66', bust: 3, hips: 4, tone: 5, outfit: 3, beachSuit: '#226633', quote: 'Suon silmä ei pelota yhtään.' },
    { id: 'mattila', name: 'Vanha-Mattila', gender: 'm', skin: 'tan', hair: 'silver', hairStyle: 'beard', eye: '#333333', bust: 2, hips: 3, tone: 3, outfit: 1, beachSuit: '#665544', quote: 'Vaarin opeilla maaliin asti.' },
    { id: 'tiia', name: 'Tiia Tanssilava', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'long', eye: '#3366dd', bust: 4, hips: 4, tone: 4, outfit: 3, beachSuit: '#ff2299', quote: 'Lavatanssien nopein tango!' },
    { id: 'sannas', name: 'Sanna Saunapiika', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'long', eye: '#2299cc', bust: 4, hips: 4, tone: 4, outfit: 2, beachSuit: '#ff7799', quote: 'Löylyä koneeseen ja ohi mennään!' },
    { id: 'mikko', name: 'Mopo-Mikko', gender: 'm', skin: 'fair', hair: 'brunette', hairStyle: 'cap', eye: '#333333', bust: 2, hips: 3, tone: 4, outfit: 1, beachSuit: '#2244aa', quote: 'Viri-pytyllä heittämällä ohi!' },
    { id: 'camilla', name: 'Camilla Kartano', gender: 'f', skin: 'pale', hair: 'brunette', hairStyle: 'bob', eye: '#8833aa', bust: 4, hips: 4, tone: 3, outfit: 3, beachSuit: '#770055', quote: 'Teidän romunne ei minun vauhtiini yllä.' },
    { id: 'suvi', name: 'Suvi Kesäheinä', gender: 'f', skin: 'fair', hair: 'blonde', hairStyle: 'twintails', eye: '#22bb55', bust: 3, hips: 4, tone: 4, outfit: 2, beachSuit: '#ffd000', quote: 'Kesäpäivän iloisin voittaja!' }
  ];

  P.BOSS_DYSTOPIA = { id: 'boss_dystopia', name: 'Rautaparoni', gender: 'm', skin: 'pale', hair: 'silver', hairStyle: 'short', eye: '#ff2200', bust: 4, hips: 5, tone: 5, outfit: 1, beachSuit: '#222222', quote: 'Minä omistan tämän areenan ja teidän sielunne.' };
  P.BOSS_KYLA = { id: 'boss_kyla', name: 'Kartanon Herra', gender: 'm', skin: 'peach', hair: 'silver', hairStyle: 'beard', eye: '#334466', bust: 3, hips: 4, tone: 3, outfit: 1, beachSuit: '#112244', quote: '17 kesää olen voittanut, eikä tämä tee poikkeusta.' };

  // Hae kuskin profiili
  P.getDriver = function (idxOrId, theme) {
    theme = theme || AR.themeId || 'dystopia';
    const list = theme === 'kyla' ? P.ROSTER_KYLA : P.ROSTER_DYSTOPIA;
    if (idxOrId === 'boss') return theme === 'kyla' ? P.BOSS_KYLA : P.BOSS_DYSTOPIA;
    if (typeof idxOrId === 'number') return list[idxOrId % list.length];
    const found = list.find(d => d.id === idxOrId || d.name === idxOrId);
    return found || list[0];
  };

  // Muotokuvan piirto Canvasille
  P.draw = function (canvas, d, opts) {
    if (!canvas) return;
    const ctx = canvas.getContext ? canvas.getContext('2d') : canvas;
    const W = canvas.width || (opts && opts.w) || 200;
    const H = canvas.height || (opts && opts.h) || 240;
    opts = opts || {};

    const isBeach = !!(opts.beach || (AR.Career && AR.Career.isBeachActive && AR.Career.isBeachActive()));
    const gender = d.gender || 'f';
    const skin = P.SKINS[d.skin] || d.skin || P.SKINS.peach;
    const hair = P.HAIR_COLORS[d.hair] || d.hair || P.HAIR_COLORS.blonde;
    const eyeCol = d.eye || '#3377dd';
    const bustLv = U.clamp(d.bust || 3, 1, 5);
    const hipsLv = U.clamp(d.hips || 3, 1, 5);
    const toneLv = U.clamp(d.tone || 3, 1, 5);
    const outfitLv = isBeach ? 4 : U.clamp((opts.outfitLv != null ? opts.outfitLv : d.outfit) || 2, 1, 4);
    const mainCol = opts.color || d.color || '#e04040';
    const expr = opts.expr || 'normal'; // 'normal', 'excited', 'aggressive', 'hurt', 'wrecked'

    ctx.save();
    ctx.clearRect(0, 0, W, H);

    // 1. Tausta (tyylikäs sädekehämallinen tausta)
    const bgGrad = ctx.createRadialGradient(W * 0.5, H * 0.45, 10, W * 0.5, H * 0.5, W * 0.75);
    if (isBeach) {
      bgGrad.addColorStop(0, '#ffe599');
      bgGrad.addColorStop(0.6, '#f6b26b');
      bgGrad.addColorStop(1, '#3d85c6');
    } else if (AR.themeId === 'kyla') {
      bgGrad.addColorStop(0, '#d9ead3');
      bgGrad.addColorStop(0.7, '#93c47d');
      bgGrad.addColorStop(1, '#38761d');
    } else {
      bgGrad.addColorStop(0, '#4a2511');
      bgGrad.addColorStop(0.7, '#24140d');
      bgGrad.addColorStop(1, '#0e0805');
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Aurinko tai vauhtiviivat taustalla
    if (isBeach) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(W * 0.85, H * 0.2, W * 0.25, 0, U.TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(0, H * 0.2 + i * 25);
        ctx.lineTo(W, H * 0.35 + i * 25);
        ctx.stroke();
      }
    }

    const cx = W * 0.5;
    const cy = H * 0.42;
    const sc = Math.min(W / 180, H / 210);

    ctx.translate(cx, cy);
    ctx.scale(sc, sc);

    // 2. Takahiukset (pitkille hiuksille)
    drawBackHair(ctx, d.hairStyle, hair, gender);

    // 3. Vartalo & Asu (kaulan, rintakehän ja lantion kustomointi)
    drawBody(ctx, gender, skin, bustLv, hipsLv, toneLv, outfitLv, mainCol, isBeach, d.beachSuit);

    // 4. Kasvot & Pää
    drawHead(ctx, skin, gender);

    // 5. Kasvonpiirteet: silmät, ripset, meikki, kulmat, nenä, suu
    drawFaceFeatures(ctx, skin, eyeCol, expr, gender);

    // 6. Etuhiukset & Tyyli
    drawFrontHair(ctx, d.hairStyle, hair, gender);

    // 7. Lisävarusteet (aurinkolasit, kukka, lippis, korut)
    drawAccessories(ctx, d, isBeach, mainCol);

    ctx.restore();
  };

  // Takahiusten piirto
  function drawBackHair(ctx, style, col, gender) {
    if (gender === 'm' && style !== 'long') return;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (style === 'twintails') {
      // Kaksi runsasta ponnaria sivuilla
      ctx.beginPath();
      ctx.ellipse(-38, 25, 16, 45, -0.2, 0, U.TAU);
      ctx.ellipse(38, 25, 16, 45, 0.2, 0, U.TAU);
      ctx.fill();
    } else if (style === 'ponytail') {
      // Yksi korkea ponnari toisella sivulla
      ctx.beginPath();
      ctx.ellipse(32, 20, 18, 48, 0.35, 0, U.TAU);
      ctx.fill();
    } else if (style === 'long' || style === 'bun') {
      // Pitkät aaltoilevat hiukset selässä
      ctx.beginPath();
      ctx.ellipse(0, 30, 48, 55, 0, 0, U.TAU);
      ctx.fill();
    } else if (style === 'bob') {
      ctx.beginPath();
      ctx.ellipse(0, 15, 42, 38, 0, 0, U.TAU);
      ctx.fill();
    }
  }

  // Vartalon, dekolteen, rintojen ja asun piirto
  function drawBody(ctx, gender, skin, bust, hips, tone, outfit, mainCol, isBeach, beachCol) {
    ctx.save();
    const isFemale = gender === 'f';
    const bustR = 14 + bust * 5.5; // Rintavarustuksen koko (kaaret)
    const hipW = 32 + hips * 4.5;   // Lantion leveys
    const shadowSkin = shadeColor(skin, -0.18);

    // Kaula
    ctx.fillStyle = shadowSkin;
    ctx.beginPath();
    ctx.rect(-11, 20, 22, 28);
    ctx.fill();

    // Solisluut ja kaulan varjo
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-11, 22);
    ctx.lineTo(11, 22);
    ctx.lineTo(16, 42);
    ctx.lineTo(-16, 42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = shadowSkin;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, 43); ctx.lineTo(-4, 46);
    ctx.moveTo(18, 43); ctx.lineTo(4, 46);
    ctx.stroke();

    // Olkapäät ja rintakehä (pohjaiho)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-45, 65);
    ctx.quadraticCurveTo(-25, 40, -14, 42);
    ctx.lineTo(14, 42);
    ctx.quadraticCurveTo(25, 40, 45, 65);
    ctx.lineTo(hipW, 110);
    ctx.lineTo(-hipW, 110);
    ctx.closePath();
    ctx.fill();

    if (isFemale) {
      // Rintojen kaaret ja dekoltee
      ctx.fillStyle = shadowSkin;
      // Cleavage shadow
      ctx.beginPath();
      ctx.moveTo(0, 52 + (5 - bust) * 2);
      ctx.lineTo(0, 85);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Rintakehän varjostus
      ctx.beginPath();
      ctx.arc(-bustR * 0.72, 68, bustR * 0.85, 0.2, Math.PI * 0.85);
      ctx.arc(bustR * 0.72, 68, bustR * 0.85, Math.PI * 0.15, 0.8);
      ctx.stroke();

      // Vatsan ja kylkien muodot (Tone / Abs)
      if (tone >= 3 && (outfit >= 3 || isBeach)) {
        ctx.strokeStyle = shadowSkin;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 88); ctx.lineTo(0, 105); // Vatsalinja
        if (tone >= 4) {
          ctx.moveTo(-7, 92); ctx.lineTo(-2, 94);
          ctx.moveTo(7, 92); ctx.lineTo(2, 94);
        }
        ctx.stroke();
      }

      // ASUT:
      const suitCol = isBeach ? (beachCol || '#ff3366') : mainCol;
      const trimCol = shadeColor(suitCol, -0.3);

      if (isBeach || outfit === 4) {
        // --- BIKINI EDITION ---
        ctx.fillStyle = suitCol;
        // Vasen ja oikea bikinikuppi
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(s * 3, 62);
          ctx.quadraticCurveTo(s * bustR * 1.05, 55, s * bustR * 0.9, 82);
          ctx.quadraticCurveTo(s * bustR * 0.45, 85, s * 4, 76);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = trimCol;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        // Bikinien ohuet narut kaulan taakse ja rintojen väliin
        ctx.strokeStyle = trimCol;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bustR * 0.6, 56); ctx.lineTo(-8, 38);
        ctx.moveTo(bustR * 0.6, 56); ctx.lineTo(8, 38);
        ctx.moveTo(-4, 72); ctx.lineTo(4, 72); // Keskisolmu
        ctx.stroke();
        // Koristeellinen kultarengas rintojen välissä
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(0, 72, 3, 0, U.TAU);
        ctx.fill();

      } else if (outfit === 3) {
        // --- NIUKKA RACER KORSETTI / MICRO-TOPPI ---
        ctx.fillStyle = suitCol;
        ctx.beginPath();
        ctx.moveTo(-bustR * 1.05, 60);
        ctx.lineTo(-bustR * 0.2, 70);
        ctx.lineTo(bustR * 0.2, 70);
        ctx.lineTo(bustR * 1.05, 60);
        ctx.lineTo(bustR * 0.9, 88);
        ctx.quadraticCurveTo(0, 94, -bustR * 0.9, 88);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = trimCol;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Olkaimet
        ctx.beginPath();
        ctx.moveTo(-bustR * 0.8, 62); ctx.lineTo(-14, 44);
        ctx.moveTo(bustR * 0.8, 62); ctx.lineTo(14, 44);
        ctx.stroke();

      } else if (outfit === 2) {
        // --- TIUKKA KISAPUKU (SYVÄ VETOKETJU) ---
        ctx.fillStyle = suitCol;
        ctx.beginPath();
        ctx.moveTo(-44, 65);
        ctx.lineTo(-16, 44);
        ctx.lineTo(-8, 58);
        ctx.lineTo(0, 75); // Avoin v-aukko
        ctx.lineTo(8, 58);
        ctx.lineTo(16, 44);
        ctx.lineTo(44, 65);
        ctx.lineTo(hipW, 110);
        ctx.lineTo(-hipW, 110);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, 75); ctx.lineTo(0, 110); // Vetoketju
        ctx.stroke();

      } else {
        // --- KLASSINEN AJOASU / HAALARI ---
        ctx.fillStyle = suitCol;
        ctx.beginPath();
        ctx.moveTo(-45, 65);
        ctx.lineTo(-14, 44);
        ctx.lineTo(0, 52);
        ctx.lineTo(14, 44);
        ctx.lineTo(45, 65);
        ctx.lineTo(hipW, 110);
        ctx.lineTo(-hipW, 110);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = trimCol;
        ctx.beginPath();
        ctx.moveTo(-14, 44); ctx.lineTo(0, 52); ctx.lineTo(14, 44); ctx.lineTo(16, 49); ctx.lineTo(0, 58); ctx.lineTo(-16, 49); ctx.closePath();
        ctx.fill();
      }

    } else {
      // Mieshahmon asu
      if (isBeach) {
        // Rantashortsit / paljas lihaksikas rintakehä
        ctx.strokeStyle = shadowSkin;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-14, 62, 16, 0.4, 2.2); // Rintalihas vasen
        ctx.arc(14, 62, 16, 1.0, 2.8);  // Rintalihas oikea
        ctx.stroke();
        // Vatsalihakset
        ctx.beginPath();
        ctx.moveTo(0, 75); ctx.lineTo(0, 105);
        ctx.moveTo(-10, 85); ctx.lineTo(10, 85);
        ctx.moveTo(-9, 97); ctx.lineTo(9, 97);
        ctx.stroke();
      } else {
        ctx.fillStyle = mainCol;
        ctx.beginPath();
        ctx.moveTo(-46, 65);
        ctx.lineTo(-14, 44);
        ctx.lineTo(0, 50);
        ctx.lineTo(14, 44);
        ctx.lineTo(46, 65);
        ctx.lineTo(hipW, 110);
        ctx.lineTo(-hipW, 110);
        ctx.closePath();
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // Kasvojen muoto ja leuka
  function drawHead(ctx, skin, gender) {
    ctx.fillStyle = skin;
    ctx.beginPath();
    if (gender === 'm') {
      // Leveämpi, karskimpi leuka
      ctx.moveTo(-26, -10);
      ctx.quadraticCurveTo(-28, 15, -16, 28);
      ctx.lineTo(16, 28);
      ctx.quadraticCurveTo(28, 15, 26, -10);
      ctx.quadraticCurveTo(26, -34, 0, -36);
      ctx.quadraticCurveTo(-26, -34, -26, -10);
    } else {
      // Siro, viehättävä naisen leuka
      ctx.moveTo(-24, -10);
      ctx.quadraticCurveTo(-25, 12, -10, 26);
      ctx.quadraticCurveTo(0, 31, 10, 26);
      ctx.quadraticCurveTo(25, 12, 24, -10);
      ctx.quadraticCurveTo(24, -34, 0, -36);
      ctx.quadraticCurveTo(-24, -34, -24, -10);
    }
    ctx.fill();

    // Korvat
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 25, 3, 4, 8, s * 0.1, 0, U.TAU);
      ctx.fill();
    }
  }

  // Kasvonpiirteet: silmät, ripset, meikki, poskipuna, suu
  function drawFaceFeatures(ctx, skin, eyeCol, expr, gender) {
    const isFemale = gender === 'f';

    // 1. Poskipuna (Blush)
    if (isFemale) {
      ctx.fillStyle = 'rgba(255, 90, 120, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-14, 12, 7, 4, -0.1, 0, U.TAU);
      ctx.ellipse(14, 12, 7, 4, 0.1, 0, U.TAU);
      ctx.fill();
    }

    // 2. Silmät
    for (const s of [-1, 1]) {
      const ex = s * 12;
      const ey = 3;

      if (expr === 'wrecked') {
        // Spiraali / ruksit silmissä
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
        ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
        ctx.stroke();
      } else {
        // Silmänvalkuainen
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 6.5, 5, 0, 0, U.TAU);
        ctx.fill();

        // Iiris
        ctx.fillStyle = eyeCol;
        ctx.beginPath();
        ctx.arc(ex, ey, 3.8, 0, U.TAU);
        ctx.fill();

        // Mustuainen
        ctx.fillStyle = '#111116';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2, 0, U.TAU);
        ctx.fill();

        // Valoheijastukset (Sparkle)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex - 1.3, ey - 1.3, 1.2, 0, U.TAU);
        ctx.arc(ex + 1.2, ey + 1.2, 0.7, 0, U.TAU);
        ctx.fill();

        // Rajaus ja ripset (Eyeliner & lashes)
        ctx.strokeStyle = '#1b1b22';
        ctx.lineWidth = isFemale ? 2.2 : 1.4;
        ctx.beginPath();
        ctx.arc(ex, ey - 0.5, 6.2, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();

        if (isFemale) {
          // Kauniit yläripset
          ctx.beginPath();
          ctx.moveTo(ex + s * 5, ey - 3.5);
          ctx.lineTo(ex + s * 8, ey - 5.5);
          ctx.stroke();
        }
      }

      // Kulmakarvat
      ctx.strokeStyle = '#3a2012';
      ctx.lineWidth = isFemale ? 1.5 : 2.5;
      ctx.beginPath();
      if (expr === 'aggressive') {
        ctx.moveTo(ex - s * 5.5, ey - 9);
        ctx.lineTo(ex + s * 6.5, ey - 7);
      } else if (expr === 'hurt') {
        ctx.moveTo(ex - s * 5.5, ey - 6.5);
        ctx.lineTo(ex + s * 6.5, ey - 9);
      } else {
        ctx.moveTo(ex - s * 6, ey - 7.5);
        ctx.quadraticCurveTo(ex, ey - 9.5, ex + s * 6, ey - 7.5);
      }
      ctx.stroke();
    }

    // 3. Nenä
    ctx.strokeStyle = shadeColor(skin, -0.22);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(1.5, 11);
    ctx.lineTo(-0.5, 12);
    ctx.stroke();

    // 4. Suu & Huulet
    if (isFemale) {
      if (expr === 'excited') {
        // Iloinen hymyilevä suu auki
        ctx.fillStyle = '#cc2244';
        ctx.beginPath();
        ctx.arc(0, 19, 5, 0.1, Math.PI - 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2.5, 19, 5, 2);
      } else if (expr === 'hurt') {
        ctx.fillStyle = '#cc3355';
        ctx.beginPath();
        ctx.arc(0, 19, 3, 0, U.TAU);
        ctx.fill();
      } else {
        // Suloinen huulipunahymy
        ctx.fillStyle = '#e83e65';
        ctx.beginPath();
        ctx.moveTo(-5, 18);
        ctx.quadraticCurveTo(0, 21, 5, 18);
        ctx.quadraticCurveTo(0, 19.5, -5, 18);
        ctx.fill();
        ctx.strokeStyle = '#c42045';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    } else {
      // Mies: karski viiva tai virne
      ctx.strokeStyle = '#4a2511';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-5, 20);
      ctx.lineTo(5, 20);
      ctx.stroke();
    }
  }

  // Etuhiukset (otsatukka, jakaus, etusuortuvat)
  function drawFrontHair(ctx, style, col, gender) {
    ctx.fillStyle = col;
    const highlight = shadeColor(col, 0.25);

    ctx.beginPath();
    if (gender === 'm') {
      if (style === 'beard') {
        // Parta ja viikset
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.ellipse(0, 24, 18, 12, 0, 0, U.TAU);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, -22, 28, 14, 0, 0, U.TAU);
      ctx.fill();
      return;
    }

    // Naisille muodikkaat otsahiukset ja etusuortuvat
    ctx.beginPath();
    // Otsatukka / otsakiehkurat
    ctx.moveTo(-28, -8);
    ctx.quadraticCurveTo(-14, -28, 0, -26);
    ctx.quadraticCurveTo(14, -28, 28, -8);
    ctx.quadraticCurveTo(18, -12, 10, -5);
    ctx.quadraticCurveTo(2, -18, -6, -8);
    ctx.quadraticCurveTo(-18, -16, -28, -8);
    ctx.closePath();
    ctx.fill();

    // Poskien sivuilla laskeutuvat etusuortuvat
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 24, -10);
      ctx.quadraticCurveTo(s * 28, 10, s * 22, 35);
      ctx.quadraticCurveTo(s * 25, 15, s * 21, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Hiusten kiiltokaari (Anime sheen)
    ctx.fillStyle = highlight;
    ctx.beginPath();
    ctx.ellipse(0, -22, 20, 3, 0, 0, U.TAU);
    ctx.fill();
  }

  // Lisävarusteet (aurinkolasit, kukka, lippis, korvikset)
  function drawAccessories(ctx, d, isBeach, mainCol) {
    if (isBeach) {
      // Rantakukka hiuksissa
      ctx.fillStyle = '#ff3366';
      for (let a = 0; a < 5; a++) {
        const ang = a * (U.TAU / 5);
        ctx.beginPath();
        ctx.arc(22 + Math.cos(ang) * 5, -16 + Math.sin(ang) * 5, 4, 0, U.TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(22, -16, 3, 0, U.TAU);
      ctx.fill();

      // Tyylikkäät aurinkolasit otsalla
      ctx.fillStyle = '#222222';
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-12, -26, 9, 6, 0.05, 0, U.TAU);
      ctx.ellipse(12, -26, 9, 6, -0.05, 0, U.TAU);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-3, -26); ctx.lineTo(3, -26);
      ctx.stroke();

    } else if (d.hairStyle === 'cap') {
      // Lippalakki
      ctx.fillStyle = mainCol;
      ctx.beginPath();
      ctx.ellipse(0, -26, 30, 14, 0, Math.PI, U.TAU);
      ctx.fill();
      // Lippalakin lippa
      ctx.fillStyle = shadeColor(mainCol, -0.2);
      ctx.beginPath();
      ctx.ellipse(0, -24, 32, 6, 0, 0, Math.PI);
      ctx.fill();
    }

    // Korvakorut naisille
    if (d.gender === 'f') {
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(-26, 9, 2.2, 0, U.TAU);
      ctx.arc(26, 9, 2.2, 0, U.TAU);
      ctx.fill();
    }
  }

  // Apufunktio värisävyn tummentamiseen/vaaleentamiseen
  function shadeColor(color, percent) {
    let R = 128, G = 128, B = 128;
    if (color && color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      if (color.length === 7) {
        R = (num >> 16); G = (num >> 8) & 0x00FF; B = num & 0x0000FF;
      } else if (color.length === 4) {
        R = ((num >> 8) & 0xF) * 17; G = ((num >> 4) & 0xF) * 17; B = (num & 0xF) * 17;
      }
    }
    R = Math.round(U.clamp(R * (1 + percent), 0, 255));
    G = Math.round(U.clamp(G * (1 + percent), 0, 255));
    B = Math.round(U.clamp(B * (1 + percent), 0, 255));
    return 'rgb(' + R + ',' + G + ',' + B + ')';
  }

  P.shadeColor = shadeColor;
})();
