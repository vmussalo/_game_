'use strict';
// Dialogue trees. text/if/do/go can be functions of the helper $ (see core/dialog.js).
(function () {
  const D = GG.DLG = {};
  const bye = { t: 'Goodbye.', end: true };

  // shared: collect gristling bounty (sheriff or deputy)
  const bountyOpts = [
    { t: $ => `I'm here to collect the Gristling bounty. (${$.v('bountyOwed')} tickets)`, if: $ => $.v('bountyOwed') > 0, do: $ => { $.give('ticket', $.v('bountyOwed')); $.set('bountyOwed', 0); }, go: 'paid' },
    { t: 'All three tumour nests are burned out.', if: $ => $.q('bounty') === 20, do: $ => { $.give('ticket', 100); $.qset('bounty', 30); $.xp(150); }, go: 'paid' },
  ];

  // ===================================================================== AGNES
  D.agnes = {
    start: $ => {
      if (!$.f('metAgnes')) return 'intro';
      if ($.q('herd') === 40) return 'report';
      if ($.f('agnesAngry')) return 'cold';
      if ($.q('herd') === 45) return 'liecheck';
      return 'hub';
    },
    nodes: {
      intro: {
        text: '*A broad woman in a starched bonnet looks up from a ledger of cut weights. An old scar across her jaw moves when she talks.* "You\'re the Stray. Gummy saw you walk in on foot, which means you\'re either brave or broke. Gutwater has a use for both."',
        do: $ => $.set('metAgnes'),
        opts: [{ t: 'What kind of use?', go: 'job' }, { t: 'Who are you?', go: 'who' }, { t: 'Just passing through.', end: true }],
      },
      who: {
        text: '"Agnes Vell. Herdmother. I decide who cuts, how deep, and when. Forty years I\'ve kept this town fed, and I\'ve never once had to eat my words, or anyone else."',
        moe: 'LESTER: She\'s lovely. MOE: She\'s terrifying. LESTER: That\'s what I said.',
        opts: [{ t: 'You mentioned a use for me.', go: 'job', if: $ => !$.q('herd') }, { t: 'Back to business.', go: 'hub' }],
      },
      job: {
        text: '"It\'s Old Mother. Our herd. She\'s greying at the folds. Shrinking. The cuts come up thin and pale, and at night Gristlings crawl out of her like maggots from a ham. Doc calls it sickness. I\'ve seen sick, Stray. This isn\'t it." *She taps the ledger.* "Find out what\'s killing her. Three hundred tickets."',
        opts: [
          { t: 'I\'ll find out.', do: $ => { $.qset('herd', 10); $.set('herdReward', $.v('herdReward') || 300); }, go: 'accept' },
          { t: '300 is light for saving a whole town.', check: ['haggle', 40], okDo: $ => $.set('herdReward', 400), go: 'haggleok', fail: 'hagglefail' },
          { t: 'Where would I even start?', go: 'where' },
          { t: 'Not my problem.', end: true },
        ],
      },
      haggleok: { text: '"*Hmph.* Four hundred. And if you\'re wrong about being worth it, I\'ll take it out of your hide."', do: $ => $.qset('herd', 10), go: 'accept' },
      hagglefail: { text: '"Three hundred is what the town can pay. You want more, go rob a Shareholder."', opts: [{ t: 'Fine. I\'ll do it.', do: $ => { $.qset('herd', 10); $.set('herdReward', 300); }, go: 'accept' }, { t: 'Let me think about it.', end: true }] },
      accept: {
        text: '"Good. Doc Purslane\'s been poking at her; he\'s cleverer than he looks, which isn\'t hard. Ruby Teeth by the old tent hears every rumour on the Rind. And Sheriff Harrow says there\'s nothing to find." *A pause.* "So maybe start somewhere else."',
        opts: [{ t: 'Where is Old Mother?', go: 'where' }, { t: 'I have other questions.', go: 'hub' }, bye],
      },
      where: {
        text: '"East pasture, past the fence. You can\'t miss her; she\'s the hill that breathes. If you know meat, look at her yourself. If you don\'t, kill a Gristling, cut its tumour sac, and take it to Doc. He\'ll read it like a newspaper."',
        opts: [{ t: 'Got it.', go: 'hub' }],
      },
      hub: {
        text: $ => $.q('herd') >= 50 ? '"Stray. Old Mother sang last night. First time in a month." *Agnes almost smiles.* "What do you need?"' : '"Well?"',
        opts: [
          { t: 'About that job...', if: $ => !$.q('herd'), go: 'job' },
          { t: 'Tell me about Old Mother.', go: 'mother' },
          { t: 'She\'s being drained. There\'s a pipe in her from the old Feedworks.', if: $ => [20, 30].includes($.q('herd')), go: 'drained' },
          { t: 'About the town...', go: 'town' },
          { t: 'This ledger names a "C.H." as the Marrow Show\'s man in Gutwater.', if: $ => $.has('ledger') && $.q('lawman') === 10 && !$.f('harrowDead'), go: 'ledger' },
          { t: 'Who was buying the marrow? The ledger says the Grand Calliope.', if: $ => $.has('ledger') && $.q('herd') >= 50 && !$.f('toldCalliope'), go: 'calliope' },
          { t: 'I\'m heading east, after the Calliope. (Finish Act 1)', if: $ => $.qdone('herd'), go: 'farewell' },
          bye,
        ],
      },
      mother: {
        text: '"Forty-one years old. Older than the town. She came through with the Bloom: a little runaway Perpetua calf, all knees and appetite. My mother fed her by hand. She feeds us now." *Agnes looks away.* "Fair trade, I always thought."',
        moe: 'MOE: *sniffs* That\'s beautiful. LESTER: It\'s about eating your pet, Moe.',
        opts: [{ t: 'I see.', go: 'hub' }],
      },
      drained: {
        text: '*Agnes goes very still.* "The Feedworks. Abundance built it to feed the old herds. It\'s been dead longer than you\'ve been alive. Who\'d be running it?"',
        opts: [
          { t: 'A carnival. The Marrow Show.', if: $ => $.q('herd') >= 30, go: 'show' },
          { t: 'I\'m going to find out.', go: 'hub' },
        ],
      },
      show: {
        text: '"Carnies." *She spits, accurately, into a brass pot.* "They roll through every few summers, sell us dreams and buy our children. Stop that pump, Stray. However you need to."',
        opts: [{ t: 'I will.', go: 'hub' }],
      },
      town: {
        text: '"Gutwater: sixty-one souls, one herd, one saloon, one sheriff, and Ruby Teeth, who counts as several."',
        opts: [
          { t: 'The saloon?', go: 'saloon' }, { t: 'Ruby Teeth?', go: 'ruby' }, { t: 'The sheriff?', go: 'sheriff' }, { t: 'Enough about the town.', go: 'hub' },
        ],
      },
      saloon: { text: '"The Sweetbread. Big Dellah runs the bar by sitting at it. If she challenges you to drink, say no. Nobody says no."', opts: [{ t: 'Go on.', go: 'town' }] },
      ruby: { text: '"A carnival barker whose carnival went bust. She camps by the old tent and pays her rent in stories. Lost her two-headed singer a while back; she\'s been sour since."', opts: [{ t: 'Go on.', go: 'town' }] },
      sheriff: { text: '"Cobb Harrow. Eight years keeping the peace. He\'s been... distracted this spring. Bought himself a fancy new rifle." *She frowns.* "Can\'t think where the money came from."', opts: [{ t: 'Go on.', go: 'town' }] },
      report: {
        text: '*Agnes is already on her feet.* "Old Mother turned pink at the edges this morning. PINK. The cutters are crying into their aprons. What did you do?"',
        opts: [
          { t: 'Reversed their pump. Every drop they stole went back into her.', if: $ => $.f('pumpReversed'), do: $ => { $.give('ticket', $.v('herdReward') + 100); $.set('herdSaved'); $.qset('herd', 50); $.xp(600); }, go: 'reportBest' },
          { t: 'Shut down the Marrow Show\'s pump at the old Feedworks.', if: $ => !$.f('pumpReversed'), do: $ => { $.give('ticket', $.v('herdReward') || 300); $.set('herdSaved'); $.qset('herd', 50); $.xp(450); }, go: 'reportGood' },
        ],
      },
      reportBest: { text: '*She laughs, a sound like a gate that hasn\'t opened in years.* "Back INTO her! Lord. The town\'ll be eating like Shareholders. Here. Your pay, and a hundred more, and you never pay for a drink at the Sweetbread again. I\'ll tell Dellah. She\'ll hate it."', go: 'reward' },
      reportGood: { text: '"Then she\'ll mend. Slowly, but she\'ll mend." *Agnes counts tickets into your palm, one by one, as if each costs her a tooth.* "Earned. Every one."', go: 'reward' },
      reward: {
        text: '"One more thing, Stray. Carnies don\'t pump marrow for fun. Who were they selling it to?"',
        opts: [
          { t: 'The ledger says the Grand Calliope.', if: $ => $.has('ledger'), go: 'calliope' },
          { t: 'I don\'t know yet.', go: 'hub' },
        ],
      },
      calliope: {
        text: '*Agnes sits down heavily.* "The Calliope. Then this was never about one town. If they\'re buying Mother marrow, they\'re buying it from every herd they can get a pipe into." *She looks east, through the wall, as if she could see the dust.* "What does a carnival want with that much of a Mother?"',
        do: $ => { $.set('toldCalliope'); $.xp(100); },
        moe: 'LESTER: Nothing good. MOE: A really big show? LESTER: Nothing good.',
        opts: [{ t: 'I mean to find out.', go: 'hub' }],
      },
      liecheck: {
        text: '"Well? You\'ve been gone long enough to read Old Mother her last rites. What did you find?"',
        opts: [
          { t: 'It\'s a natural wasting. Nothing anyone can do.', check: ['gab', 50], okDo: $ => { $.set('lied'); $.qset('herd', 55); $.give('ticket', 150); }, go: 'lieok', fail: 'liefail' },
          { t: 'The truth: a carnival is draining her. They paid me to lie to you. The pump is still running.', do: $ => { $.qset('herd', 30); $.set('confessed'); }, go: 'confess' },
        ],
      },
      lieok: { text: '*Agnes studies you for a long moment.* "Natural. Well. Then we\'ll pray for her, for all the good it does." *She pays you half, anyway.* "For your trouble."', opts: [bye] },
      liefail: { text: '*She doesn\'t blink.* "You\'re lying. I\'ve cut meat forty years; I know rot when I smell it. Get out of my hall."', do: $ => $.set('agnesAngry'), opts: [{ t: 'Leave.', end: true }] },
      confess: { text: '*Agnes looks at the tickets bulging in your pocket, then at you.* "...At least you came back. Go and stop it. We\'ll call their money your fee, instead of mine."', opts: [{ t: 'I will.', end: true }] },
      cold: { text: '*Agnes doesn\'t look up from her ledger.* "We have nothing to say, Stray. Unless you\'ve come to fix what you broke."', opts: [{ t: 'Leave.', end: true }] },
      ledger: {
        text: '*She reads it twice. Her knuckles go white on the page.* "C.H. Cobb Harrow." *A long breath.* "I\'ll handle my sheriff."',
        opts: [
          { t: 'Exile him. Tonight.', do: $ => { $.set('harrowExposed'); $.set('harrowExiled'); $.qset('lawman', 20); $.xp(250); const h = $.ent('harrow'); if (h) h.gone = true; }, go: 'exiled' },
          { t: 'He should hang.', go: 'hang' },
          { t: 'Let me deal with him myself.', end: true },
        ],
      },
      hang: { text: '"Gutwater doesn\'t hang folk. We give them a mule and an hour and let the Rind do the rest. It\'s crueller, and it saves rope."', opts: [{ t: 'Fine. Exile him.', do: $ => { $.set('harrowExposed'); $.set('harrowExiled'); $.qset('lawman', 20); $.xp(250); const h = $.ent('harrow'); if (h) h.gone = true; }, go: 'exiled' }] },
      exiled: { text: '*Within the hour Cobb Harrow rides out on a mule, his star left on Agnes\'s table. He doesn\'t look back. Deputy Pruitt watches him go with an expression you can\'t read.*', opts: [{ t: 'Done, then.', go: 'hub' }] },
      farewell: {
        text: '"East. After the dust." *Agnes nods slowly.* "Then go with the herd\'s thanks, Stray. And if you find whatever\'s at the heart of that Calliope, cut it clean."',
        opts: [{ t: '*Ride out.* (See how Act 1 ends.)', do: $ => { $.set('endingSeen'); $.emit('ending'); }, end: true }, { t: 'Not yet.', go: 'hub' }],
      },
    },
  };

  // ===================================================================== DOC PURSLANE
  D.purslane = {
    start: $ => $.f('metDoc') ? 'hub' : 'intro',
    nodes: {
      intro: { text: '*A thin man in a bloodstained smock peers at you through spectacles that magnify his eyes to the size of boiled eggs.* "A patient! No? A customer, then. Same thing, more paperwork. Doc Purslane. I stitch, I splint, I sell paste."', do: $ => $.set('metDoc'), go: 'hub' },
      hub: {
        text: $ => '"What ails you?"',
        opts: [
          { t: 'I need patching up. (30 tickets, full heal)', if: $ => $.pc.hp < GG.G.maxHp($.pc) || GG.G.partyEnts().some(p => p.hp < GG.G.maxHp(p)), go: 'heal' },
          { t: 'Show me what you sell.', barter: true },
          { t: 'What\'s really wrong with Old Mother?', if: $ => $.q('herd') === 10 && !$.has('tumorsac'), go: 'theory' },
          { t: 'I brought you a Gristling tumour sac.', if: $ => $.q('herd') >= 10 && $.q('herd') < 20 && $.has('tumorsac'), do: $ => { $.take('tumorsac'); $.xp(150); }, go: 'sample' },
          { t: 'Teach me some doctoring. (50 tickets)', if: $ => !$.f('docTaught') && $.tickets() >= 50, check: ['doctor', 30], okDo: $ => { $.take('ticket', 50); $.tutor('doctor', 10); $.set('docTaught'); }, go: 'taught', fail: 'notaught' },
          bye,
        ],
      },
      heal: {
        text: '"Thirty tickets and I\'ll have you sewn tighter than a Shareholder\'s purse."',
        opts: [
          { t: 'Do it. (30 tickets)', if: $ => $.tickets() >= 30, do: $ => { $.take('ticket', 30); $.heal(); $.advance(30); }, go: 'healed' },
          { t: 'Too rich for me.', go: 'hub' },
        ],
      },
      healed: { text: '*Twenty minutes, a great deal of grey paste, and one song about a dead dog later, you feel whole again.* "Don\'t pick at it."', go: 'hub' },
      theory: { text: '"Sickness, I told Agnes." *He lowers his voice.* "I lied. Her blood is fine. Her meat is fine. It\'s the INSIDE of her bones that\'s wrong. Bring me a tumour sac from a Gristling. They bud off her, so they carry her marrow. I\'ll show you."', moe: 'MOE: I don\'t like this man. LESTER: He\'s the only one in town who\'s seen our insides, Moe. Be nice.', go: 'hub' },
      sample: {
        text: '*He slices the sac on a glass plate, squints, and then goes pale under the magnifiers.* "Hollow. The marrow\'s been PULLED. And look: needle tracks. Feed-line wounds, Abundance pattern. Somebody has a pipe in her, my friend, and they\'re sucking her dry. The only Abundance feed-lines in this part of the Rind run to Feedworks Station 9. The Sump. North-west of here."',
        do: $ => $.give('sample'),
        opts: [{ t: 'The Sump. Got it.', go: 'hub' }],
      },
      taught: { text: '"The trick to stitches is the same as the trick to lying: small, neat, and never more than you need." *He shows you a knot you will dream about.*', go: 'hub' },
      notaught: { text: '"You don\'t know enough to learn yet. Come back when you can tell a liver from a lung without a label."', go: 'hub' },
    },
  };

  // ===================================================================== RUBY TEETH
  D.ruby = {
    start: $ => {
      if (!$.f('metRuby')) return 'intro';
      if ($.q('ruby') === 45) return 'moedead';
      if ($.q('ruby') === 30 && ($.f('moeJoined') || $.f('moeToRuby'))) return 'moeback';
      return 'hub';
    },
    nodes: {
      intro: {
        text: '*A woman in a scarlet coat and a dented top hat swings round, flashing a mouth full of gold-capped teeth.* "ROLL UP, ROLL UP, see the— oh. Only one of you. Pity. My act used to come with two heads."',
        do: $ => $.set('metRuby'), go: 'act',
      },
      act: {
        text: '"Moe & Lester! The Two-Headed Tenor! One body, two heads, one tenor, one baritone, and no agreement on anything else. Best act on the Rind. And the idiots went off to the Marrow Show asking for \'a better contract\'. That was a month ago."',
        opts: [
          { t: 'The Marrow Show?', go: 'show' },
          { t: 'I\'ll look for them.', if: $ => !$.q('ruby'), do: $ => $.qset('ruby', 10), go: 'thanks' },
          { t: 'Not my business.', go: 'hub' },
        ],
      },
      show: {
        text: '"A splinter troupe. Clowns with cleavers. They camped at the old Feedworks north-west of here, last I heard. All very hush-hush. Moe said they offered \'steady work and regular pay\'." *She shudders.* "In the Rind? That\'s the scariest thing anyone can say to you."',
        do: $ => { $.set('knowsShow'); $.reveal('sump'); },
        opts: [{ t: 'I\'ll find them.', if: $ => !$.q('ruby'), do: $ => $.qset('ruby', 10), go: 'thanks' }, { t: 'Interesting.', go: 'hub' }],
      },
      thanks: { text: '"Bring them back, and Ruby Teeth will make it worth your while. Tickets, and something lucky. I\'ve only got the one lucky thing, so don\'t make me regret it."', go: 'hub' },
      hub: {
        text: '"What\'ll it be, darling?"',
        opts: [
          { t: 'Tell me about your act.', if: $ => !$.q('ruby'), go: 'act' },
          { t: 'What\'s a carnival barker doing in a ranch town?', go: 'why' },
          { t: 'What is the Grand Calliope?', go: 'calliope' },
          { t: 'Teach me some patter.', once: 'rubyTeach', check: ['show', 30], okDo: $ => $.tutor('show', 10), go: 'patter', fail: 'nopatter' },
          bye,
        ],
      },
      why: { text: '"My show went bust. The Calliope bought out my contract... and then didn\'t, which is a trick they do. Now Ruby\'s Rarities is one wagon, one tent and zero rarities. Gutwater lets me camp here for stories."', go: 'hub' },
      calliope: { text: '"The biggest Circuit on the Rind. A mile of wagons, three generators, a Ringmistress nobody\'s seen in twenty years. They don\'t visit towns, darling. They ABSORB them. Every summer they\'re \'coming\'. Every summer a few more towns go with them."', go: 'hub' },
      patter: { text: '"Rule one: never let them see you count. Rule two: always count. Rule three: when in doubt, point at the sky and shout \'LOOK!\'." *She demonstrates. You look. Your purse is now in her hand. She hands it back.* "See?"', go: 'hub' },
      nopatter: { text: '"Darling, you have the stage presence of a wet sock. Practise in a mirror first. Then practise on the mirror."', go: 'hub' },
      moeback: {
        text: $ => $.f('moeJoined')
          ? '"MOE! LESTER!" *She hugs both heads, one at a time, in order of seniority.* "You\'re going off with THIS one? Fine. FINE. Keep them alive, Stray. Here, as promised."'
          : '"They\'re BACK! Ruby\'s Rarities is open for business!" *She kisses you on both cheeks and one ear.* "As promised. You\'re a marvel. Not an exhibitable one, but still."',
        do: $ => { $.give('rabbitfoot'); $.give('ticket', 100); $.qset('ruby', 40); $.xp(300); },
        opts: [bye],
      },
      moedead: {
        text: '*Ruby\'s grin goes out like a lamp.* "...Both of them?" *She takes off her hat and holds it a long time.* "Thank you for telling me. Here. No, take it. I can\'t look at it any more."',
        do: $ => { $.give('rabbitfoot'); $.qset('ruby', 40); $.xp(100); },
        opts: [bye],
      },
    },
  };

  // ===================================================================== SALTLICK
  D.saltlick = {
    start: $ => $.f('metSalt') ? 'hub' : 'intro',
    nodes: {
      intro: { text: '*A huge man with a waxed moustache and a salt-white apron leans on the counter.* "Saltlick Morrow. Provisions, ammunition, sundries. I buy gristle, I sell everything else. My prices are firm. My handshake is not."', do: $ => $.set('metSalt'), go: 'hub' },
      hub: {
        text: '"Buying or selling?"',
        opts: [
          { t: 'Let\'s trade.', barter: true },
          { t: 'Any news?', go: 'news' },
          { t: 'Your prices are criminal.', once: 'saltHaggle', check: ['haggle', 50], okDo: $ => $.set('saltlickDiscount'), go: 'discount', fail: 'nodiscount' },
          { t: 'Why won\'t you sell Sugar Gristle to Tallow?', if: $ => $.q('tallow') === 10, go: 'tallow' },
          bye,
        ],
      },
      news: {
        text: $ => $.q('herd') >= 50 ? '"Herd\'s pinking up. Gristle prices\'ll drop. Good for the town, bad for Saltlick. I\'ll survive."' : '"Gristlings came right up to the fence last night. And the sheriff paid me in NEW tickets last week. Crisp. Calliope print. Didn\'t know Gutwater had any of those."',
        do: $ => { if ($.q('herd') < 50) $.set('suspectHarrow'); },
        go: 'hub',
      },
      discount: { text: '"Fine. FINE. Fifteen percent. Don\'t tell Agnes, she\'ll want the same, and then where would I be? Solvent, that\'s where. Unacceptable."', go: 'hub' },
      nodiscount: { text: '"Criminal would be cheaper. Take it or leave it."', go: 'hub' },
      tallow: { text: '"That kid ate a whole jar of them and then threw up in my flour. They\'re ten tickets each, for you. Not for the kid. Never for the kid."', go: 'hub' },
    },
  };

  // ===================================================================== SHERIFF HARROW
  D.harrow = {
    start: $ => {
      if ($.f('harrowBlackmail')) return 'paidoff';
      if ($.has('ledger') && $.q('lawman') === 10) return 'confront';
      return $.f('metHarrow') ? 'hub' : 'intro';
    },
    nodes: {
      intro: { text: '*A lean man with a grey moustache and a star polished to a mirror. A long rifle leans close at hand, cleaner than anything else in the room.* "You\'re the Stray. I\'m the law. Keep it civil and we\'ll get along fine."', do: $ => $.set('metHarrow'), go: 'hub' },
      hub: {
        text: '"Something you need?"',
        opts: [
          ...bountyOpts,
          { t: 'What do you know about Old Mother wasting?', go: 'mother' },
          { t: 'What\'s out north-west? The old Feedworks?', if: $ => $.q('herd') >= 10, go: 'feedworks' },
          bye,
        ],
      },
      paid: { text: '*He counts it out without a word, then:* "Gutwater thanks you. Try not to bleed on the floor on your way out."', go: 'hub' },
      mother: {
        text: '"Sickness. Happens to old herds. Doc\'ll tell you the same."',
        opts: [
          { t: 'You answered that very fast.', check: ['stat', 'wits', 6], go: 'nervous', fail: 'hub' },
          { t: 'Fair enough.', go: 'hub' },
        ],
      },
      nervous: { text: '*His eyes flick, just once, to the rifle.* "I answer most things fast. Next question."', do: $ => $.set('suspectHarrow'), go: 'hub' },
      feedworks: {
        text: '"Nothing. Sealed up since before you were born. Gristlings nest there. I\'d stay clear."',
        opts: [
          { t: 'You\'ve been there recently, haven\'t you? Your boots say so.', check: ['gab', 45], go: 'boots', fail: 'watch' },
          { t: 'Thanks for the warning.', go: 'hub' },
        ],
      },
      boots: { text: '*A long pause. The clock ticks.* "...I go where the job takes me. Leave it be, Stray. For your own sake."', do: $ => $.set('suspectHarrow'), go: 'hub' },
      watch: { text: '"Watch your mouth in my office."', go: 'hub' },
      confront: {
        text: '*He sees the ledger in your hand. His face doesn\'t move. His hand does: a little closer to the rifle.* "Where did you get that."',
        opts: [
          { t: 'It says "C.H.", Sheriff. That\'s you.', go: 'deny' },
          { t: 'Pay me and it disappears.', go: 'blackmail' },
          { t: 'Never mind.', end: true },
        ],
      },
      deny: {
        text: '"Could be anyone. Could be Cora Hatch, the soap-maker."',
        opts: [
          { t: 'Cora Hatch doesn\'t own a six-hundred-ticket rifle.', check: ['gab', 60], go: 'confess', fail: 'draw' },
          { t: '*Hold his stare until he looks away.*', check: ['stat', 'nerve', 7], go: 'confess', fail: 'draw' },
          { t: 'I\'m taking it to Agnes.', go: 'draw' },
          { t: 'Pay me and it disappears.', go: 'blackmail' },
        ],
      },
      confess: {
        text: '*He sags, all at once, like a tent with the pole pulled.* "The Show came three months back. Said Old Mother had marrow to spare, that she\'d regrow it. Paid in Calliope tickets, new ones. I\'ve got a daughter in Tallowmarket who needs..." *He stops.* "Doesn\'t matter. What do you want?"',
        moe: 'MOE: Oh, that\'s sad. LESTER: He sold a town, Moe. MOE: Sad AND bad.',
        opts: [
          { t: 'Turn yourself in to Agnes.', do: $ => { $.set('harrowExposed'); $.set('harrowJailed'); $.qset('lawman', 50); $.xp(350); const h = $.ent('harrow'); if (h) h.gone = true; }, go: 'jailed' },
          { t: 'Leave Gutwater. Tonight.', do: $ => { $.set('harrowExposed'); $.set('harrowExiled'); $.qset('lawman', 20); $.xp(250); const h = $.ent('harrow'); if (h) h.gone = true; }, go: 'leaves' },
          { t: 'Pay me, and we never speak of it.', go: 'blackmail' },
        ],
      },
      jailed: { text: '*He unpins the star and sets it on the desk.* "Tell her I\'ll be in my own cell. The key\'s on the hook." *He walks to the back and closes the bars himself.*', opts: [{ t: 'Leave.', end: true }] },
      leaves: { text: '"Tonight, then." *He picks up his rifle, thinks about it, and puts it back down.* "Keep that. Fair\'s fair." *He leaves the long rifle on the desk.*', do: $ => $.give('harrowrifle'), opts: [{ t: 'Leave.', end: true }] },
      blackmail: {
        text: '*His jaw works for a while.* "Two hundred tickets. And you burn that ledger in front of me."',
        opts: [
          { t: 'Deal.', do: $ => { $.give('ticket', 200); $.take('ledger'); $.set('harrowBlackmail'); $.qset('lawman', 30); $.xp(100); }, go: 'burned' },
          { t: 'Four hundred.', check: ['haggle', 55], okDo: $ => { $.give('ticket', 400); $.take('ledger'); $.set('harrowBlackmail'); $.qset('lawman', 30); $.xp(150); }, go: 'burned', fail: 'draw' },
          { t: 'No deal.', go: 'draw' },
        ],
      },
      burned: { text: '*The ledger curls in the stove. Harrow watches every page.* "We\'re square. Now get out of my office."', opts: [{ t: 'Leave.', end: true }] },
      draw: {
        text: '*He\'s faster than he looks. The long rifle comes up level with your chest.* "I\'m sorry, Stray. Truly I am."',
        do: $ => $.set('harrowExposed'),
        opts: [{ t: '*Fight.*', fight: true }],
      },
      paidoff: { text: '*He doesn\'t look up.* "We\'re square. Move along."', opts: [...bountyOpts, bye] },
    },
  };

  // ===================================================================== DEPUTY
  D.deputy = {
    start: 'hub',
    nodes: {
      hub: {
        text: $ => $.f('harrowExposed') ? '"Sheriff\'s gone. I\'m it, now. Lord help us." *Pruitt adjusts a star that is slightly too big for him.*' : '"Sheriff\'s inside. Something you need from the law?"',
        opts: [...bountyOpts.map(o => Object.assign({}, o, { if: $ => o.if($) && ($.f('harrowExposed') || $.f('harrowDead')) })), { t: 'Anything going on?', go: 'news' }, bye],
      },
      paid: { text: '"There you go. Bounty\'s paid fair."', go: 'hub' },
      news: { text: '"Gristlings, mostly. Comes from the nests in the pasture; they bud worse at night. Sheriff put up a bounty on the board by the door. Kill \'em, then come collect."', go: 'hub' },
    },
  };

  // ===================================================================== TALLOW
  D.tallow = {
    start: 'hub',
    nodes: {
      hub: {
        text: $ => $.q('tallow') === 20 ? '"Did you go in? Did you see the clowns? Did they have the big hammers?"' : '*A freckled kid of maybe ten, in a cap three sizes too big, chewing on nothing in particular.* "What."',
        opts: [
          { t: 'Know anything interesting?', if: $ => !$.q('tallow'), do: $ => $.qset('tallow', 10), go: 'know' },
          { t: 'About that back way...', if: $ => $.q('tallow') === 10, go: 'price' },
          bye,
        ],
      },
      know: { text: '"I know LOTS. Like a back way into the old Feedworks that nobody knows but me. And now you know that I know. That part\'s free. The rest ain\'t."', go: 'price' },
      price: {
        text: '"Twenty tickets. Or a Sugar Gristle. Saltlick won\'t sell me none on account of an incident."',
        opts: [
          { t: 'Here. Twenty tickets.', if: $ => $.tickets() >= 20, do: $ => $.take('ticket', 20), go: 'tell' },
          { t: 'Here\'s a Sugar Gristle.', if: $ => $.has('sweetgristle'), do: $ => $.take('sweetgristle'), go: 'tell' },
          { t: 'Information\'s worth more when it\'s shared, kid.', check: ['gab', 45], go: 'tell', fail: 'nice' },
          { t: '*Pull a ticket out of the kid\'s ear.*', check: ['show', 35], go: 'magic', fail: 'nice' },
          { t: 'Maybe later.', end: true },
        ],
      },
      nice: { text: '"Nice try. I\'m ten, not stupid."', go: 'hub' },
      magic: { text: '"WHOA. How\'d you— okay, OKAY. I\'ll tell you. You gotta teach me that, though."', go: 'tell' },
      tell: {
        text: '"East side of the Feedworks there\'s a big drainage culvert. Goes right up to the pump room. The grate\'s rusted to bits; you just lean on it. Me and Pruitt\'s boy used to dare each other to go up it. Then we saw the clowns." *Tallow shivers theatrically.* "They had BIG hammers."',
        do: $ => { $.set('tallowCulvert'); $.qset('tallow', 20); $.xp(100); $.reveal('sump'); },
        opts: [{ t: 'Thanks, kid.', end: true }],
      },
    },
  };

  // ===================================================================== DELLAH
  D.dellah = {
    start: $ => $.q('drink') === 20 ? 'champ' : $.q('drink') === 30 ? 'gloat' : 'hub',
    nodes: {
      hub: {
        text: '*A mountain of a woman in a red shirt leans on the bar, grinning around a gold tooth. The bar leans back.* "New face! You drink?"',
        opts: [{ t: 'What\'s the bet?', go: 'bet' }, { t: 'Not with you.', end: true }],
      },
      bet: {
        text: '"Three rounds of Marrowshine. Last one standing takes fifty tickets. You lose, you pay fifty and you clean the spittoon. With your tongue, if I\'m feeling festive."',
        do: $ => { if (!$.q('drink')) $.qset('drink', 10); },
        opts: [{ t: 'You\'re on. (50 tickets)', if: $ => $.tickets() >= 50, go: 'r1' }, { t: 'Not today.', end: true }],
      },
      r1: { text: '*Two glasses. The Marrowshine smokes faintly and smells of a bonfire in a butcher\'s shop.* "Round ONE!"', opts: [{ t: '*Knock it back.*', check: ['gut', 4], go: 'r2', fail: 'lose' }] },
      r2: {
        text: '*Dellah slams her glass down. Your eyes water. The room tilts slightly to the left and decides to stay there.* "Round TWO!"',
        opts: [{ t: '*Knock it back.*', check: ['gut', 6], go: 'r3', fail: 'lose' }, { t: '*Make a big show of it, and tip half into the spittoon.*', check: ['show', 45], go: 'r3', fail: 'lose' }],
      },
      r3: {
        text: '*Dellah is sweating. So is the bar. So, alarmingly, is the floor.* "Round... THREE!"',
        opts: [{ t: '*Knock it back.*', check: ['gut', 8], go: 'win', fail: 'lose' }, { t: '*Point at the door: "Is that the Calliope?!" and swap glasses.*', check: ['show', 55], go: 'win', fail: 'lose' }],
      },
      win: { text: '*Dellah sways, smiles beatifically at something only she can see, and falls backwards like a felled tree. The Sweetbread erupts.*', do: $ => { $.give('ticket', 50); $.set('wonDrinking'); $.qset('drink', 20); $.xp(200); }, opts: [{ t: '*Bow.*', end: true }] },
      lose: { text: '*The floor rises to meet you like an old friend.* ... *You wake up two hours later, cuddling the spittoon, fifty tickets lighter.*', do: $ => { $.take('ticket', Math.min(50, $.tickets())); $.qset('drink', 30); $.advance(120); }, opts: [{ t: '*Groan.*', end: true }] },
      champ: { text: '*Dellah glares at you over a glass of milk.* "Rematch? ...No? Coward." *She grins.* "Buy you one anyway, champ."', opts: [bye] },
      gloat: { text: '"Back for more, lightweight? Spittoon\'s looking lonely."', opts: [bye] },
    },
  };

  // ===================================================================== GUMMY
  D.gummy = {
    start: 'hub',
    nodes: {
      hub: {
        text: '*An old man with no teeth and a magnificent beard raises a glass to you.* "*hic* Shit down. Shit down! Old Gummy remembersh everything."',
        opts: [
          { t: 'Tell me about the Bloom.', go: 'bloom' },
          { t: 'What about Old Mother?', go: 'mother' },
          { t: 'Seen anything odd lately?', go: 'odd' },
          bye,
        ],
      },
      bloom: { text: '"I remember when meat shtayed DEAD. You\'d cut a shteak and it\'d jusht... lie there. Then Abundansh made the Perpetua. Meat that growsh back. Ended hunger! For eight monthsh. Then it all grew TOGETHER." *He gestures expansively at the entire world.* "And here we are."', go: 'hub' },
      mother: { text: '"She ushed to shing. Low and sweet, at night. You could hear it from the shaloon. Ain\'t shung in a month." *He wipes his eyes.* "Shomething\'sh wrong with her, and it ain\'t natural."', go: 'hub' },
      odd: { text: '"The sheriff. Rode out north-wesht three nightsh running, end of shpring. Came back with clean bootsh." *He taps his nose.* "Who comesh back from the Rind with CLEAN BOOTSH?"', do: $ => $.set('suspectHarrow'), go: 'hub' },
    },
  };

  // ===================================================================== TOWNSFOLK
  D.townsfolk = {
    start: 'hub',
    nodes: {
      hub: {
        text: $ => $.f('herdSaved') ? GG.U.pick(['"Old Mother\'s pinking up! You hear her singing last night?"', '"Thank you, Stray. Proper cuts again."', '"First thick steak in a month. I nearly cried. I did cry, actually."']) : GG.U.pick(['"Herd\'s looking grey. Cuts are thin."', '"Don\'t go in the pasture at night. Gristlings."', '"Heard the Grand Calliope\'s coming this way. Heard that every summer."', '"Agnes is worried. When Agnes worries, I worry."']),
        opts: [bye],
      },
    },
  };

  // ===================================================================== WYNN
  D.wynn = {
    start: 'hub',
    nodes: {
      hub: {
        text: '*A bearded trader in a battered top hat tips it to you. Behind him, two Lumps are harnessed to a wagon painted every colour paint comes in.* "Wagon Wynn! Fair-ish prices, honest-ish goods! What can I do you for?"',
        opts: [
          { t: 'Show me your wares.', barter: true },
          { t: 'Where are you headed?', go: 'where' },
          { t: 'What\'s the news on the road?', go: 'news' },
          bye,
        ],
      },
      where: { text: '"East, ahead of the Calliope. Always ahead of the Calliope. You stay ahead of it, you sell to everybody. You fall behind it..." *He shrugs.* "There\'s nobody left to sell to."', go: 'hub' },
      news: { text: '"Tallowmarket\'s Bloom-walled again; cutting crews say a month. The Choir at Saint Offal is humming louder. And the Calliope bought every barrel of marrow between here and the Tooth. Every barrel. What\'s a carnival want with that much marrow?"', go: 'hub' },
    },
  };

  // ===================================================================== MARROW SHOW (generic & gate)
  D.clown = {
    start: 'hub',
    nodes: {
      hub: {
        text: '*The clown honks a small brass horn in lieu of hello. Its painted smile is very wide and very still.*',
        opts: [{ t: 'What does the Marrow Show actually do?', go: 'what' }, bye],
      },
      what: { text: '"We feel the goodness." *Honk.* "Ask Mister Marrowby. He\'s in the theatre. He\'s always in the theatre."', opts: [bye] },
    },
  };
  D.gate = {
    start: $ => $.f('showInvited') ? 'in' : $.f('gateRefused') ? 'again' : 'stop',
    nodes: {
      stop: {
        text: '*A clown with a cleaver steps into the road. Its greasepaint smile goes all the way round to its ears, which are also painted.* "Show\'s closed, friend. Private performance."',
        opts: [
          { t: 'I\'m here to see Mister Marrowby.', go: 'why' },
          { t: 'I\'m the new act. Marrowby sent for me. Didn\'t anyone tell you?', check: ['show', 40], go: 'invite', fail: 'suspicious' },
          { t: 'Advance agent\'s office, Grand Calliope. Surprise inspection.', check: ['gab', 55], go: 'invite', fail: 'suspicious' },
          { t: 'Here\'s my appointment. (50 tickets)', if: $ => $.tickets() >= 50, do: $ => $.take('ticket', 50), go: 'invite' },
          { t: 'I\'ll come back later.', end: true },
          { t: 'Then I\'ll go through you.', fight: true },
        ],
      },
      why: { text: '"Nobody sees Mister Marrowby without an appointment. Or an audition." *The cleaver taps its palm.* "We\'re not auditioning."', go: 'stop' },
      invite: {
        text: '*The clown honks twice, which is apparently approval.* "Go on in. Mister Marrowby\'s in the theatre. Don\'t touch the pump. Don\'t touch the tenor. Don\'t touch anything."',
        do: $ => { $.set('showInvited'); if ($.q('herd') < 30) $.qset('herd', 30); },
        opts: [{ t: 'Wouldn\'t dream of it.', end: true }],
      },
      suspicious: {
        text: '*The smile does not change. The grip on the cleaver does.* "Nah. Get lost before we audition you for the meat act."',
        do: $ => $.set('gateRefused'),
        opts: [{ t: 'Fine. I\'m going.', end: true }, { t: 'Make me.', fight: true }],
      },
      again: { text: '"You again. Still closed."', opts: [{ t: 'Here\'s my appointment. (50 tickets)', if: $ => $.tickets() >= 50, do: $ => $.take('ticket', 50), go: 'invite' }, { t: 'Leaving.', end: true }, { t: 'Then I\'ll go through you.', fight: true }] },
      in: { text: '"Honk. Go on in."', opts: [bye] },
    },
  };

  // ===================================================================== MARROWBY
  D.marrowby = {
    start: $ => $.f('metMarrowby') ? 'hub' : 'intro',
    nodes: {
      intro: {
        text: '*On the stage, under hissing footlights, a tall man in a scarlet coat turns with a flourish. Something moves under the coat on his left side: a second, smaller torso, grafted at the ribs, its tiny hands clapping politely.* "LADIES, gentlemen, and things in between! A visitor!" *The small torso whistles.* "Welcome to the Marrow Show. I am Mister Marrowby. This is Mister Marrowby\'s Associate. He doesn\'t speak. He applauds."',
        do: $ => $.set('metMarrowby'),
        moe: 'LESTER: *whispering* That\'s the one. MOE: He has a little man. LESTER: We have each other, Moe. Hush.',
        go: 'hub',
      },
      hub: {
        text: '"Well? The show must go on, and it costs by the minute."',
        opts: [
          { t: 'What exactly are you doing here?', go: 'what' },
          { t: 'You\'re killing Gutwater\'s Mother Herd.', go: 'accuse' },
          { t: 'I\'m here about the tenor. Moe & Lester.', if: $ => !$.f('moeFreed') && !$.has('cagekey'), go: 'tenor' },
          { t: 'Goodbye.', end: true },
        ],
      },
      what: {
        text: '"Feeding tomorrow, today! A Feedworks should FEED, don\'t you think? We draw a little marrow from a very large and very selfish animal, and deliver it to those who can appreciate it."',
        opts: [
          { t: 'And who appreciates it?', go: 'buyer' },
          { t: 'Back to business.', go: 'hub' },
        ],
      },
      buyer: {
        text: '"Our patrons wish to remain mysterious. Mystery is half of show business. The other half is invoicing."',
        opts: [
          { t: 'It\'s the Grand Calliope, isn\'t it?', check: ['gab', 50], go: 'calliope', fail: 'hub' },
          { t: 'Fine.', go: 'hub' },
        ],
      },
      calliope: { text: '*His smile tightens by a millimetre.* "Clever. The Grand Calliope pays very handsomely for Mother marrow and asks very few questions. I recommend you adopt the same policy."', do: $ => $.set('knowsCalliope'), go: 'hub' },
      accuse: {
        text: '"KILLING! Such a word." *The Associate gasps.* "She\'ll last until autumn, at least. Gutwater will move on; towns do. That\'s the beauty of the Rind, my friend: nothing stays put except the meat."',
        opts: [
          { t: 'The Calliope buys marrow, not scandal. Once the Rind knows whose pump this is, they will drop you like a dead act.', if: $ => $.f('knowsCalliope'), check: ['gab', 55], go: 'leave', fail: 'laugh' },
          { t: 'When the whole Rind hears about this, how long until your patrons cut you loose?', if: $ => !$.f('knowsCalliope'), check: ['gab', 70], go: 'leave', fail: 'laugh' },
          { t: 'This show is closing, Marrowby. Read the room. Your crowd is turning.', check: ['show', 60], go: 'leave', fail: 'laugh' },
          { t: 'What would it take for me to look the other way?', go: 'deal' },
          { t: 'Then I\'ll stop you myself.', fight: true },
          { t: 'Let\'s talk about something else.', go: 'hub' },
        ],
      },
      laugh: {
        text: '*Marrowby laughs. The Associate laughs too, a thin wheeze.* "Wonderful! You should be on the stage. Bertha, darling, show our guest out. In several pieces."',
        opts: [{ t: '*Fight.*', fight: true }],
      },
      leave: {
        text: '*A long silence. The footlights hiss. Then Marrowby sighs, and the Associate slumps.* "...The Calliope does so hate bad press. Very well! The Marrow Show is closing early this season." *He tosses you a heavy brass key and a purple ledger.* "The pump key, and our accounts. Oh, and take the tenor; he was flat anyway. Do give my regards to the Herdmother."',
        do: $ => { $.give('valvekey'); $.give('ledger'); if (!$.f('moeFreed')) $.give('cagekey'); $.set('marrowLeft'); $.xp(450, 'talked down Marrowby'); },
        opts: [{ t: 'Break a leg.', end: true }],
      },
      deal: {
        text: '*Marrowby beams.* "Now THAT is showmanship. Five hundred tickets, and a monthly cut, for telling the Herdmother it\'s a natural wasting. Natural! Ha! Things waste naturally all the time."',
        opts: [
          { t: 'Deal.', do: $ => { $.give('ticket', 500); $.set('tookMarrowDeal'); $.qset('herd', 45); $.xp(100); }, go: 'dealt' },
          { t: 'On second thoughts, no.', go: 'hub' },
        ],
      },
      dealt: { text: '"A pleasure doing business. Don\'t touch the pump on your way out."', opts: [{ t: 'Leave.', end: true }] },
      tenor: {
        text: '"Moe & Lester! Splendid voice. Voices, rather. They signed a contract. I own them now. It\'s all perfectly legal, or legal-adjacent."',
        opts: [
          { t: 'That contract\'s void. Two heads, one signature: only one of them signed.', check: ['gab', 55], go: 'void', fail: 'hub' },
          { t: 'I\'ll buy their contract. (150 tickets)', if: $ => $.tickets() >= 150, do: $ => { $.take('ticket', 150); $.give('cagekey'); $.set('boughtMoe'); }, go: 'bought' },
          { t: 'Never mind.', go: 'hub' },
        ],
      },
      void: { text: '*Marrowby pauses. The Associate counts on its tiny fingers.* "...Drat. Very well. Take them." *He tosses you a small key on a ring of tinkling bells.*', do: $ => { $.give('cagekey'); $.set('boughtMoe'); }, go: 'hub' },
      bought: { text: '"Sold! To the stranger with the questionable taste in music!" *He tosses you a key on a ring of tinkling bells.*', go: 'hub' },
    },
  };

  // ===================================================================== MOE & LESTER
  D.moe = {
    start: $ => !$.f('moeFreed') ? 'caged' : !$.f('moeDecided') ? 'freed' : 'party',
    nodes: {
      caged: {
        text: '*Behind the bars, two heads on one broad pair of shoulders turn to you. The left one, round-faced and anxious, speaks first.* "MOE: Oh, thank goodness, a customer!" *The right one, long-faced and sardonic:* "LESTER: It\'s not a customer, Moe. Customers don\'t come back here. It\'s a rescuer. Or a buyer. Either way: hello."',
        do: $ => { if ($.q('ruby') === 10) $.qset('ruby', 20); },
        opts: [
          { t: 'Ruby Teeth sent me.', if: $ => $.q('ruby') >= 10, go: 'ruby' },
          { t: 'What happened to you?', go: 'what' },
          { t: 'I\'ll get you out.', end: true },
        ],
      },
      ruby: { text: '"MOE: Ruby! Is she angry? LESTER: She\'s always angry. It\'s how she shows love. Get us out of here. The Keeper has the key: the tall fellow on the stilts."', go: 'caged' },
      what: { text: '"LESTER: We came for a better contract. MOE: And we got one! LESTER: It turned out \'regular pay\' meant they regularly drain a pint of us for the marrow tanks. MOE: Two pints. We\'re very generous."', go: 'caged' },
      freed: {
        text: '*Moe & Lester step out, stretching one body in two directions.* "MOE: Free! FREE! LESTER: Don\'t sing, Moe." *Moe sings, briefly and magnificently.* "LESTER: ...So. What now?"',
        opts: [
          { t: 'Come with me. I could use a gun, and two heads.', check: ['stat', 'charm', 5], go: 'join', fail: 'nojoin' },
          { t: 'You owe me your lives. And Lester, admit it: you want to see the Rind.', check: ['gab', 35], go: 'join', fail: 'nojoin' },
          { t: 'Go back to Ruby. She\'s worried sick.', go: 'toruby' },
        ],
      },
      join: { text: '"MOE: An adventure! LESTER: A terrible idea. MOE: You said that about the singing. LESTER: I stand by it." *Both heads nod at you.* "BOTH: Lead on."', do: $ => { $.set('moeJoined'); $.set('moeDecided'); }, opts: [{ t: 'Let\'s go.', end: true }] },
      nojoin: { text: '"LESTER: No offence, but we\'ve only just met, and the last stranger we trusted had a second torso. MOE: A little one! LESTER: We\'ll head back to Ruby\'s."', go: 'toruby' },
      toruby: {
        text: '"MOE: Ruby\'s! Hot stew! Applause! LESTER: Debts. MOE: APPLAUSE!" *They slip away, harmonising quietly, towards the way out.*',
        do: $ => { $.set('moeToRuby'); $.set('moeDecided'); $.set('moeJoined', false); const m = $.ent('moe'); if (m) { m.gone = true; m.party = false; } },
        opts: [{ t: 'Take care, both of you.', end: true }],
      },
      party: {
        text: $ => GG.U.pick(['"MOE: Lovely day for it! LESTER: For what? MOE: For IT."', '"LESTER: I\'d like it noted that I was against this. MOE: Against what? LESTER: Generally."', '"MOE: Should we sing? LESTER: No."']),
        opts: [
          { t: 'How are you two holding up?', go: 'banter' },
          { t: 'Go back to Ruby\'s and wait for me there.', go: 'toruby' },
          { t: 'Let\'s keep moving.', end: true },
        ],
      },
      banter: { text: '"MOE: Wonderful! LESTER: Bleeding. Slightly. MOE: Wonderfully!"', go: 'party' },
    },
  };
  D.moeruby = {
    start: 'hub',
    nodes: {
      hub: {
        text: '"MOE: Our hero! LESTER: Our creditor, technically. MOE: Ruby\'s made us headliners again! LESTER: It\'s a tent, Moe. MOE: A HEADLINE tent."',
        opts: [
          { t: 'Want to come along with me after all?', check: ['stat', 'charm', 4], go: 'join', fail: 'stay' },
          bye,
        ],
      },
      join: { text: '"MOE: Yes! LESTER: ...Fine. Ruby will kill us. MOE: She\'ll kill us LATER."', do: $ => { $.set('moeToRuby', false); $.set('moeJoined'); $.join('moe_town'); }, opts: [{ t: 'Let\'s go.', end: true }] },
      stay: { text: '"LESTER: We\'ve got a show. Maybe next season."', opts: [bye] },
    },
  };

  // ===================================================================== OBJECTS
  D.mother = {
    start: $ => $.f('herdSaved') || $.q('herd') === 40 ? 'healthy' : 'look',
    nodes: {
      look: {
        text: '*Old Mother rises from the pasture like a hill of raw, folded meat, breathing slow and deep. Up close she smells of iron and warm bread. Her folds are greyish and slack, and here and there a row of tiny puckered scars runs along her flank, neat as stitching.*',
        opts: [
          { t: '*Read the meat: probe the scars with your knife.*', if: $ => !$.has('coupling') && $.q('herd') < 20, check: ['butchery', 30], go: 'found', fail: 'nothing' },
          { t: '*Examine the puckered scars like a doctor would.*', if: $ => !$.has('coupling') && $.q('herd') < 20, check: ['doctor', 35], go: 'found', fail: 'nothing' },
          { t: '*Hum the herding tune and run your hands along her flank.*', if: $ => !$.has('coupling') && $.q('herd') < 20, check: ['wrangle', 35], go: 'found', fail: 'nothing' },
          { t: '*Cut yourself a slab.*', if: $ => !$.f('cutMother'), do: $ => { $.set('cutMother'); $.give('gristle', 2); }, go: 'cut' },
          { t: '*Leave her be.*', end: true },
        ],
      },
      found: {
        text: '*Under a fold, your fingers find something hard and cold: a brass coupling, greased and screwed right into her flesh. A hose stump trails from it down into the ground, heading north-west. Stamped into the brass: ABUNDANCE FEEDWORKS 9.* *Old Mother shudders as you pull it free.*',
        do: $ => { $.give('coupling'); $.xp(150); },
        opts: [{ t: '*Step back.*', end: true }],
      },
      nothing: { text: '*You find nothing but meat. A great deal of meat. It is warm and it is sad.*', opts: [{ t: '*Step back.*', end: true }] },
      cut: { text: '*You carve a clean slab from a low fold. It closes up behind your knife, slowly, like a sigh. Across the pasture, a rancher yells "LICENCE!" and then, seeing your face, decides it can wait.*', opts: [{ t: '*Step back.*', end: true }] },
      healthy: { text: '*Old Mother is pinker now, her folds plump and warm. Deep inside her, something hums a low, contented note that you feel in your teeth.*', opts: [{ t: '*Pat her.*', end: true }] },
    },
  };
  const killNest = $ => { $.destroy(); $.inc('nestsDone'); if ($.v('nestsDone') >= 3 && $.q('bounty') === 10) $.qset('bounty', 20); };
  D.nest = {
    start: 'look',
    nodes: {
      look: {
        text: '*A knot of tumorous flesh the size of a wagon wheel, pulsing, with half-formed Gristlings budding from it like grapes. One of them opens a tiny eye at you.*',
        opts: [
          { t: '*Cut it out at the root.*', check: ['butchery', 30], okDo: $ => { killNest($); $.give('tumorsac', 2); $.xp(80); }, go: 'cut', failDo: $ => { killNest($); $.hurt(GG.U.ri(6, 12)); $.xp(40); }, fail: 'splash' },
          { t: '*Burn it out with a stick of dynamite.*', if: $ => $.has('dynamite'), do: $ => { $.take('dynamite'); killNest($); $.xp(80); }, go: 'burn' },
          { t: '*Melt it with a bile jar.*', if: $ => $.has('biljar'), do: $ => { $.take('biljar'); killNest($); $.xp(80); }, go: 'burn' },
          { t: '*Hack at it until it stops.*', do: $ => { killNest($); $.hurt(GG.U.ri(4, 10)); $.xp(40); }, go: 'splash' },
          { t: '*Leave it.*', end: true },
        ],
      },
      cut: { text: '*You slice in a neat circle and lift the whole thing out like the core of an apple. Two tumour sacs come away clean. The ground stops twitching.*', opts: [{ t: 'Done.', end: true }] },
      burn: { text: '*It goes up with a whump and a smell like a barbecue in a hospital. When the smoke clears, the nest is a black crater.*', opts: [{ t: 'Done.', end: true }] },
      splash: { text: '*It bursts. Hot acid spatters your arms. The nest dies, hissing, and so does a little of your dignity.*', opts: [{ t: 'Ow.', end: true }] },
    },
  };
  D.pump = {
    start: $ => $.f('pumpStopped') ? 'off' : 'on',
    nodes: {
      on: {
        text: '*The pump thumps like a great iron heart. Through a sight-glass you watch thick pink marrow surge through the pipes, IN from the east, from Gutwater, and on into the tank wagons. Beneath a sign reading MAIN VALVE sits a brass keyhole shaped like a clown\'s nose.*',
        opts: [
          { t: '*Turn the valve key and shut it down.*', if: $ => $.has('valvekey'), do: $ => { $.stopPump(300); $.alarm(false); }, go: 'stopped' },
          { t: '*Reverse the flow. Send every drop back to Old Mother.*', check: ['tinker', 50], okDo: $ => { $.set('pumpReversed'); $.stopPump(550); $.blowback(); }, go: 'reversed', fail: 'nope' },
          { t: '*Jam the governor so the pump seizes.*', check: ['tinker', 25], okDo: $ => { $.stopPump(300); $.alarm(true); }, go: 'jammed', fail: 'nope' },
          { t: '*Smash the gauges and rip out the hoses.*', do: $ => { $.stopPump(250); $.hurt(GG.U.ri(3, 8)); $.alarm(true); }, go: 'smashed' },
          { t: '*Leave it.*', end: true },
        ],
      },
      nope: { text: '*You fiddle with levers and pipes. Something hisses at you. You decide to stop before the pump decides for you.*', go: 'on' },
      stopped: { text: '*The key turns with a satisfying clunk. The great iron heart slows... stutters... and stops. In the silence you can hear marrow dripping, and somewhere far off, very faintly, a low note that might be Old Mother breathing out.*', opts: [{ t: 'Done.', end: true }] },
      reversed: { text: '*You wrench the reversing lever over. The pump coughs, groans, and then SINGS, a deep note that shakes rust from the ceiling. Every hose in the building bulges. In the theatre, a marrow tank bursts with a sound like the world\'s largest sneeze. The marrow is going home.*', opts: [{ t: 'Done.', end: true }] },
      jammed: { text: '*You wedge a spanner into the governor. The pump screams, shudders and seizes with a BANG that echoes through every corridor of the station.*', opts: [{ t: 'Uh-oh.', end: true }] },
      smashed: { text: '*Glass, brass, marrow. Mostly marrow. The pump dies in a hiss of pink steam, and the noise brings running feet.*', opts: [{ t: 'Uh-oh.', end: true }] },
      off: { text: '*The pump is silent. A slow trickle of marrow drips from a burst seam.*', opts: [{ t: 'Leave.', end: true }] },
    },
  };
  D.board = {
    start: 'look',
    nodes: {
      look: {
        text: '*Notices nailed over notices.* "BOUNTY: 10 TICKETS per GRISTLING killed in or around Gutwater. 100 TICKETS for burning out all three TUMOUR NESTS in the pasture. Collect at the Sheriff\'s office. — C. HARROW." *Older notices underneath:* "LOST: one Lump, answers to Brisket." "RUBY\'S RARITIES: CLOSED UNTIL FURTHER NOTICE." "NO CUTTING THE MOTHER WITHOUT LICENCE."',
        opts: [
          { t: '*Take the bounty.*', if: $ => !$.q('bounty'), do: $ => { $.qset('bounty', 10); if ($.v('nestsDone') >= 3) $.qset('bounty', 20); }, end: true },
          { t: '*Leave.*', end: true },
        ],
      },
    },
  };
})();
