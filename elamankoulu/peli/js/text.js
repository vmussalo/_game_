/* Elämänkoulu – tekstit: hahmojen repliikit, elämänohjeet ja loppukuvaukset. */
(function () {
  'use strict';
  const EK = window.EK;

  EK.T = {
    title: 'ELÄMÄNKOULU',
    subtitle: 'Turnaus, jossa jokainen isku opettaa jotain',
    story: 'Startup-yrittäjä Hannu Hustle on kutsunut kaupungin arkisankarit turnaukseen. Palkintona on "Vuoden tehokkain" -pokaali. Kukaan ei ole nähnyt Hannun nukkuvan viiteen vuoteen. Joku voisi opettaa hänelle jotain.',
    round: n => 'ERÄ ' + n,
    finalRound: 'RATKAISUERÄ',
    go: 'NYT!',
    ko: 'OIVALLUS!',
    koSub: 'Pointti meni perille.',
    opetus: 'OPETUS!',
    timeUp: 'AIKA LOPPUI',
    draw: 'TASAPELI',
    perfect: 'TÄYDELLINEN!',
    counter: 'VASTAISKU',
    punish: 'RANKAISU',
    parry: 'HENGITÄ',
    perfectParry: 'TÄYSI RAUHA',
    burnout: 'UUPUMUS',
    rest: 'LEPOHETKI',
    tech: 'IRTI!',
    reversal: 'HETI!',
    hits: n => n + ' OSUMAA',
    wins: name => name + ' voittaa',
    youWin: 'VOITTO',
    youLose: 'TAPPIO',
    meter: 'OIVALLUS',
    jaks: 'JAKSAMINEN'
  };

  // Ennen ottelua sanottava repliikki, voittorepliikit (elämänohjeet), OPETUS-viimeistelyn ohje ja pelihallin loppu.
  EK.LINES = {
    kaisa: {
      vs: 'Tilaus valmis: yksi oppitunti, kiitos!',
      win: [
        'Pidä tauko ennen kuin tauko pitää sinut.',
        'Juo aamulla ensin lasi vettä. Kahvi vasta sitten.',
        'Jonossa voi aina olla ystävällinen. Se on ilmaista ja maistuu kaikille.',
        'Kun kaikki kuohuu, laske kymmeneen. Maitokin vaahtoaa paremmin rauhassa.',
        'Opettele ihmisten nimet. Jokainen ilahtuu, kun hänet huomataan.',
        'Kuumaa juomaa ei kannata hörppiä kiireessä, eikä elämääkään.'
      ],
      opetus: 'Kiire on usein valinta. Valitse huomenna hidas aamu.',
      ending: 'Kaisa avaa oman pienen kahvilan. Oven kyltissä lukee: "Täällä ei tarvitse olla tehokas." Jono kiertää korttelin, eikä kukaan valita.'
    },
    jere: {
      vs: 'Namaste. Ja sitten mennään.',
      win: [
        'Hengitä sisään neljä, ulos kuusi. Toista tarvittaessa koko elämän ajan.',
        'Joustavuus ei ole heikkoutta. Kysy vaikka koivulta myrskyn jälkeen.',
        'Kehosi kertoo, kun se tarvitsee lepoa. Kuuntele ennen kuin se huutaa.',
        'Et ole ajatuksesi. Olet se, joka huomaa ne.',
        'Puhelin pois makuuhuoneesta. Unesi kiittää.',
        'Venyttele aamulla viisi minuuttia. Se on lyhyempi aika kuin uutisten selaaminen.'
      ],
      opetus: 'Hengitä. Tämä hetki riittää.',
      ending: 'Jere alkaa vetää ilmaisia puistojoogatunteja. Kukaan ei osaa asentoja, eikä se haittaa ketään. Hannu Hustle käy joka tiistai ja yrittää voittaa.'
    },
    martta: {
      vs: 'Kas, nuori ihminen! Onko sinulla lämmintä päällä?',
      win: [
        'Syö puuroa ja soita mummollesi. Mieluiten molemmat samana päivänä.',
        'Kävele joka päivä. Sateella saat ulkoilun ja suihkun samalla kertaa.',
        'Riitaa ei kannata viedä nukkumaan. Se vie peitot.',
        'Säästä pahan päivän varalle, mutta muista pitää myös hyviä päiviä.',
        'Kun et tiedä mitä sanoa, keitä kahvit. Loput järjestyy pöydän ääressä.',
        'Ryppy on hymyn muisto. Kerää niitä.'
      ],
      opetus: 'Kukaan ei ole niin kiireinen, ettei ehtisi pullakahville.',
      ending: 'Martta perustaa korttelikerhon, jossa nuoret opettavat kännyköitä ja vanhat neulomista. Molemmat oppivat enemmän kuin luulivat. Pokaali päätyy kukkapöydälle.'
    },
    leevi: {
      vs: 'Hetki, olet mykistettynä... Ai, et olekaan. No niin.',
      win: [
        'Sulje läppäri viideltä. Sähköpostit odottavat, ne ovat kärsivällisiä.',
        'Tämänkin kokouksen olisi voinut hoitaa yhdellä viestillä.',
        'Nouse tuolista tunnin välein. Selkä on ainoa, joka sinulla on.',
        'Varmuuskopioi tiedostot ja ihmissuhteet. Molemmat katoavat huoltamatta.',
        'Laita kamera päälle edes joskus. Kollegat ovat ihmisiä, eivät nimikirjaimia.',
        'Ctrl+Z ei toimi oikeassa elämässä. Mieti hetki ennen kuin painat Lähetä.'
      ],
      opetus: 'Poissa toimistolta tarkoittaa: poissa toimistolta.',
      ending: 'Leevi sammuttaa ilmoitukset ja lähtee viikoksi mökille. Maailma ei kaadu. Tiimi ei edes huomaa poissaoloa, mikä on yhtä aikaa loukkaavaa ja vapauttavaa.'
    },
    saara: {
      vs: 'Tilaus tuli. Toimitus ovelle viidessä sekunnissa.',
      win: [
        'Kypärä päähän. Hyvät ajatukset tarvitsevat suojan.',
        'Matka on tärkeä, mutta niin on myös jarru.',
        'Ylämäki on vain alamäki, joka odottaa vuoroaan.',
        'Jokainen kuljettu kilometri on pois murehtimisesta.',
        'Pidä ketjut rasvattuina ja ystävät lähellä.',
        'Jos eksyt, kysy reittiä. Yksin harhailusta ei saa pisteitä.'
      ],
      opetus: 'Hidasta. Perille ehtii myös ehjänä.',
      ending: 'Saara perustaa pyöräkorjaamon, jossa asiakas oppii korjaamaan pyöränsä itse. Korjaamo tekee välillä tappiota, mutta kukaan ei harmittele.'
    },
    rami: {
      vs: 'Tästä tulee nopea homma. Sanoin saman keittiöremontista vuonna 2019.',
      win: [
        'Mittaa kahdesti, sahaa kerran. Sama pätee sanoihin.',
        'Hyvä pohja kantaa kaiken. Nuku, syö ja liiku, niin talo pysyy pystyssä.',
        'Avun pyytäminen kantamiseen ei ole häpeä. Selkä on yksi, kavereita monta.',
        'Pienet vuodot korjataan heti. Isoista tulee remontteja.',
        'Kunnollinen työ vie aikansa. Hätäily tulee kalliiksi.',
        'Joskus purkaminen on rakentamisen tärkein vaihe.'
      ],
      opetus: 'Huolla ensin itseäsi, sitten taloa. Kumpikin tarvitsee huoltoa.',
      ending: 'Rami saa remonttinsa valmiiksi ensimmäistä kertaa aikataulussa. Hän ei usko sitä itsekään ja tarkistaa kalenterin kolme kertaa.'
    },
    iida: {
      vs: 'Hymyile, olet livenä! Tai no, lähinnä minä olen.',
      win: [
        'Elämä ei ole syöte. Kaikkea ei tarvitse julkaista.',
        'Vertaa itseäsi vain eiliseen itseesi. Ilman suodatinta.',
        'Kehu ystävää kasvotusten. Se ei tarvitse signaalia.',
        'Hyvä hetki ei parane kuvaamalla. Joskus se paranee, kun jätät kuvaamatta.',
        'Tykkäykset loppuvat, ystävät eivät. Hoida ystäviä.',
        'Ruutuaika on oikeaa aikaa. Käytä se johonkin, minkä muistat.'
      ],
      opetus: 'Laske puhelin. Tämä hetki ei tarvitse yleisöä.',
      ending: 'Iida pitää kuukauden somepaaston. Seuraajien määrä laskee ja unen määrä nousee. Hän toteaa, että vaihtokauppa kannatti.'
    },
    hannu: {
      vs: 'Tervetuloa tiimiin! Aloitetaan heti. Lomista puhutaan Q5:llä.',
      win: [
        'Lepo on laiskuutta! ...Ei, hetkinen. Ei se ole. Unohda, mitä sanoin.',
        'Nukuin viime yönä neljä tuntia. Älä tee niin kuin minä.',
        'Kaikki on mahdollista. Kaikki kerralla ei ole.',
        'Kasvu ei aina ole parempaa. Kysy vaikka kuplalta.',
        'Synergia, disruptio, skaalaus. Tai sitten ihan vain hyvä päivä.',
        'Tavoitteet ovat hyviä. Ihmiset ovat parempia.'
      ],
      opetus: 'Sinäkin saat pysähtyä. Oikeastaan sinun pitää.',
      ending: 'Hannu myy startupinsa ja ostaa mökin ilman wifiä. Ensimmäisellä viikolla hän pitää mökillä strategiapäivän. Toisella viikolla hän oppii onkimaan.'
    }
  };

  // Hannun loppukohtaus pelihallissa, kun hänet on voitettu
  EK.T.bossDefeat = 'Hannu istahtaa lattialle ensimmäistä kertaa vuosiin. "Ai... tältäkö se tuntuu, kun ei tee mitään?" Hän ojentaa pokaalin ja kysyy, missä täällä voi ottaa päiväunet.';

  // Yleiset ohjeet, jotka näkyvät latausvinkkeinä ja Ohjeissa
  EK.TIPS = [
    'Hengitä (P) torjuu minkä tahansa iskun, mutta kuluttaa Jaksamista. Täydellisellä ajoituksella vastustaja jähmettyy.',
    'Kun Jaksaminen loppuu, tulee UUPUMUS: torjunnat sattuvat ja Hengitä ei toimi. Lepää ajoissa.',
    'Lepohetki (↓ + Hengitä) täyttää Jaksamisen nopeasti, mutta olet silloin suojaton. Pidä tauko turvallisen välimatkan päässä.',
    'Kun isku osuu, voit perua sen loppuliikkeen erikoisliikkeeksi: esimerkiksi Matala potku → ↓↘→ + isku.',
    'Ketjut: Nopea → Keskitason → Iso isku sulautuvat yhteen, kun painat napit peräkkäin osuman aikana.',
    'Heitto (L + M yhtä aikaa) menee torjunnan läpi. Heiton voi purkaa painamalla samaa yhdistelmää heti.',
    'Yläiskut (→ + M ja hyppyiskut) pitää torjua seisten. Matalat potkut torjutaan kyykyssä.',
    'Moderni ohjaus: Erikois-nappi tekee erikoisliikkeen suunnan mukaan. Vahinko on hieman pienempi.',
    'Jos voitat viimeisen erän superliikkeellä, tulee OPETUS, ja voittaja jakaa elämänohjeen.'
  ];
})();
