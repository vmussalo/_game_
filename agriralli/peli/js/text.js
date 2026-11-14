/* AgriRalli – kaikki pelin tekstit kahdelle teemalle.
   Rakenne on molemmissa teemoissa sama. Radan, kuskin ja koneen nimet haetaan indeksillä tai tunnisteella. */
(function () {
  'use strict';
  const AR = window.AR;

  const common = {
    ui: {
      continueCareer: 'Jatka uraa', newCareer: 'Uusi ura', quickRace: 'Pikakisa', help: 'Ohjeet', settings: 'Asetukset',
      back: 'Takaisin', start: 'Aloita', race: 'Aja kisa', buy: 'Osta', sell: 'Myy', repair: 'Korjaa',
      cash: 'Rahaa', rank: 'Sija', day: 'Päivä', debt: 'Velka', points: 'Pisteet',
      shop: 'Varikko', dealer: 'Konekauppa', races: 'Kisapäivä', standings: 'Sarjataulukko', menu: 'Päävalikko',
      laps: 'kierrosta', lap: 'Kierros', pos: 'Sija', place: ['1.', '2.', '3.', '4.', '5.', '6.'],
      prize: 'Palkinto', bounty: 'Tappopalkkio', pickups: 'Poimitut', total: 'Yhteensä',
      opponents: 'Vastustajat', yourName: 'Kuskinimesi', themeLbl: 'Teema',
      paused: 'Tauko', resume: 'Jatka', quit: 'Luovuta kisa', quitWarn: 'Luovutus = viimeinen sija, ei palkintoa.',
      wrecked: 'ROMUTETTU', finished: 'MAALI!', go: 'AJA!', lastLap: 'VIIMEINEN KIERROS!',
      hp: 'Kunto', ammo: 'Ammukset', soundOn: 'Äänet päällä', soundOff: 'Äänet pois', autoGas: 'Automaattikaasu (kosketus)',
      vehicle: 'Kone', track: 'Rata', opponentsN: 'Vastustajia', level: 'Viritystaso', owned: 'Oma',
      tradeIn: 'Vaihtohyvitys', maxed: 'Täynnä', notEnough: 'Rahat eivät riitä.', borrow: 'Lainaa', repay: 'Maksa',
      due: 'Eräpäivä', interest: 'Korko', saved: 'Tallennettu', standingsYou: 'Sinä',
      deleteSave: 'Aloitetaanko uusi ura? Nykyinen tallennus korvataan.',
      tooBroken: 'Kone on liian rikki kisaan. Korjaa se ensin.',
      speedUnit: 'km/h', skill: 'Taito', final: 'FINAALI',
      players: 'Pelaajat', twoPlayer: 'Kaksinpeli', p1: 'Pelaaja 1', p2: 'Pelaaja 2', vehicleP2: 'Pelaaja 2:n kone',
      driveMode: 'Ajotapa', modeNormal: 'Tavallinen', modeHooki: 'Täysi hööki',
      hookiDesc: 'Kaasu on koko ajan pohjassa kaikilla, jarrua ei ole. Turbo latautuu itsestään, joten sitä saa painaa reilusti. Jarrunappi peruuttaa vain, jos kone on jumissa.',
      keys2p: 'Pelaaja 1: WASD, ampuu välilyönti, turbo vasen Shift, miina Q, kauha E. Pelaaja 2: nuolet, ampuu piste (.), turbo viiva (-) tai oikea Shift, miina pilkku (,), kauha M. Peliohjaimet: ensimmäinen ohjain pelaaja 1:lle, toinen pelaaja 2:lle (yksi ohjain menee pelaaja 2:lle).',
      wins: '{a} voitti!', draw: 'Tasapeli – molemmat romuna!',
      beachMod: 'Beach Mod: Bikini Edition', beachUnlockedToast: '🏖️ BEACH MOD BIKINI EDITION AVATTU!',
      beachOn: '🏖️ Bikini Edition: PÄÄLLÄ', beachOff: '🏖️ Bikini Edition: POIS',
      bodymod: 'Runkotuunaus', bodymodSub: 'Kuskin rungon ja asun kustomointi',
      bust: 'Kaaret & Rintakehä', bustDesc: 'Aerodynaamiset muodot ja +10% sponsorituloja / taso.',
      hips: 'Lantio & Downforce', hipsDesc: 'Madallettu painopiste: lisää pitoa ja kääntymisvakautta.',
      tone: 'Tiukkuus & Lihaskunto', toneDesc: 'Korsetti ja ryhti: -5% törmäysvaurioita ja tarkempi ohjaus.',
      outfit: 'Ajoasun niukkuus', outfitDesc: 'Asun tyyli: Haalari → Tiukka kisapuku → Micro-korsetti → Bikini.',
      outfitNames: ['Haalari', 'Tiukka kisapuku', 'Micro-korsetti', 'Bikini Edition'],
      hair: 'Hiusväri', hairStyle: 'Hiustyyli', gender: 'Sukupuoli', female: 'Naiskuski', male: 'Mieskuski'
    },
    help: [
      ['Ajaminen', 'Nuolet tai WASD. Välilyönti tai Ctrl ampuu, Z tai C pudottaa miinan, Shift tai X polttaa turboa, V tai E käyttää erikoisliikettä (kaivinkoneen kauha). Esc tai P pitää tauon. Peliohjain toimii myös.'],
      ['Kosketus', 'Vasemman reunan napit ohjaavat. Oikealla ovat kaasu, jarru, ase ja pienet erikoisnapit. Automaattikaasun voi kytkeä pois asetuksista.'],
      ['Ura', 'Jokainen päivä on yksi kisa. Valitse kisa kolmesta sarjasta: helpon sarjan palkinnot ovat pienet, vaikean isot. Rahaa saa sijoituksesta, romutetuista vastustajista ja radalta poimituista rahapusseista.'],
      ['Kone', 'Vauriot säilyvät kisasta toiseen. Korjaa ja viritä kone varikolla. Konekaupasta saa järeämpää kalustoa, ja vanha kone menee vaihdossa puoleen hintaan.'],
      ['Sarja', 'Sijoituksista saa sarjapisteitä. Kun nouset sarjataulukon kärkeen, pääset finaaliin pomokuskia vastaan.'],
      ['Lainahai', 'Lainaa saa aina, mutta korko juoksee joka päivä. Jos eräpäivä ylittyy, perijät tulevat käymään.'],
      ['Kaksinpeli', 'Pikakisan voi ajaa kahdestaan samalla näppäimistöllä jaetulla ruudulla. Pelaaja 1: WASD, välilyönti ampuu, vasen Shift turbo, Q miina, E kauha. Pelaaja 2: nuolet, piste ampuu, viiva (-) tai oikea Shift turbo, pilkku miina, M kauha.'],
      ['Täysi hööki', 'Pikakisan ajotapa, jossa kaasu on koko ajan pohjassa kaikilla. Vain ohjataan, ammutaan ja poltetaan turboa, joka latautuu itsestään.']
    ]
  };

  const dystopia = Object.assign({}, common, {
    id: 'dystopia', label: 'Rosoinen dystopia',
    title: 'AGRIRALLI', sub: 'Romuralli maailmanlopun pelloilla',
    intro: 'Vuosi 2097. Pellot ovat kuonaa, ja ruoka kasvatetaan tehtaiden altaissa. Vanhoista maatalouskoneista on tullut viimeinen viihde: niillä ajetaan kilpaa ja ammutaan toisia hengiltä. Rautaparoni hallitsee rataa raudalla ja ruosteella. Sinulla on romutarhalta kaivettu ajoleikkuri ja tasku täynnä tyhjää.',
    cur: 'kr',
    veh: {
      leikkuri: ['Ruosteleikkuri', 'Romutarhalta kaivettu ajoleikkuri. Terät pyörivät yhä, vaikka nurmikkoa ei ole nähty 40 vuoteen. Kylkiterät purevat vierustoveria.'],
      monkija: ['Raunio-mönkijä', 'Kevyt ja nopea. Raunioissa kasvanut mönkijä hyppii kuonakasojen yli kuin rotta.'],
      pikkutraktori: ['Panssaritraktori', 'Pieni traktori, johon on hitsattu kaikki, mikä irtosi. Kestää ja vetää.'],
      kurottaja: ['Piikkikurottaja', 'Teleskooppikuormaaja. Piikit eivät ole enää lavoja varten. Rammaus satuttaa tuplasti.'],
      linkku: ['Linkku-Juggernaut', 'Runko-ohjattu nelivetojätti, joka kääntyy keskeltä kuin hirviö. Raskas, nopea ja vihainen.'],
      puimuri: ['Luupuimuri', 'Leikkuupöytä puimii nyt muuta kuin viljaa. Leveä, painava ja armoton keulasta.'],
      kaivinkone: ['Tuomiokaivuri', 'Teloilla kulkeva kaivinkone, jonka moottori on viritetty mielettömäksi. Kääntyy paikallaan, ja kauha heittää vastustajan pois radalta.']
    },
    upg: { engine: 'Moottori', tires: 'Renkaat', tracks: 'Telat', armor: 'Panssari', gun: 'Ase', ram: 'Puskupiikit' },
    upgDesc: {
      engine: 'Huippunopeus ja kiihtyvyys.', tires: 'Pito, ohjautuvuus ja vauhti radan ulkopuolella.',
      armor: 'Kestävyys: enemmän kuntopisteitä.', gun: 'Keula-ase. Jokainen taso on eri ase.', ram: 'Rammauksen vahinko.'
    },
    guns: ['ei asetta', 'Naulapyssy', 'Romuhaulikko', 'Niittitykki', 'Ketjutykki', 'Plasmaleikkuri'],
    cons: {
      ammo: ['Ammukset', '+40 laukausta'], mines: ['Miinat', '+2 kappaletta'], turbo: ['Nitro', '+2 sekuntia buustia'],
      repair: ['Hitsaus', 'Korjaa koneen täyteen kuntoon.'], tape: ['Rautalanka', 'Ilmainen hätäkorjaus 35 %:iin.']
    },
    special: { kauha: 'Kauha' },
    pickup: { cash: 'Krediittejä', repair: 'Hitsauspuikko', ammo: 'Ammuksia', turbo: 'Nitroa' },
    diff: ['Romusarja', 'Rautasarja', 'Kuolemansarja', 'Paronin areena'],
    boss: 'Rautaparoni',
    bossLine: 'Rautaparoni odottaa areenalla. Hänen kaivurinsa on nielaissut sata kuskia.',
    drivers: ['Nitro-Milla', 'Ronja Rautakissa', 'Vanessa Viper', 'Cindy Kipinä', 'Kyber-Elena', 'Pultti-Pena', 'Jessica Liekki', 'Scarlett Ruusu',
      'Sinkki-Sanna', 'Linda Aavikko', 'Lyijy-Lasse', 'Minttu Megawatti', 'Aura Aave', 'Romu-Rauno', 'Tara Torpeedo'],
    tracks: ['Kuonakaivos', 'Jäähdytystornit', 'Ruostesatama', 'Myrkkysuo', 'Romutarha', 'Lentokentän rauniot', 'Sulattamo',
      'Tuhkatasanko', 'Paronin areena'],
    shark: {
      name: 'Ruoste-Ruben',
      hello: 'Ruoste-Ruben nojaa tiskiin hampaat kiiltäen. "Rahaa tarvitset, rahaa saat. Korko on 6 % päivässä. Seitsemän päivää aikaa, sitten pojat tulevat käymään."',
      noDebt: 'Ei velkaa. Ruben näyttää pettyneeltä.',
      goons: 'Ruoste-Rubenin perijät kävivät! He hakkasivat koneesi lekoilla ja veivät yhden virityksen. Velka kasvoi 25 %.',
      max: 'Ruben pudistaa päätään: "Sinulla on jo tarpeeksi velkaa."'
    },
    sabotage: ['Hiekkaa vaihteistoon', 'Joku vastustajista lähtee kisaan puolikuntoisena.'],
    comment: {
      start: ['Kuona pöllyää: ajajat liikkeelle!', 'Areenan kaiuttimet räsähtävät: AJAKAA!', 'Taas ruoste lentää!'],
      wreck: ['{a} hajosi palasiksi!', '{a} on nyt romua.', '{a}: ruostetta ja savua.', 'Hyvästi, {a}.'],
      kill: ['{b} romutti kuskin {a}!', '{b} korjasi kuskin {a} kokoelmiinsa!', '{b} vei kuskilta {a} hengen ja pultit!'],
      lead: ['{a} kiilaa johtoon!', '{a} on nyt kärjessä!'],
      mine: ['{a} ajoi miinaan!', 'BUUM! {a} lensi ilmaan!'],
      kauha: ['{b} nosti kuskin {a} kauhalla!', 'Kauha iski! {a} lentää!'],
      playerWreck: ['Koneesi on romuna. Perämiehet keräävät palat.', 'Savua, liekkejä ja hiljaisuus.'],
      win: ['Voitto! Yleisö heittää pultteja.', 'Ensimmäinen! Paroni pani merkille.'],
      shark: 'Velka-muistutus: Ruben odottaa {d} päivää.'
    },
    results: [
      ['Voitit! Ruosteiset fanit huutavat nimeäsi.'],
      ['Toinen sija. Vielä ei pokata.'],
      ['Kolmas. Ainakin kone on vielä koossa.'],
      ['Viimeinen. Yleisö heittää sinua mädillä ruokakupongeilla.']
    ],
    ending: 'Rautaparonin kaivuri makaa kyljellään, ja kauha savuaa yhä. Areena hiljenee, sitten se räjähtää huutoon. Uusi Paroni olet sinä. Romuralli jatkuu, ja nyt kaikki jahtaavat sinua.',
    goonsVisit: 'Perijät'
  });

  const kyla = Object.assign({}, common, {
    id: 'kyla', label: 'Suomalainen kyläraitti',
    title: 'AGRIRALLI', sub: 'Kylän tiukin kesäkisa',
    intro: 'Heinäkuu, Ylä-Rämeen kunta. Kun kunnanvaltuusto kielsi mopoillan, kyläläiset keksivät jotain pahempaa: kesäralli tilan koneilla, peltoteillä ja naapurin pihan kautta. Kartanon Herra on voittanut kisan 17 kesää putkeen. Sinulla on vaarin vanha ajoleikkuri ja pikkuisen pontikkaa.',
    cur: 'mk',
    veh: {
      leikkuri: ['Vaarin ajoleikkuri', 'Ajoleikkuri 80-luvulta. Kun terät pyörivät, kylkikontakti leikkaa naapurin maalit.'],
      monkija: ['Mökkimönkijä', 'Kevyt ja vauhdikas. Sillä on ajettu kaikki kylän peltotiet, myös ne kielletyt.'],
      pikkutraktori: ['Pikku-Fergu', 'Pieni ja sisukas traktori. Jaksaa vetää, vaikka on jo sotien jälkeistä mallia.'],
      kurottaja: ['Kurottaja', 'Teleskooppikuormaaja, jonka piikit nostavat paalien lisäksi kilpakumppaneita. Rammaus sattuu tuplasti.'],
      linkku: ['Linkkuvolvo', 'Runko-ohjattu nelivetoinen. Kääntyy keskeltä kuin hauki, ja massaa on kuin navetassa.'],
      puimuri: ['Leikkuupuimuri', 'Leikkuupöytä kerää viljan ja vähän muutakin. Leveä, raskas ja pelottava keulasta.'],
      kaivinkone: ['Kunnan kaivuri', 'Lainattu kunnan varikolta, eikä kukaan kysynyt mitään. Kääntyy paikallaan, ja kauha nostaa naapurin ojaan.']
    },
    upg: { engine: 'Moottori', tires: 'Renkaat', tracks: 'Telat', armor: 'Peltipanssari', gun: 'Ase', ram: 'Etupiikit' },
    upgDesc: {
      engine: 'Huippunopeus ja kiihtyvyys.', tires: 'Pito, ohjautuvuus ja vauhti pellolla.',
      armor: 'Kestävyys: lisää peltiä ja enemmän kuntopisteitä.', gun: 'Keula-ase. Jokainen taso on eri ase.', ram: 'Rammauksen vahinko.'
    },
    guns: ['ei asetta', 'Herneampuja', 'Perunatykki', 'Kivilinko', 'Naulapyssy', 'Rautanaulakone'],
    cons: {
      ammo: ['Ammukset', '+40 laukausta'], mines: ['Lantakasat', '+2 kappaletta, pudotetaan perään'], turbo: ['Pontikka', '+2 sekuntia buustia'],
      repair: ['Korjaamo', 'Pajan Pena korjaa koneen täyteen kuntoon.'], tape: ['Jeesusteippi', 'Ilmainen hätäkorjaus 35 %:iin.']
    },
    special: { kauha: 'Kauha' },
    pickup: { cash: 'Markkoja', repair: 'Jakoavain', ammo: 'Perunoita', turbo: 'Pontikkaa' },
    diff: ['Kyläsarja', 'Pitäjänsarja', 'Mestarisarja', 'Kartanon kisa'],
    boss: 'Kartanon Herra',
    bossLine: 'Kartanon Herra odottaa kartanon pihatiellä kunnan kaivurissa. Hän ei ole hävinnyt 17 kesään.',
    drivers: ['Sini Peltoprinsessa', 'Emäntä Kyllikki', 'Kioski-Kirsi', 'Tilan Tytti', 'Minttu Mansikka', 'Isäntä Hakkarainen',
      'Jasmin Heinäneito', 'Lypsy-Leena', 'Ronja Rämeeltä', 'Vanha-Mattila', 'Tiia Tanssilava', 'Sanna Saunapiika', 'Mopo-Mikko',
      'Camilla Kartano', 'Suvi Kesäheinä'],
    tracks: ['Kirkonkylän raitti', 'Peltolohko 7', 'Navetan taus', 'Sorakuoppa', 'Turvesuo', 'Myllyn mutka', 'Kunnantie',
      'Rantasaunan polku', 'Kartanon pihatie'],
    shark: {
      name: 'Koron-Kalle',
      hello: 'Koron-Kalle istuu kioskin takahuoneessa kahvikuppi kädessä. "Rahaa saa. Korko on 6 % päivässä, ja maksuaikaa on viikko. Sitten tulee veljekset käymään."',
      noDebt: 'Ei velkaa. Kalle hörppää kahviaan pettyneenä.',
      goons: 'Koron-Kallen veljekset kävivät! Ne potkivat konettasi ja veivät yhden virityksen panttina. Velka kasvoi 25 %.',
      max: 'Kalle naurahtaa: "Ei enää. Sinulla on jo velkaa kuin kunnalla."'
    },
    sabotage: ['Sokeria tankkiin', 'Joku vastustajista lähtee kisaan puolikuntoisena.'],
    comment: {
      start: ['Lippu heilahtaa kirkon edessä: AJAKAA!', 'Kyläläiset kiljuvat ojanpientareella!', 'Pöly nousee: kesäralli on käynnissä!'],
      wreck: ['{a} ajoi ojaan ja jäi sinne!', '{a}: kone sileäksi.', 'Kyläläiset kantavat kuskia {a} saunaan toipumaan.', '{a} hajosi kuin vanha Lada.'],
      kill: ['{b} ajoi kuskin {a} ojaan!', '{b} romutti kuskin {a} koneen!', '{b} näytti kuskille {a} kylän tavat!'],
      lead: ['{a} kiilaa johtoon!', '{a} on nyt kärjessä!'],
      mine: ['{a} ajoi lantakasaan!', 'Litsis! {a} pyörii lannassa!'],
      kauha: ['{b} nosti kuskin {a} kauhalla ojaan!', 'Kauha heilahti! {a} lentää kuin heinäseiväs!'],
      playerWreck: ['Kone on romuna. Pajan Pena raapii päätään.', 'Savua, rytinää ja hiljaisuus. Joku huutaa "sauna lämpiää".'],
      win: ['Voitto! Mummot heiluttavat pipoa.', 'Ensimmäinen! Kartanossa kiristellään hampaita.'],
      shark: 'Kalle muistuttaa: eräpäivään {d} päivää.'
    },
    results: [
      ['Voitit! Kylän kahvilassa puhutaan tästä jouluun asti.'],
      ['Toinen sija. Ensi kerralla vähän pontikkaa lisää.'],
      ['Kolmas. Mitali on mitali, sanoi vaari.'],
      ['Viimeinen. Ojanpientareella kuuluu hiljaista hymähtelyä.']
    ],
    ending: 'Kunnan kaivuri makaa ojassa telat taivasta kohti, ja Kartanon Herra istuu pientareella lippalakki kourassa. Kirkonkello alkaa soida, ja koko kylä juoksee raitille. Olet uusi kesärallin mestari. Ensi kesänä kaikki tulevat sinua vastaan.',
    goonsVisit: 'Veljekset'
  });

  AR.TEXTS = { dystopia, kyla };
  AR.T = dystopia;
  AR.setTheme = id => {
    AR.T = AR.TEXTS[id] || dystopia;
    AR.themeId = AR.T.id;
    if (document.documentElement) document.documentElement.setAttribute('data-theme-game', AR.T.id);
  };
})();
