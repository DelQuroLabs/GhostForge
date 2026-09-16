// Style packs: "write like …" support for the offline Story Engine + AI enhancement.
//
// A pack NEVER copies any published text — it only steers original prose via
// sensory palette, atmospheric flavor sentences (same token grammar as the
// core templates), nonfiction voice lines, and an AI style directive.

export type StylePack = {
  id: string;
  label: string;
  aliases: string[];
  // sensory noun-phrases (replace the genre SENSORY line when matched)
  sensory: string[];
  // standalone flavor sentences using fiction token grammar
  // ({N} {s} {o} {p} {A} {M} {V} {place} {place2} {object} {goal} {v:} {w:} {u:} {is} {is3} {are} {has3})
  flavor: string[];
  // nonfiction voice paragraphs; {t} = topic, {outcome} = outcome
  nf: string[];
  // one-line voice direction for AI enhancement
  directive: string;
};

const P: StylePack[] = [
  {
    id: 'epic',
    label: 'Epic like The Lord of the Rings',
    aliases: ['tolkien', 'lord of the rings', 'lotr', 'sanderson', 'stormlight', 'wheel of time', 'rothfuss', 'jordan', 'epic fantasy', 'malazan', 'erikson', 'epic like'],
    sensory: ['pine resin and horse sweat', 'cold mountain air and woodsmoke', 'wet stone and old oaths', 'snowmelt and saddle leather', 'torch oil and ancient dust'],
    flavor: [
      `Somewhere far above {place}, the old banners {u:stir} in a wind that {w:smell} of snow and distant war. {N} {v:feel} the weight of every oath ever sworn beneath them.`,
      `{N} {v:think} of the old songs then — the ones {M} {w:sing} by the fire when the world {is3} still young and unbroken.`,
      `The road ahead {w:run} into legend, and {N} {v:know} with sudden clarity that songs would be sung of this day, for good or ill.`,
      `{A} {w:rest} a hand on {p} shoulder. "Courage, my friend," {A} {w:murmur}. "The long night {is3} always darkest before the dawn."`,
      `{N} {v:lift} {p} eyes to the mountains ringing {place2}, white and pitiless and beautiful, and {v:remember} why {s} {v:fight} at all.`,
      `Oaths {u:hold} tighter than iron, {M} always {w:say}, and {N} {v:feel} every one of them now, links of fire around {p} heart.`,
    ],
    nf: [
      `Think of this chapter as a quest, not a chore. Every hero's journey — including yours toward {outcome} — begins with a single committed step taken before you feel ready.`,
      `The old stories endure because they encode truth: small fellowships, faithfully kept habits, and courage on ordinary days change the fate of kingdoms — and of {t}.`,
      `Keep a chronicle. Heroes who write down the journey remember the lessons; heroes who don't repeat the wilderness. Your tracker is your chronicle.`,
    ],
    directive: 'high-epic voice: mythic stakes, lyrical landscape, oaths and songs, earnest heroic warmth',
  },
  {
    id: 'grimdark',
    label: 'Grimdark like Game of Thrones',
    aliases: ['grimdark', 'martin', 'game of thrones', 'asoiaf', 'abercrombie', 'first law', 'logan', 'lawrence', 'jorg'],
    sensory: ['the iron tang of blood and rain', 'wet ash and old sweat', 'sour wine and candle smoke', 'mud churned with something worse', 'cold iron and cheaper perfume'],
    flavor: [
      `Mercy {is3} a luxury {place} {w:afford} to no one, and {N} {v:learn} long ago to stop asking for it.`,
      `{N} {v:count} the exits out of habit — three — and {v:wonder} which of the smiling faces would be the first to lie.`,
      `Every kindness in this city {w:carry} a price tag, and {N} {v:know} better than to ask what it {is3}.`,
      `{V} {w:smile} the way wolves {u:smile}, all teeth and patience, and {N} {v:feel} {p} hand drift toward {p} weapon.`,
      `Honor {w:get} better people than {o} killed, {M} always {w:say}. {N} {v:try} to remember that and {v:fail} as usual.`,
      `The rain over {place2} {w:wash} nothing clean. It only {w:move} the blood from the stones into the gutters, where it {w:belong}.`,
    ],
    nf: [
      `Let's be blunt: motivation is a fair-weather friend who deserts you by February. This chapter builds something sturdier for {outcome} — a system that works when you feel like garbage.`,
      `Everyone wants the throne of {t}. Almost no one wants the ledgers, the early mornings, the boring repetitions. You will do the boring repetitions. That's the whole separation.`,
      `Assume you will fail, cheat, and bargain with yourself. The plan below survives all three, because it was built for a flawed human, not a hero.`,
    ],
    directive: 'grimdark voice: brutal pragmatism, gallows wit, moral murk, no one is safe, victories cost',
  },
  {
    id: 'noir',
    label: 'Hardboiled noir detective',
    aliases: ['noir', 'chandler', 'hammett', 'hardboiled', 'hard-boiled', 'marlowe', 'spade', 'sam spade', 'detective', 'leather', 'bogart'],
    sensory: ['cheap whiskey and rain', 'wet concrete and exhaust', 'gun oil and yesterday coffee', 'cigarette smoke and damp wool', 'neon buzz and hot asphalt'],
    flavor: [
      `The rain over {place} {w:fall} like it {w:owe} the city money, and {N} {v:stand} in it anyway, collar up, patience down.`,
      `{N} {v:read} the room the way {s} {v:read} a bad alibi — slow, twice, and with no faith in any of it.`,
      `"Everybody lies," {M} always {w:say}. "The floor lies. The clock lies. Especially the dame lies." {N} {v:wait} to find out which one {w:lie} first.`,
      `{A} {w:settle} into the booth like trouble with good cheekbones. "You look terrible," {A} {w:say}. "It's my best feature," {s} {v:answer}.`,
      `The office {w:smell} of dust and dead leads. {N} {v:pour} two fingers of the cheap stuff and {v:toast} the one case {s} never {v:solve} — {o}.`,
      `In this town the truth {w:wear} a false mustache and {w:answer} to three names. {N} {v:intend} to strip it bare anyway.`,
    ],
    nf: [
      `Forget inspiration. Inspiration is the dame who walks into your office, promises everything, and skips town by Thursday. You need a system for {outcome} that works hungover, heartbroken, and behind on rent.`,
      `Here is the case file on yourself: your habits are the suspects, your calendar is the alibi, and your tracker is the witness that never lies. Interrogate all three weekly.`,
      `Small clues solve big cases. Ten minutes a day on {t} looks like nothing — until the nothing adds up to an arrest. Work the small clues.`,
    ],
    directive: 'hardboiled noir voice: wisecracking first-person grit, similes, rain and neon, world-weary honor',
  },
  {
    id: 'cozy',
    label: 'Cozy mystery like Agatha Christie',
    aliases: ['cozy', 'christie', 'agatha', 'poirot', 'marple', 'miss marple', 'miss marple', 'poirot', 'mystery like'],
    sensory: ['old paper and Earl Grey', 'dust and lemon polish', 'fresh scones and woodsmoke', 'pipe smoke and damp wool', 'wet leaves and turned earth'],
    flavor: [
      `The kettle {w:sing} on the hob, and for one blessed moment {place} {w:feel} like the sort of village where nothing dreadful ever {w:happen}. It {is3} a lie, of course. A comforting one.`,
      `{N} {v:arrange} the clues the way {s} {v:arrange} flowers — by color, by height, and with quiet suspicion toward the tallest one.`,
      `"Everyone has a motive, dear," {M} {w:say}, pouring the tea with the precision of a hanging judge. "It is only a question of opportunity and pudding."`,
      `{A} {w:bustle} in with gossip and gooseberry tart in equal measure. {N} {v:accept} both gratefully. One of them would prove useful.`,
      `The garden behind the cottage {w:sleep} under early frost, every secret tucked in neat as a folded napkin. {N} {v:intend} to unfold every one.`,
      `Murder, {N} {v:reflect}, {is3} rather like a soufflé — it {w:collapse} the moment you {u:poke} it. {S} {v:fetch} a very long spoon.`,
    ],
    nf: [
      `Put the kettle on. This chapter is best read slowly, with tea, because {outcome} is built the cozy way — one warm, manageable ritual at a time.`,
      `Think of your habits as a village: every small routine a friendly neighbor, every tracker mark a lit window. We are simply making the village livelier, one cottage at a time.`,
      `No scolding here. Missed a day? The tart is still warm and the case is still solvable. Forgive, note the clue, and carry on tomorrow.`,
    ],
    directive: 'cozy mystery voice: warm village charm, sharp amateur sleuthing, gentle humor, tea and order restored',
  },
  {
    id: 'romantasy',
    label: 'Romantasy like ACOTAR / Fourth Wing',
    aliases: ['romantasy', 'maas', 'sarah j', 'acotar', 'fourth wing', 'yarros', 'rebecca yarros', 'romance fantasy', ' romantasy'],
    sensory: ['night jasmine and woodsmoke', 'starlight and cold wine', 'leather and lightning-struck air', 'rosewater and sword oil', 'ink and winter apples'],
    flavor: [
      `{A} {w:stand} too close in the torchlight, and {N} {v:forget} — briefly, catastrophically — every reason that {is3} a terrible idea.`,
      `Power {w:crackle} under {p} skin like a storm looking for somewhere to land. {N} {v:clench} {p} fists and {v:refuse} to be the lightning rod.`,
      `"Careful," {V} {w:murmur}, voice like velvet over a blade. "I bite." {N} {v:lift} {p} chin. "So do I."`,
      `The bond between them {w:sing} like a plucked string, inconvenient and impossible and utterly indifferent to {p} plans.`,
      `{N} {v:train} until {p} hands {u:shake} and {p} lungs {u:burn}, because weakness {is3} a luxury and love {is3} a battlefield {s} {v:intend} to win.`,
      `Above {place2}, the stars {w:burn} cold and perfect. {N} {v:wish} on none of them. Wishes {u:change} nothing. Teeth and training {u:change} everything.`,
    ],
    nf: [
      `This chapter asks something fierce of you: train for {outcome} like your wings depend on it — because the life you want is on the other side of the reps.`,
      `Romance your own potential. Court the habit, flirt with the streak, and commit like the bond depends on it. Small daily devotion beats grand yearly gestures.`,
      `Rest is part of the flight plan. Even dragons land. Schedule recovery the way you schedule training, and return to {t} sharper.`,
    ],
    directive: 'romantasy voice: slow-burn tension, fierce heroine energy, magic as emotion, wings and teeth and longing',
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk like Neuromancer',
    aliases: ['cyberpunk', 'gibson', 'neuromancer', 'blade runner', 'shadowrun', 'morgan', 'altered carbon', 'cyber punk', 'william gibson'],
    sensory: ['ozone and recycled air', 'hot circuitry and cold metal', 'engine grease and burnt coffee', 'rain on neon-slick chrome', 'fry-oil and ion discharge'],
    flavor: [
      `The sprawl below {place} {w:glitter} like a circuit board drowned in rain, and {N} {v:jack} in with the usual prayer: please, not the black ice.`,
      `{N} {v:watch} the data rain past — credit trails, lies, ghosts of deleted selves — and {v:fish} for the one packet that {w:matter}.`,
      `"Meat is cheap," {M} always {w:say}, tapping {p} chrome temple. "Memory is the currency. Spend yours like it {is3} counterfeit."`,
      `{A} {w:ghost} through the firewall with insulting ease. Somewhere a corporate alarm {w:clear} its throat. {N} {v:run}.`,
      `Street myth {w:say} the rogue AI in the {place2} grid {w:dream} in dead languages. {N} {v:intend} to ask it personally.`,
      `{p} implants {u:itch} the way they always {w:do} before violence — phantom static, old nerves complaining. {N} {v:ignore} them and {v:draw} anyway.`,
    ],
    nf: [
      `Your brain is legacy hardware running modern demands — no wonder {t} keeps crashing. This chapter installs an upgrade: external systems that carry the load your wetware can't.`,
      `Think in systems, not motivation. Automate the start, log the data, review the dashboard weekly. You are the sysadmin of {outcome}; act like it.`,
      `Attention is the only currency the corps can't print. Spend yours deliberately: block the feed, batch the noise, and route prime cycles to the mission.`,
    ],
    directive: 'cyberpunk voice: chrome-and-rain neon grit, street-tech slang, corporate dread, high tech low life',
  },
  {
    id: 'spaceopera',
    label: 'Space opera like Dune',
    aliases: ['dune', 'herbert', 'frank herbert', 'asimov', 'foundation', 'space opera', 'hyperion', 'simmons', 'star wars', 'reynolds', 'expanse', 'banks', 'culture'],
    sensory: ['ozone and recycled air', 'hot sand and spice-wood', 'engine grease and burnt coffee', 'sterile medbay and copper fear-sweat', 'ion discharge like a struck match'],
    flavor: [
      `The void beyond the viewport {w:press} close and cold, and {N} {v:feel} very small and very alive inside the thin shell of the ship.`,
      `{M} {w:quote} the old litany against fear, voice steady as station-keeping thrusters, and {N} {v:breathe} with it, in and out, until {p} hands {u:still}.`,
      `Planets {u:turn} below like slow coins, each one a wager {N} {v:refuse} to lose. {Pc} {w:wait} somewhere in that glittering dark.`,
      `"The spice, the signal, the throne — it {is3} all the same hunger," {A} {w:say}. {N} {v:consider} that and {v:find} no comfort in it.`,
      `Alarms {u:wail} softly on the command deck. {N} {v:fasten} in, {v:check} the seals twice, and {v:offer} the dark a bargain it better {b:take}.`,
      `Empires {u:rise} and {u:fall} on slower tides than this, but {N} {v:live} on the fast tide now — heartbeat to heartbeat, burn to burn.`,
    ],
    nf: [
      `Think at imperial scale but act at human scale: {outcome} is a planet, and planets are moved one orbit — one week, one habit — at a time.`,
      `The litany against procrastination: I will face my task. I will permit it to be small. And when the resistance has gone, only the done thing will remain.`,
      `Build your house in order: one mission ({t}), one council (your weekly review), one law (never miss twice). Empires run on less.`,
    ],
    directive: 'space opera voice: vast cosmic scale, destiny and prophecy, desert mysticism, houses and empires',
  },
  {
    id: 'gothic',
    label: 'Gothic like Dracula / Poe',
    aliases: ['gothic', 'poe', 'edgar allan', 'dracula', 'stoker', 'bram stoker', 'frankenstein', 'shelley', 'wuthering', 'bronte', 'du maurier', 'jackson', 'shirley jackson'],
    sensory: ['damp earth and candle smoke', 'mildew and something sweet underneath', 'cold stone and candle wax', 'dust on velvet no one touches', 'rain trapped in a walled garden'],
    flavor: [
      `The house — for {place} {is3} a house the way a wolf {is3} a dog — {w:watch} {o} arrive with all its dark windows, and not one of them {w:blink}.`,
      `{N} {v:walk} corridors that {u:remember} footsteps {s} never {v:take}, past portraits whose eyes {u:follow} with ancestral disapproval.`,
      `"The walls keep what they {w:catch}," {M} {w:whisper}, and the candle between them {w:gutter} as if in agreement. {N} {v:believe} it completely.`,
      `Midnight {w:settle} over {place2} like black water over a drowned thing. Somewhere below, something patient {w:turn} in its sleep.`,
      `{N} {v:find} letters tied with ribbon the color of dried blood, and {v:read} them though every instinct {u:scream} otherwise. Knowledge {is3} its own haunting.`,
      `Grief {w:live} in the east wing, {A} {w:say} — it {w:take} its meals alone and {w:play} the piano when the moon {is3} full. {N} {v:intend} to pay it a visit.`,
    ],
    nf: [
      `Every house has a locked room, and yours holds {t}. This chapter hands you the key — but you must turn it yourself, preferably before midnight, metaphorically speaking.`,
      `Do not fear the shadows on your calendar; name them. A dread scheduled for ten minutes shrinks to its true size. Unnamed, it haunts the whole mansion.`,
      `Keep a commonplace book of small victories. Even crumbling houses stand on ledgers of kept stones. Lay one stone — one action — daily.`,
    ],
    directive: 'gothic voice: crumbling grandeur, dread-soaked atmosphere, doubles and ghosts, beauty in decay',
  },
  {
    id: 'thriller',
    label: 'Pacy thriller like Lee Child',
    aliases: ['thriller', 'lee child', 'reacher', 'jack reacher', 'dan brown', 'da vinci', 'patterson', 'flynn', 'gone girl', 'gillian flynn', 'coben', 'harlan', 'child like', 'brown like'],
    sensory: ['gun oil and cheap coffee', 'wet concrete and exhaust', 'adrenaline copper on the tongue', 'leather and jet fuel', 'rain on hot asphalt'],
    flavor: [
      `Sixty seconds. That {is3} all {N} {v:have} before the window {w:close} for good. {S} {v:move}.`,
      `{N} {v:clock} the exits, the cameras, the weight of the silence — then {v:act} before doubt could file its paperwork.`,
      `The message {w:burn} a hole in {p} pocket: four words, no signature, everything to lose. {N} {v:read} it once more and {v:run}.`,
      `"Talk fast," {V} {w:say}. "I get bored, people get hurt." {N} {v:talk} fast. {N} {v:talk} very fast.`,
      `{A} {w:cover} the door while {N} {v:work} the lock, fingers steady, heart hammering out a countdown only {s} could {b:hear}.`,
      `Later there would be time for fear. Now there {is3} only the next three meters of corridor and the decision waiting at the end of it.`,
    ],
    nf: [
      `No throat-clearing. Here is the op plan for {outcome}: one target, one ten-minute insertion per day, weekly debrief on Sundays. Execute.`,
      `Hesitation kills momentum faster than failure does. Decide in sixty seconds, act in ten minutes, review on Sunday. Speed is a skill; this chapter drills it.`,
      `Debrief every week like lives depend on it — because the life that depends on it is yours. What worked, what didn't, next move. Sixty seconds. Go.`,
    ],
    directive: 'pacy thriller voice: short punches, ticking clocks, competence under pressure, cliffhanger momentum',
  },
  {
    id: 'literary',
    label: 'Literary like Booker winners',
    aliases: ['literary', 'ishiguro', 'kazuo', 'tartt', 'donna tartt', 'franzen', 'franzen', 'pullet', 'pulitzer', 'booker', 'sebald', 'woolf', 'virginia woolf', 'austen'],
    sensory: ['rain on warm pavement', 'old books and bergamot tea', 'salt air and sunscreen', 'cut grass and gasoline', 'lilac after rain'],
    flavor: [
      `{N} {v:understand}, with the particular clarity of late afternoon light, that nothing would be explained and everything would matter anyway.`,
      `Memory {w:arrive} uninvited, as it always {w:do} — the smell of {place} in another season, a voice {N} can no longer quite {b:place}.`,
      `{M} {w:fold} the letter along its old creases, and {N} {v:watch} the small precise gesture the way one {w:watch} weather: for what it {w:promise} of storms.`,
      `It {is3} possible, {N} {v:think}, to love a place and still need to leave it; to hold two truths the way {s} {v:hold} {p} cup, carefully, without spilling.`,
      `The conversation with {A} {w:stay} with {o} for days, accreting meaning like nacre around grit — irritation first, then, uncomfortably, pearl.`,
      `Above {place2}, the sky {w:practice} its evening ambiguity. {N} {v:pardon} it. {N} {v:pardon} nearly everything, these days, except {o}.`,
    ],
    nf: [
      `Beneath the tactics of {t} lies a quieter question: who are you becoming, one ordinary day at a time? This chapter attends to the tactics; keep the question beside you.`,
      `Attention is the rarest form of generosity, Simone Weil wrote — and you may spend it on yourself first. Ten deliberate minutes daily is not indulgence. It is craft.`,
      `Do not narrate your life as a failure with better intentions. Revise the draft: one kept promise at a time, until the character of you becomes someone who finishes.`,
    ],
    directive: 'literary voice: luminous interiority, precise imagery, moral complexity, sentences to underline',
  },
  {
    id: 'sparse',
    label: 'Spare like Hemingway',
    aliases: ['hemingway', 'ernest hemingway', 'sparse', 'minimalist', 'minimalism', 'mccarthy', 'cormac', 'carver', 'raymond carver', 'didion'],
    sensory: ['salt wind off the water', 'espresso and rain', 'cut grass and gasoline', 'old paperbacks and dust', 'clean linen and cold air'],
    flavor: [
      `{N} {v:wake}. {N} {v:dress}. {N} {v:face} the day the way {s} {v:face} everything now: head-on and without comment.`,
      `The room {is3} small and clean. {N} {v:like} it that way. Small and clean {is3} something you can {b:trust}.`,
      `{A} {w:pour} the coffee. They {u:drink} it black. Nobody {w:say} what needed saying. It {is3} said anyway.`,
      `Pain {is3} information. {N} {v:file} it and {v:move} on. The work {is3} the work.`,
      `Outside {place}, the weather {w:do} what weather {w:do}. {N} {v:watch} it and {v:feel} nothing {s} {v:need} to name.`,
      `{M} {w:nod} once. It {is3} enough. Between people who {u:know}, one nod {is3} a whole conversation.`,
    ],
    nf: [
      `Do the small thing. Every day. That is the chapter. The rest is commentary — useful commentary, but commentary.`,
      `Track it. One mark. Do not buy an app. Do not optimize the pen. Make the mark. The mark is the system.`,
      `Miss once: accident. Miss twice: decision. Never twice. Start again immediately. That is all.`,
    ],
    directive: 'spare voice: short declarative sentences, iceberg emotion, concrete nouns, zero ornament',
  },
  {
    id: 'ya',
    label: 'YA adventure like Harry Potter',
    aliases: ['harry potter', 'rowling', 'hunger games', 'collins', 'suzanne collins', 'percy jackson', 'riordan', 'rick riordan', 'divergent', 'roth', 'maze runner', 'dashner', 'ya ', 'young adult', 'narnia', 'lewis', 'c.s. lewis'],
    sensory: ['vanilla and cut grass', 'fresh bread and lavender', 'rain on warm pavement', 'old books and bergamot tea', 'salt air and sunscreen'],
    flavor: [
      `Being the chosen one {is3} mostly paperwork and running, {N} {v:decide} — with occasional moments of total, heart-pounding awesome.`,
      `{A} {w:grin} the grin that always {w:spell} trouble with a capital T. "I have a plan," {A} {w:say}. {N} {v:groan}. {N} {v:follow} anyway.`,
      `The map of {place} {w:glow} faintly under {p} fingers, and {N} {v:feel} that fizzy yes spreading through {p} chest. Adventure: accepted.`,
      `"Nobody my age should have to save the world before exams," {N} {v:mutter}. {M} {w:laugh}. "And yet here we {are}."`,
      `{N} {v:cheer} loud enough to startle birds off {place2}. Some victories {u:deserve} noise. This one {w:deserve} a whole parade.`,
      `Fear {w:knock} hard in {p} chest, but underneath it something braver {w:knock} back. {N} {v:listen} to the braver thing.`,
    ],
    nf: [
      `Plot twist: you are the main character, and main characters train. This chapter is your training montage for {outcome} — cue the music.`,
      `Every hero gets a quest log. Yours has one quest: ten minutes of {t}, daily. Side quests optional. Showing up mandatory.`,
      `Failed a day? Even chosen ones face-plant. The comeback chapter starts immediately — heroes don't wait for Mondays.`,
    ],
    directive: 'YA voice: big heart, fast friendship, quippy courage, wonder-first adventure, feelings named out loud',
  },
  {
    id: 'horror',
    label: 'Horror like Stephen King',
    aliases: ['stephen king', 'king', 'lovecraft', 'h.p. lovecraft', 'cosmic horror', 'straub', 'peter straub', 'hill', 'joe hill', 'jackson', 'shirley jackson', 'horror like', 'clive barker'],
    sensory: ['mildew and something sweet underneath', 'copper and rot', 'damp earth and candle smoke', 'stale air and old sweat', 'bleach failing to cover something worse'],
    flavor: [
      `Small towns like {place} {u:keep} their secrets the way some people {u:keep} spiders — in jars, in the dark, and poorly.`,
      `{N} {v:tell} {r} it {is3} only the wind. It {is3} a fine theory. It {w:last} right up until the wind {w:knock} twice and {w:wait} to be let in.`,
      `Childhood ended the summer the thing under {place2} {w:learn} {p} name. {N} {v:remember} the exact sound. {N} {v:wish} {s} {v:remember} nothing.`,
      `{M} {w:mark} the doors with salt and symbols and stubbornness. "It {w:win} time," {M} {w:say}. "Time {is3} all it ever {w:win}."`,
      `The phone {w:ring} at the empty house. {N} {v:count} the rings — one, two, seven — and {v:understand} it would not stop until {s} {v:answer}.`,
      `Some doors in this world {u:open} both ways, {A} {w:say}. {N} {v:stare} at the cellar dark and {v:decide} to believe it, the way you {u:believe} in tetanus shots.`,
    ],
    nf: [
      `Here is the scary part, stated plainly: nobody is coming to fix {t} for you. Here is the scarier part: that means you get to. This chapter shows how.`,
      `Fear loves vague dread and hates a schedule. Give your dread a ten-minute appointment daily and watch it shrink to appointment size.`,
      `Keep the light on: one tracker, one weekly review, one honest sentence about what worked. Monsters — including procrastination — hate documentation.`,
    ],
    directive: 'working-class horror voice: blue-collar warmth, creeping dread, childhood fears, evil in small towns',
  },
  {
    id: 'historical',
    label: 'Historical like Ken Follett',
    aliases: ['historical', 'follett', 'ken follett', 'mantel', 'hilary mantel', 'aubrey', 'o’brian', "o'brian", 'cornwell', 'bernard cornwell', 'gabaldon', 'outlander', 'pillars'],
    sensory: ['horse and harness leather', 'woodsmoke and boiled wool', 'ink and pipe tobacco', 'fresh-turned earth and rain', 'tallow and sea salt'],
    flavor: [
      `History would record the battle for {place} in three dry lines. {N} {v:live} every muddy, bloody hour of it, and {v:remember} the rain most of all.`,
      `{M} {w:unroll} the map with the care of a priest at the altar. Borders {u:shift} like sandbars. Men {u:die} for the difference.`,
      `Bread {is3} politics, {A} {w:say}, breaking the loaf with work-rough hands. Who eats, who starves, who decides — it {is3} all the same question.`,
      `{N} {v:write} the day into the ledger by candlelight: the dead counted, the living fed, the debt to tomorrow marked in red. Someone must keep the tally.`,
      `The cathedral bells over {place2} {u:ring} for victory, but {N} {v:hear} only the names of the ones who would never hear bells again.`,
      `Empires {u:promise} nothing and {u:take} everything, {V} {w:say} almost gently. {N} {v:meet} those old eyes and {v:refuse} to look away first.`,
    ],
    nf: [
      `Cathedrals were raised one stone at a time by people who never saw the spire. Your {outcome} rises the same way: one kept stone — one kept day — at a time.`,
      `Keep books like a steward: income of effort, expenses of distraction, tallied weekly. What gets ledgered gets built.`,
      `Play the long reign. Ten minutes daily compounds like interest in a merchant house — slowly, then suddenly, then permanently.`,
    ],
    directive: 'historical epic voice: lived-in period texture, builders and battles, ledgers and loaves, grounded sweep',
  },
];

export const STYLE_PRESETS = P.map((p) => ({ id: p.id, label: p.label }));

/** Match free text ("like Harry Potter", "noir detective") to a style pack. */
export function matchStyle(text: string | undefined | null): StylePack | null {
  const t = (text ?? '').toLowerCase().trim();
  if (!t) return null;
  let best: StylePack | null = null;
  let bestLen = 0;
  for (const p of P) {
    for (const a of p.aliases) {
      if (a && t.includes(a) && a.length > bestLen) {
        best = p;
        bestLen = a.length;
      }
    }
  }
  return best;
}

/** AI-enhancement voice direction line for a style string ('' when unmatched/blank). */
export function styleDirective(text: string | undefined | null): string {
  const p = matchStyle(text);
  if (!p) return '';
  return `Voice: ${p.directive}. (Original prose in a similar spirit — never reproduce any published text.)`;
}
