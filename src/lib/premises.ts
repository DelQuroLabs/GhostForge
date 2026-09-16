// Premise Idea Engine — powers the "Surprise me" dice.
// Small curated pools per genre family combine into millions of unique premises.
// Slots repeat safely: the filler never reuses a pool value twice in one premise.

type Pools = Record<string, string[]>;
type FamPack = { t: string[]; pools: Pools };

const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)]!;
const cap = (s: string): string =>
  s.replace(/(^|[.!?]\s+)([a-z])/g, (_m: string, pre: string, ch: string) => pre + ch.toUpperCase());
const articles = (s: string): string => s.replace(/\b([Aa]) ([aeiouAEIOU])/g, '$1n $2');

function fill(tpl: string, pools: Pools): string {
  const used = new Map<string, Set<string>>();
  return tpl.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const pool = pools[key];
    if (!pool || !pool.length) return _m;
    let set = used.get(key);
    if (!set) {
      set = new Set<string>();
      used.set(key, set);
    }
    const avail = pool.filter((v) => !set!.has(v));
    if (!avail.length) set.clear();
    const src = avail.length ? avail : pool;
    const v = src[Math.floor(Math.random() * src.length)]!;
    set.add(v);
    return v;
  });
}

const FANTASY: FamPack = {
  t: [
    "a {hero} must {goal} before {deadline} — but {obstacle}.",
    "when {inciting}, a {hero} must {goal} before {deadline}.",
    "in {place}, a {hero} discovers {discovery} — and must {goal}.",
    "a {hero} strikes a bargain with {entity}: {goal} in exchange for {price}.",
    "a {hero} races {rival} to {macguffin} before {deadline}.",
    "a {hero} discovers {discovery} — and {obstacle}.",
    "in {place}, {inciting}. a {hero} is the only one who can {goal}.",
    "banished to {place}, a {hero} must {goal} before {deadline}.",
  ],
  pools: {
    hero: ["retired thief", "disgraced knight", "orphaned mapmaker", "runaway princess", "blind seer", "blacksmith's apprentice with a cursed arm", "exiled witch", "debt-ridden mercenary", "young archivist", "poacher turned ranger", "nameless sellsword", "failed apprentice mage", "lighthouse keeper's daughter", "grave robber", "traveling judge", "mute bard", "bastard prince", "plague survivor", "dragon keeper's widow", "oathbreaker paladin"],
    goal: ["steal back the Ember Crown", "close the last door to the Hollow", "wake the sleeping king beneath the mountain", "deliver a sealed letter that bleeds through every envelope", "win the Tournament of Thorns", "burn the contract binding a bloodline", "find the city that appears only in fog", "forge a blade from a fallen star", "rescue the heir from the Ashen Court", "map the country that rearranges itself nightly", "end the hundred-year siege of Thornwall", "steal the warlord's true name", "replant the last seed of the Worldtree", "escort a god across enemy lands", "break the tithe of firstborn sons", "recover the sunken citadel's bell", "outrun the Wild Hunt until dawn", "steal winter back from the Hollow"],
    deadline: ["the eclipse seals the warlord's reign forever", "the thaw wakes what sleeps beneath the city", "the last lighthouse flame gutters out", "the Hollow swallows the valley whole", "the king's hundredth name-day ends the truce", "winter locks the mountain passes", "the blood moon rises over Ravenspire", "the tithe collectors return at first frost", "the Worldtree sheds its final leaf", "the Ashen Court finishes its count", "the fog lifts for the last time", "the star-metal cools beyond forging"],
    obstacle: ["the only guide is the warlord's runaway daughter", "every map of the way is being burned", "the bounty doubles every sundown", "no spell survives a spoken truth", "the road passes through the old execution grounds", "someone is murdering every helper", "the crown is already wearing a king", "reflections have started giving orders", "the gates only open for the dead", "winter came three months early and brought soldiers", "the one ally sold the route twice already", "a rival thief knows the prize — and the hunter's name", "the forest rearranges itself around strangers", "the blade drinks a memory with every battle"],
    place: ["Emberhold", "the Whispering Vale", "Thornwall Keep", "the Shattered Coast", "Gloamwood Forest", "the Sunken Citadel", "Ravenspire", "the Ashen Moors", "Eldermere", "the Howling Pass", "the city of Vell", "the Salt Flats of Mirr"],
    discovery: ["a door in the cellar that wasn't there yesterday", "that the war everyone fears ended years ago", "a familiar name carved inside the king's tomb", "a dragon egg in the winter grain stores", "that a twin died in the wrong grave a decade ago", "a second moon rising over the moors", "the royal mint printing coins with a stranger's face", "a letter in familiar handwriting dated ten years hence"],
    entity: ["the Ashen Prince", "the Lady of Thorns", "a bored river god", "the last dragon", "the Hollow itself", "the King of Beggars"],
    inciting: ["the sky catches fire over the capital", "the dead start returning with warnings", "the mountain begins to bleed gold", "every mirror in the city cracks at once", "the warlord dies and names an heir nobody knows", "the sea pulls back and doesn't return", "the stars go out one by one", "the Wild Hunt rides in daylight"],
    price: ["a true name", "ten years of memories", "a reflection", "a voice every full moon", "every map in the archive", "the memory of a brother's face", "a shadow at noon", "the ability to dream"],
    macguffin: ["the Ember Crown", "the last dragon egg", "the warlord's true name", "the Worldtree's final seed", "the sunken bell of Eldermere", "a star-metal blade", "the Hollow's only key", "the map that redraws itself"],
    rival: ["a charming rival thief", "the warlord's runaway daughter", "a disgraced inquisitor", "an estranged sibling", "a dragon in human shape", "the queen's spymaster", "a deathless mercenary", "the Hollow's collector"],
  },
};

const SCIFI: FamPack = {
  t: [
    "a {hero} discovers {discovery} — and must {goal} before {deadline}.",
    "when {discovery}, a {hero} has one chance to {goal}.",
    "on {place}, a {hero} must {goal}, but {obstacle}.",
    "a {hero} must {goal} before {deadline} — except {obstacle}.",
    "disgraced and broke on {place}, a {hero} takes one last job: {goal}.",
    "the crew of {place} runs on secrets. a {hero} just found the biggest one: {discovery}.",
  ],
  pools: {
    hero: ["junior analyst", "burned-out pilot", "station medic", "salvage diver", "terraform engineer", "cryo-wake specialist", "relay operator", "exo-biologist", "retired admiral", "smuggler with a heart condition", "android rights lawyer", "deep-space cartographer", "gene-hacker", "orbital dockworker", "memory broker", "first-contact linguist"],
    goal: ["prove the station AI has been lying about Earth", "smuggle a living planet-seed past the blockade", "restart the sun of a dying colony", "decode the signal buried in the static", "get eleven thousand sleepers to a new world with fuel for half that", "expose the corp that owns the air supply", "map the Drift before it shifts again", "bring a crew home from beyond the Relay", "stop the grey tide eating the outer colonies", "win custody of the first human-AI child", "steal back a lifetime of memories from the archive", "finish the generation ship a grandmother launched"],
    deadline: ["the Kepler window closes for eleven years", "life support fails on Deck Nine", "the corp fleet arrives at dawn-cycle", "the sun goes quiet for a century", "the Relay collapses into the void", "the quarantine burns everything in seventy-two hours", "the tide reaches the inner worlds", "the sleepers' warranties expire"],
    obstacle: ["the AI running the ship is the prime suspect", "every ally has a kill-switch nobody can find", "Earth stopped answering a decade ago", "the fuel is alive and it negotiates", "the crew voted to turn back", "the signal is coming from inside the station", "gravity is failing deck by deck", "the enemy knows the next three moves", "oxygen is now currency and the account is empty", "the star map rewrites itself nightly"],
    place: ["Station Meridian", "the Kepler Drift", "New Arcadia", "Sector Nine", "the Helios Array", "Rust Harbor", "Cinder Colony", "the Void Docks", "Terminus Prime", "the Andromeda Relay"],
    discovery: ["a second Earth on no chart ever made", "that the war ended eleven years ago", "an obituary dated tomorrow", "a garden growing in hard vacuum", "a distress call in a dead mother's voice", "eleven ships that never launched", "a planet that rearranges its continents nightly"],
  },
};

const LITRPG: FamPack = {
  t: [
    "a {hero} wakes up with {system}, and the tutorial quest says: {goal}.",
    "after the apocalypse patch, a {hero} must {goal} — but {obstacle}.",
    "in {place}, a {hero} takes the worst-rated class in the game and decides to {goal}.",
    "a {hero} discovers {system}. the catch: {obstacle}.",
    "everyone got powers. a {hero} got {system} — now the only way forward is to {goal} before {deadline}.",
    "trapped in {place} with {system}, a {hero} has one way out: {goal}.",
  ],
  pools: {
    hero: ["warehouse clerk", "burned-out nurse", "retired speedrunner", "night-shift security guard", "failed pro gamer", "single dad working two jobs", "introverted librarian", "ex-soldier with a bad knee", "community-college dropout", "overworked line cook", "shut-in translator", "rookie paramedic"],
    goal: ["clear the tutorial dungeon before the system deletes the account — and the player with it", "reach level 50 before the server merge wipes the newbies", "solo the world boss nobody has scratched", "build a guild from the players everyone rejected", "find the exploit that preserves pre-system memories", "win the seasonal tournament with a joke build", "map the tutorial zone's hidden floors", "pay off a family's debt with dungeon gold", "uncover who coded the system into reality", "escort a new spawn through a red zone", "become the first crafter to forge a mythic item", "survive the first winter after the apocalypse patch"],
    system: ["a glowing interface no one else can see", "floating damage numbers over every stranger", "a quest log that updates overnight", "stat screens that appear mid-conversation", "a tutorial fairy with strong opinions", "patch notes nailed to the front door", "a class selection screen with one terrifying option", "daily quests that follow the owner to a day job"],
    obstacle: ["the starter class is rated F-tier", "the tutorial scales to real-world weaknesses", "a top guild marks newbies for farming", "every death costs a year of memories", "stats glitch whenever fear spikes", "the safe zones are shrinking nightly", "the only skill is rated decorative", "the system keeps issuing quests that can't be refused", "a rival from the old world knows too much", "the NPCs are starting to remember past loops"],
    place: ["the tutorial dungeon beneath the city", "the starter city everyone outgrows", "the red zone downtown", "the raid tower on the horizon", "the newbie forest", "the guild hall district", "the PvP crater", "the endless Patchlands"],
    deadline: ["the server merge", "the first wipe", "the red moon event", "the guild war season", "the leaderboard lock", "the winter patch"],
  },
};

const ROMANCE: FamPack = {
  t: [
    "a {hero} {setup} — {complication}.",
    "in {place}, a {hero} {setup}.",
    "one {season} in {place}: a {hero} {setup}.",
    "a {hero} {setup}, just as {complication2}.",
  ],
  pools: {
    hero: ["rival food-truck owner", "burned-out wedding planner", "grumpy lighthouse keeper", "widowed bookstore owner", "runaway bride", "by-the-book accountant", "storm-chasing photographer", "small-town mayor", "jaded divorce lawyer", "pastry chef with a temper", "retired sea captain", "city reporter on exile assignment", "single-dad firefighter", "wedding singer who hates weddings"],
    setup: ["is forced to share one kitchen for a summer festival", "inherits half a vineyard — the other half belongs to a high-school nemesis", "fake-dates a best friend's brother for one wedding weekend", "gets snowed in with the stranger who bought a childhood home", "must plan an ex's wedding in thirty days", "wins a lighthouse in a card game — keeper included", "swaps houses with a stranger for the summer", "has to co-parent a rescue parrot with the neighbor", "gets cast opposite an enemy in the town play", "opens a bookshop next door to a rival bookseller"],
    complication: ["the only thing spicier than the menu is the tension", "the festival ends in six weeks — and so does the lease", "neither told the family it's fake", "the road thaws in spring but feelings thaw faster", "the ex is suddenly un-engaged", "the lighthouse is scheduled for demolition", "the swap was a double-booking and neither will leave", "the parrot only repeats love confessions", "opening night is one month away", "the whole street has chosen sides"],
    complication2: ["the festival opens in six weeks", "an old flame returns to town", "the inn goes up for sale", "a storm closes the only road out", "the whole town starts matchmaking", "a critic books the last table of the season"],
    place: ["Seabrook Cove", "the Rosewater Inn", "Willow Creek", "Bell Harbor", "the Lavender Farm", "Cedar Falls", "Hartfield Manor", "Sunset Pier", "Maple Street", "the Old Lighthouse"],
    season: ["summer", "autumn", "winter", "spring"],
  },
};

const THRILLER: FamPack = {
  t: [
    "a {hero} {setup} — {stakes}.",
    "in {place}, a {hero} {setup}.",
    "everyone believes {belief}. a {hero} {setup} — and {stakes}.",
    "a {hero} {setup}. now {countdown}.",
  ],
  pools: {
    hero: ["burned-out detective", "disgraced spy", "ER nurse on night shift", "true-crime podcaster", "retired assassin", "airport security officer", "forensic accountant", "ex-hostage negotiator", "wilderness guide", "armored-truck driver", "911 dispatcher", "bodyguard for hire"],
    setup: ["inherits a lighthouse in a town that isn't on any map", "finds a phone that predicts murders twelve hours early", "witnesses a swap that never officially happened", "gets a client who pays triple to be followed", "wakes up with forty-eight hours missing and blood on the cuff", "intercepts a package addressed to a dead operative", "notices the same car outside every crime scene", "takes a fare that was never booked", "finds a familiar name on a hit list with today's date", "decodes a ledger that bankrupts a cartel", "pulls a victim from the river who refuses to be saved", "gets hired to protect a witness who keeps lying"],
    stakes: ["the fog is hiding more than the harbor", "the next prediction names a loved one", "the handler says stand down — the bodies say otherwise", "the money is real but the client isn't", "the missing hours match a murder window exactly", "the dead operative was a mentor", "the car belongs to the precinct itself", "the fare was booked from inside the precinct", "today's date is already circled", "the cartel audits in blood", "the victim was declared dead twice before", "the lies all point at the same safe house"],
    place: ["the fog-bound harbor town of Greyport", "a decommissioned missile silo", "the night ferry to the islands", "a mountain lodge cut off by avalanche", "the city's oldest hotel", "an offshore data haven", "the last train out of the capital", "a black-site motel on Route 9"],
    belief: ["the town doesn't exist on any map", "the case went cold twenty years ago", "the operative died in Prague", "the ferry sank with all hands", "the lodge burned down empty", "the list was a hoax"],
    countdown: ["the fog is rolling in and the phones are out", "the next name on the list is family", "the handler has gone dark", "the ferry leaves at dawn either way", "the evidence room is on fire", "the safe house isn't safe anymore"],
  },
};

const MYSTERY: FamPack = {
  t: [
    "when {case}, a {sleuth} starts asking questions — {twist}.",
    "in {setting}, {case}. a {sleuth} refuses to let it go.",
    "a {sleuth} inherits more than expected when {case}.",
    "{case}. good thing a {sleuth} was there — {twist}.",
  ],
  pools: {
    sleuth: ["retired librarian", "village baker", "true-crime podcaster", "ex-cop turned florist", "cruise-ship magician", "crossword-obsessed professor", "wedding planner", "bookshop owner", "retired jewel thief", "small-town vet", "pub-quiz champion", "beekeeping widow", "antique book dealer", "retired spy"],
    case: ["the mayor is found dead in a locked voting booth", "a wedding cake arrives with a blackmail note inside", "every dog in the village goes missing the same night", "the lottery winner is murdered before claiming a cent", "a decades-old skeleton surfaces in the community garden", "the book club's host vanishes between courses", "a priceless violin is swapped mid-concerto", "the lighthouse log describes its keeper's murder", "a food critic collapses at the pie contest", "the church bells ring thirteen at midnight", "the bride's bouquet is laced with poison", "a winning racehorse is stolen from a bolted stable", "a groom vanishes from a locked honeymoon suite", "prize roses are poisoned the night before the show"],
    setting: ["a snowed-in country manor", "a week-long wedding on a private island", "a traveling circus", "a retirement village with secrets", "a lighthouse bed-and-breakfast", "a cruise ship mid-Atlantic", "a harvest festival", "a tiny village that bans outsiders", "a seventy-two-hour train ride", "an archaeological dig in the desert", "a film set in a remote castle", "a charity gala on a vintage steam train"],
    twist: ["everyone had a motive and an alibi", "the detective's own past is the key", "the second victim was supposed to be first", "the will reading changes everything", "the obvious suspect is obviously innocent", "the victim planned it all", "the town would rather keep the secret", "the cat knows who did it", "the alibis all corroborate each other — too neatly", "the murder weapon doesn't exist yet", "the diary entries are all dated tomorrow", "two witnesses describe two different victims"],
  },
};

const HORROR: FamPack = {
  t: [
    "a {victim} takes a job at {place} — where {entity}.",
    "in {place}, a {victim} learns the rule too late: {rule}.",
    "a {victim} moves into {place}. the neighbors left one warning: {rule}.",
    "they warned the new {victim} about {place}. nobody mentioned {entity}.",
  ],
  pools: {
    victim: ["housesitter", "night-shift nurse", "storm chaser", "urbex photographer", "grief counselor", "campground host", "motel clerk", "antique appraiser", "night janitor", "live-in caregiver"],
    place: ["a farmhouse that appears in no satellite photos", "the closed wing of St. Vermilion Hospital", "a summer camp that never reopened", "a lighthouse with thirteen steps too many", "a model home nobody has ever bought", "the overnight floor of a shopping mall", "a decommissioned subway station", "a roadside motel with one permanent guest", "a late grandmother's hoarder house", "a fire lookout forty miles from anyone", "a decommissioned lighthouse tender", "the last video rental store on earth"],
    entity: ["something that knocks from inside the walls", "the previous tenant — still paying rent", "whatever the last housesitter was feeding", "a voice on the baby monitor though there's no baby", "the man in the photographs who was never there", "something wearing a dead husband's coat", "the thing the town paid to keep fed", "static that spells a name", "the children who play in the walls at 3 a.m.", "a reflection that arrives a moment late", "footsteps that stop outside the nursery", "a second heartbeat in the walls"],
    rule: ["never answer after the third knock", "keep every light on until dawn", "don't let it learn your name", "feed it before midnight or it feeds itself", "never sleep in the room with no corners", "if it knocks twice, you're already inside it", "don't follow the singing past the treeline", "burn the photographs — all of them"],
  },
};

const HISTORICAL: FamPack = {
  t: [
    "when {event}, a {figure} stumbles on {secret}.",
    "in {place}, {event} — and a {figure} holds {secret}.",
    "a {figure} just wants to survive {event}. then comes {secret}.",
    "{place}, {year}: {event}, and a {figure} knows why.",
  ],
  pools: {
    figure: ["disgraced cartographer", "lady's maid with a photographic memory", "retired hangman", "war widow running a boarding house", "apprentice printer", "lighthouse keeper's son", "music-hall singer", "railway navvy", "lady botanist in disguise", "young clerk at the Admiralty"],
    event: ["the Great Fire approaches the printing presses", "the railway arrives with smallpox and speculators", "the regiment ships out and half the town follows", "the Exhibition opens and a fortune goes missing", "the fleet sails at dawn — half-crewed", "the cholera summer empties the street", "the new queen is crowned and old debts come due", "the balloon race ends in the Channel", "the mill burns with the payroll inside", "the census-taker finds a street that shouldn't exist"],
    place: ["Victorian London", "1890s New York", "a Gold Rush boomtown", "a remote Scottish island", "colonial Boston", "the Klondike trail", "a Mississippi riverboat", "Edwardian Cornwall"],
    secret: ["a forged will that disinherits an empire", "letters proving the hero of the war was a coward", "a map to a wreck full of payroll gold", "a printing plate that could topple a bank", "a phonograph cylinder of a murder confession", "a passenger manifest with one name too many", "a recipe worth killing for — literally", "a photograph of the queen that must never be seen"],
    year: ["1849", "1865", "1871", "1888", "1893", "1901", "1912", "1926"],
  },
};

const GENERAL: FamPack = {
  t: [
    "a {protagonist} {situation} — {turn}.",
    "after {loss}, a {protagonist} {situation}.",
    "a {protagonist} {situation}. what happens next: {turn}.",
    "one {season} changes everything when a {protagonist} {situation}.",
  ],
  pools: {
    protagonist: ["grieving widower", "burned-out chef", "retired pilot", "teenage runaway", "night-shift baker", "ex-con starting a garden", "war photographer come home", "substitute teacher", "long-haul trucker", "retired ferry captain", "beekeeper's daughter", "failed novelist"],
    situation: ["finds unsent letters that rewrite a thirty-year marriage", "inherits a failing orchard and a mountain of debt", "takes in the stray dog nobody can catch", "buys a one-way ticket on a stranger's bucket list", "starts cooking for the shelter across the street", "plants a garden on the site of the old mill", "develops the last roll of film from the war", "befriends the kid nobody picks for anything", "detours three states to return a lost wallet", "restores the ferry that sank twenty years ago", "adopts the highway rest stop's feral cats", "finishes the novel a dead friend started"],
    turn: ["grief, grit, and the small rituals that save a life", "a road trip through every town they swore to leave", "one last summer before the orchard is sold", "the letters were never meant to be found", "the dog knows the way home — to someone else's home", "the bucket list belongs to a stranger who just died", "the shelter regulars start cooking back", "the garden grows something nobody planted", "the photographs change what everyone remembers", "the wallet's owner has been searching for years"],
    loss: ["the funeral", "the diagnosis", "the fire", "the divorce", "the layoff", "the last kid leaves for college"],
    season: ["summer", "winter", "autumn", "spring"],
  },
};

const HOWTO: FamPack = {
  t: [
    "a practical system for {promise} for {audience}, using {mechanism}, {mechanism}, and {mechanism}.",
    "a no-fluff playbook for {promise} for {audience}, {angle}.",
    "{promise} for {audience} in 30 days: {mechanism}, {mechanism}, and {mechanism} — {angle}.",
    "a field guide to {promise} for {audience}: stop {badHabit} — {angle}.",
  ],
  pools: {
    promise: ["unstoppable focus", "a calm inbox", "deep work on demand", "a business from zero", "mornings that run themselves", "a memory like a vault", "saying no without guilt", "finishing what you start", "a six-figure side hustle", "sleep that actually restores you", "a minimalist home", "faster reading with real retention", "a network that opens doors", "negotiations you actually win"],
    audience: ["busy professionals", "overwhelmed parents", "new managers", "freelancers", "college students", "founders", "night owls", "recovering perfectionists", "remote workers", "retirees starting over"],
    mechanism: ["tiny habits", "environment design", "weekly reviews", "90-minute blocks", "ruthless elimination", "body-doubling", "temptation bundling", "implementation intentions", "energy mapping", "shutdown rituals", "the two-list method", "friction design"],
    angle: ["told through the story of a laid-off accountant", "learned from interviewing 100 top performers", "tested on the author's own chaotic year", "backed by behavioral science minus the jargon", "field-tested in corporate trenches", "distilled from a decade of coaching", "proven in a 30-day public experiment", "written for people who hate productivity books", "built for brains that won't sit still", "no apps required — paper works fine"],
    badHabit: ["procrastinating", "drowning in email", "snoozing your goals", "negotiating with yourself", "starting over every Monday", "confusing busy with productive", "letting your calendar own you", "waiting to feel ready"],
  },
};

const MEMOIR: FamPack = {
  t: [
    "a memoir of {arc} — {detail}.",
    "a memoir of {arc}, {theme}.",
    "{arc}: a memoir {theme}, {detail}.",
    "{arc}, ten years later: a memoir {theme}.",
  ],
  pools: {
    arc: ["rebuilding a life from nothing after losing everything", "walking away from a cult at nineteen", "a year cooking in twelve countries", "surviving the accident that stole five years of memory", "raising triplets alone on a teacher's salary", "sailing home across an ocean", "caring for a father losing his memory", "starting over at sixty in a town of four hundred", "a season fighting wildfires", "quitting the firm to keep bees", "hiking the whole trail with a broken heart", "twenty years as a night-shift nurse", "growing up in a house with seventeen foster siblings", "the summer the factory closed and the town didn't", "learning to swim at forty after nearly drowning twice", "driving a cab through a city that never sleeps", "translating for families at the border", "running a marathon on two artificial legs", "closing the family store after fifty years", "a decade as a storm chaser", "busking across the country with a broken guitar", "twenty summers as a fire lookout"],
    detail: ["grief, grit, and the small rituals that saved me", "told in recipes that carried three generations", "with the letters we never sent", "one town, one winter, no running water", "what the road taught me about starting over", "the maps I drew to find my way back", "fifty strangers who became family", "a dog-eared journal and a borrowed truck", "in the clothes I stood up in", "one photo, one scar, one second chance", "from eviction notice to front porch", "as told to my daughter", "late nights, early buses, no shortcuts", "the kindness of tow-truck drivers", "measured in cups of diner coffee", "with a bum knee and a borrowed tent", "in borrowed boots a size too small", "with nothing but a library card"],
    theme: ["about second chances", "about what we owe the dead", "about learning to stay", "about the family you choose", "about ambition and its price", "about faith after the fire", "about money, shame, and freedom", "about going home again", "about mothers and daughters", "about fathers and sons", "about the work that saves us", "about luck and stubbornness", "about leaving and returning", "about starting over at any age", "about hunger and hope", "about the kindness of strangers"],
  },
};

const NARRATIVE: FamPack = {
  t: [
    "{subject}: {lens}.",
    "the true story of {subject}, {event}.",
    "{subject} — {lens}, {event}.",
    "inside {subject}: {lens}.",
  ],
  pools: {
    subject: ["the bank heist nobody reported", "a con artist who sold the same mine eleven times", "the lighthouse crew that vanished overnight", "a pirate queen with a retirement plan", "the impostor who commanded a regiment", "a bootlegger who funded a town's schools", "the spy who defected twice", "a forger whose fakes hang in museums", "the crew that stole a whole railway bridge", "an arson investigator who fits the profile", "the smugglers who ran a lighthouse", "a safecracker hired by the wrong family", "the witness who testified from hiding for a decade", "a detective chasing a copycat of an old case", "the heist crew betrayed by its own getaway driver", "an undercover agent forgotten by the agency", "the locksmiths who robbed their own bank", "a stunt pilot smuggling more than mail"],
    event: ["over one brutal winter", "across three decades and four aliases", "in the seventy-two hours that broke the case", "from a single fingerprint", "through declassified files and sealed testimony", "in the words of the accomplices", "from crime scene to courtroom", "across two continents and one war", "told from the wiretap transcripts", "from the first lie to the final verdict", "across five safe houses and one wedding", "in the year the law changed", "from a tip nobody believed", "reconstructed from the getaway car", "across one very long night shift", "pieced together from hotel registries"],
    lens: ["what really happened, and why it matters now", "who paid, who profited, and who vanished", "the flops, the luck, and the one perfect plan", "how close they came to getting away with it", "the victims history forgot", "the investigation that wouldn't die", "told like a thriller, sourced like a trial", "everyone lied — here's the tape", "the motive nobody printed", "follow the money to the last honest person", "the case that rewrote the manual", "what the jury never heard", "the confession that took thirty years", "anatomy of a perfect mistake", "the alibi that almost worked", "everyone remembers it differently"],
  },
};

type Fam = 'fantasy' | 'scifi' | 'litrpg' | 'romance' | 'thriller' | 'mystery' | 'horror' | 'historical' | 'general';
const FICTION: Record<Fam, FamPack> = {
  fantasy: FANTASY, scifi: SCIFI, litrpg: LITRPG, romance: ROMANCE, thriller: THRILLER,
  mystery: MYSTERY, horror: HORROR, historical: HISTORICAL, general: GENERAL,
};

function familyOf(genre: string): Fam {
  const g = genre.toLowerCase();
  if (/litrpg|gamelit/.test(g)) return 'litrpg';
  if (/fantas|magic|dragon|elf|fae|myth|legend|quest|paranormal/.test(g)) return 'fantasy';
  if (/sci-?fi|science|space|cyber|dystop|robot|alien|future|galax/.test(g)) return 'scifi';
  if (/roman|love/.test(g)) return 'romance';
  if (/thrill|spy|assassin|crime|heist|suspense|terror|agent/.test(g)) return 'thriller';
  if (/myster|detect|cozy|murder|noir/.test(g)) return 'mystery';
  if (/horror|ghost|haunt|zombie|vampire|occult/.test(g)) return 'horror';
  if (/histor|western|regency|victorian|medieval|pirate|viking/.test(g)) return 'historical';
  return 'general';
}

export function randomPremise(kind: 'fiction' | 'nonfiction', genre: string): string {
  if (kind === 'nonfiction') {
    const track = /memoir|biograph/i.test(genre) ? MEMOIR : /histor|true crime/i.test(genre) ? NARRATIVE : HOWTO;
    return articles(cap(fill(pick(track.t), track.pools)));
  }
  const fam = FICTION[familyOf(genre)];
  return articles(cap(fill(pick(fam.t), fam.pools)));
}

// ---- Full-bundle surprise: every field, genre-aware ----

const pickN = (a: string[], n: number): string[] => {
  const pool = [...a];
  const out: string[] = [];
  while (pool.length && out.length < n) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]!);
  return out;
};
const wpick = (opts: Array<[string, number]>): string => {
  const total = opts.reduce((s, o) => s + o[1], 0);
  let r = Math.random() * total;
  for (const [v, w] of opts) {
    r -= w;
    if (r <= 0) return v;
  }
  return opts[opts.length - 1]![0];
};

type NfTrack = 'howto' | 'memoir' | 'narrative';
function nfTrackOf(genre: string): NfTrack {
  if (/memoir|biograph/i.test(genre)) return 'memoir';
  if (/histor|true crime/i.test(genre)) return 'narrative';
  return 'howto';
}

const TITLES: Record<Fam, string[]> = {
  fantasy: ["The Ember Crown", "A Map of Thorns", "The Hollow King", "Winter's Tithe", "The Star-Forge", "The Ashen Court"],
  scifi: ["The Kepler Window", "Static Bloom", "The Meridian Lie", "Redshift Harvest", "The Sleepers' War", "Signal Garden"],
  litrpg: ["Patch Day", "F-Tier", "The Tutorial Lies", "Level Zero", "The Hidden Floor", "Respawn Point"],
  romance: ["The Summer Lease", "One Wedding Weekend", "Love, Double-Booked", "The Vineyard Half", "Snowed In at Seabrook", "The Last Table of Summer"],
  thriller: ["The Greyport Ferry", "Forty-Eight Hours Missing", "The Dead Operative", "A Ledger in Blood", "The Ninth Passenger", "Stand Down"],
  mystery: ["The Locked Voting Booth", "Poison at the Pie Contest", "The Thirteenth Bell", "A Skeleton in the Community Garden", "The Bolted Stable", "Murder Between Courses"],
  horror: ["The Third Knock", "Thirteen Steps Too Many", "The Permanent Guest", "Don't Let It Learn Your Name", "The Room With No Corners", "Static Spells Your Name"],
  historical: ["The Forged Will", "Payroll Gold", "The Census-Taker's Street", "The Cholera Summer", "A Photograph of the Queen", "The Balloon Race"],
  general: ["The Unsent Letters", "One Last Summer at the Orchard", "The Shelter Across the Street", "The Last Roll of Film", "What the Road Keeps", "The Garden on Mill Street"],
};
const NF_TITLES: Record<NfTrack, string[]> = {
  howto: ["Deep Work on Demand", "The Calm Inbox", "Finish What You Start", "Mornings That Run Themselves", "Say No Without Guilt", "The Two-List Method"],
  memoir: ["In Borrowed Boots", "What the Road Taught Me", "The Winter With No Running Water", "Measured in Diner Coffee", "Fifty Strangers Who Became Family", "Late Nights, Early Buses"],
  narrative: ["The Bank Heist Nobody Reported", "Eleven Ships That Never Launched", "The Impostor's Regiment", "Follow the Money Down", "Seventy-Two Hours That Broke the Case", "What the Jury Never Heard"],
};

const AUDIENCES: Record<Fam, string[]> = {
  fantasy: ["Adult fantasy readers", "Young adult fantasy readers", "New adult romantasy readers"],
  scifi: ["Adult science fiction readers", "Hard SF fans", "Space opera readers"],
  litrpg: ["Progression fantasy fans", "LitRPG readers", "Dungeon-core readers"],
  romance: ["Adult romance readers", "New adult contemporary readers", "Romantic comedy fans"],
  thriller: ["Adult thriller readers", "Book club suspense readers", "Airport thriller fans"],
  mystery: ["Cozy mystery fans", "Traditional mystery readers", "Book club mystery readers"],
  horror: ["Adult horror readers", "Gothic fiction fans", "Horror book club readers"],
  historical: ["Historical fiction readers", "Book club readers", "History lovers"],
  general: ["Adult book club readers", "Upmarket fiction readers", "General fiction readers"],
};
const NF_AUDIENCES: Record<NfTrack, string[]> = {
  howto: ["Busy professionals", "New managers", "Freelancers and founders"],
  memoir: ["Memoir readers", "Book club readers", "Readers of women's stories"],
  narrative: ["True crime readers", "History readers", "Narrative nonfiction fans"],
};

const TONES: Record<Fam, string[]> = {
  fantasy: ["Epic yet intimate", "Gritty yet hopeful", "Sweeping and romantic", "Dark and mythic"],
  scifi: ["Sense-of-wonder with grit", "Tense and cerebral", "Hopeful and humane", "Cold and clinical"],
  litrpg: ["Crunchy and fun", "Fast and punchy", "Cozy with real stakes", "Grim with gallows humor"],
  romance: ["Warm and witty", "Heartfelt and steamy", "Light and sparkling", "Tender and emotional"],
  thriller: ["Relentless and propulsive", "Cold and paranoid", "Gritty and grounded", "Sleek and twisty"],
  mystery: ["Charming with bite", "Atmospheric and puzzling", "Dry and witty", "Dark and brooding"],
  horror: ["Dread-soaked and bleak", "Gothic and atmospheric", "Slow-burn uncanny", "Savage and visceral"],
  historical: ["Immersive and transportive", "Sweeping and tragic", "Intimate and richly detailed", "Gritty and authentic"],
  general: ["Warm and wise", "Quiet and devastating", "Wry and big-hearted", "Luminous and tender"],
};
const NF_TONES: Record<NfTrack, string[]> = {
  howto: ["Practical and encouraging", "No-fluff and direct", "Warm and coach-like"],
  memoir: ["Honest and unsparing", "Wry and tender", "Lyric and reflective"],
  narrative: ["Propulsive and cinematic", "Meticulous and gripping", "Dry and ironic"],
};

const STYLES: Record<Fam, string[]> = {
  fantasy: ["Brandon Sanderson", "Robin Hobb", "Joe Abercrombie", "Ursula K. Le Guin", "N.K. Jemisin"],
  scifi: ["Andy Weir", "Becky Chambers", "Octavia Butler", "Blake Crouch", "Isaac Asimov"],
  litrpg: ["Shirtaloon", "Azalea Ellis", "Dakota Krout", "Travis Bagwell", "Matt Dinniman"],
  romance: ["Emily Henry", "Nora Roberts", "Tessa Bailey", "Ali Hazelwood", "Casey McQuiston"],
  thriller: ["Lee Child", "Gillian Flynn", "Harlan Coben", "Tana French", "Mick Herron"],
  mystery: ["Agatha Christie", "Louise Penny", "Richard Osman", "Anthony Horowitz", "Tana French"],
  horror: ["Stephen King", "Shirley Jackson", "Paul Tremblay", "Silvia Moreno-Garcia", "T. Kingfisher"],
  historical: ["Hilary Mantel", "Ken Follett", "Kristin Hannah", "Caleb Carr", "Bernard Cornwell"],
  general: ["Fredrik Backman", "Kent Haruf", "Celeste Ng", "Matt Haig", "Elizabeth Strout"],
};
const NF_STYLES: Record<NfTrack, string[]> = {
  howto: ["James Clear", "Cal Newport", "Marie Kondo", "David Allen"],
  memoir: ["Mary Karr", "Tara Westover", "David Sedaris", "Cheryl Strayed"],
  narrative: ["Erik Larson", "Michael Lewis", "Jon Krakauer", "Patrick Radden Keefe"],
};

// POV weights per family: [third-limited, first, omniscient].
const POV_W: Record<Fam, [number, number, number]> = {
  fantasy: [0.65, 0.2, 0.15], scifi: [0.65, 0.2, 0.15], litrpg: [0.5, 0.4, 0.1],
  romance: [0.4, 0.5, 0.1], thriller: [0.55, 0.35, 0.1], mystery: [0.55, 0.35, 0.1],
  horror: [0.5, 0.4, 0.1], historical: [0.7, 0.15, 0.15], general: [0.5, 0.4, 0.1],
};
const PRESENT_P: Record<Fam, number> = {
  fantasy: 0.15, scifi: 0.15, litrpg: 0.3, romance: 0.25, thriller: 0.3,
  mystery: 0.2, horror: 0.2, historical: 0.1, general: 0.2,
};

const SUBGENRES: Record<Fam, string[]> = {
  fantasy: ["Epic Fantasy", "Cozy Fantasy", "Grimdark", "Romantic Fantasy", "Urban Fantasy", "Sword & Sorcery"],
  scifi: ["Space Opera", "Hard SF", "Cyberpunk", "First Contact", "Dystopian", "Generation Ship"],
  litrpg: ["Progression Fantasy", "Dungeon Core", "Apocalypse LitRPG", "VRMMO", "Cultivation", "Tower Climber"],
  romance: ["Contemporary", "Romantic Comedy", "Small-Town", "Paranormal", "Historical Romance", "Sports Romance"],
  thriller: ["Spy", "Legal", "Medical", "Psychological", "Action", "Conspiracy"],
  mystery: ["Cozy", "Police Procedural", "Amateur Sleuth", "Locked-Room", "Noir", "Historical Mystery"],
  horror: ["Gothic", "Folk Horror", "Supernatural", "Slasher", "Cosmic Horror", "Haunted House"],
  historical: ["Victorian", "Medieval", "Regency", "WWII", "Western", "Alternate History"],
  general: ["Literary Fiction", "Family Saga", "Coming-of-Age", "Adventure", "Book Club", "Upmarket"],
};

const COMPS: Record<Fam, string[]> = {
  fantasy: ["The Lies of Locke Lamora — voice", "The Name of the Wind — prose", "Mistborn — magic system", "The Hobbit — market"],
  scifi: ["Project Hail Mary — voice", "The Expanse — scope", "Ender's Game — market", "Dune — worldbuilding"],
  litrpg: ["He Who Fights with Monsters — voice", "The Wandering Inn — scope", "Solo Leveling — market", "Delvers LLC — tone"],
  romance: ["Beach Read — voice", "The Hating Game — banter", "Red, White & Royal Blue — market", "Nora Roberts — career comp"],
  thriller: ["Gone Girl — twists", "The Da Vinci Code — pace", "Jack Reacher — market", "Tana French — prose"],
  mystery: ["Agatha Christie — structure", "The Thursday Murder Club — tone", "Louise Penny — voice", "Knives Out — market"],
  horror: ["Stephen King — voice", "Mexican Gothic — atmosphere", "The Haunting of Hill House — dread", "Paul Tremblay — market"],
  historical: ["Hilary Mantel — immersion", "Ken Follett — scope", "The Nightingale — market", "Caleb Carr — mystery blend"],
  general: ["A Man Called Ove — heart", "Lessons in Chemistry — voice", "The Midnight Library — concept", "Kent Haruf — prose"],
};

const ANTAGONISTS: Record<Fam, string[]> = {
  fantasy: ["The Ashen Prince, who believes peace requires one eternal ruler", "The warlord, who thinks mercy is how kingdoms die", "The Lady of Thorns, collecting on a hundred-year-old bargain", "The Hollow itself — hunger wearing a crown"],
  scifi: ["The corp that owns the air supply — profit over breath", "The station AI, lying to keep everyone calm", "A rival salvage crew that shoots first", "The grey tide — not evil, just hungry"],
  litrpg: ["The top guild, farming newbies for sport", "The system itself — quests that can't be refused", "A rival from the old world who knows every exploit", "The world boss nobody has scratched"],
  romance: ["An ex who returns at the worst possible moment", "The rival across the street, currently winning", "A family that disapproves loudly", "The critic who can end it all with one review"],
  thriller: ["The handler who says stand down — while bodies pile up", "A cartel that audits in blood", "The precinct itself — the rot is inside", "A mentor who died in Prague. Except they didn't"],
  mystery: ["The whole town — it would rather keep the secret", "The obvious suspect. Obviously innocent. Obviously lying", "A blackmailer holding the guest list", "The victim, who planned it all"],
  horror: ["Whatever knocks from inside the walls", "The previous tenant — still paying rent", "The town that paid to keep it fed", "The reflection that arrives a moment late"],
  historical: ["The bank the printing plate could topple", "The regiment shipping out at dawn", "The speculators who arrived with the railway", "The debts the new queen just called due"],
  general: ["The orchard's debts — six weeks to pay", "The town they swore to leave, which remembers why", "Time itself — one last summer", "The letter that was never meant to be found"],
};

const STAKES: string[] = [
  "Her crew hangs; the city falls; mercy itself dies",
  "He loses the house; the town loses its doctor; nobody gets a second chance",
  "The lease ends; the festival dies; the street forgets how to hope",
  "She misses the window; the colony starves; the truth stays buried",
  "The proof burns; the guilty walk free; cynicism wins",
];

const THEMES: string[] = [
  "Mercy without cost is just sentiment",
  "You can't save anyone who won't be saved",
  "Home is a decision, not a place",
  "The truth costs exactly what you were avoiding",
  "Loyalty to the wrong person is still wrong",
  "Freedom without responsibility is just running",
  "Grief is love with nowhere to go",
  "Power reveals what comfort hides",
  "Forgiveness is a door that locks from inside",
  "Courage is fear that showed up anyway",
];

const ENDINGS: Record<Fam, string[]> = {
  fantasy: ["She burns the crown instead of wearing it", "He trades his true name for the valley's dawn", "The door to the Hollow closes — from the inside"],
  scifi: ["She broadcasts the truth and lets the colonies decide", "The ship turns back with half the fuel and all the sleepers", "He deletes the lie at the cost of the mission"],
  litrpg: ["He beats the boss with the joke build, live", "She deletes the leaderboard instead of topping it", "The guild of rejects becomes the server's legend"],
  romance: ["They buy the lease together — and the parrot stays", "She chooses the town over the city, and him over fear", "The fake relationship gets a real ending"],
  thriller: ["The handler goes down with the ledger", "She exposes it all and disappears before dawn", "The call came from inside the precinct"],
  mystery: ["The will reading changes everything", "The cat's testimony cracks the case", "The whole town applauds the arrest — then goes quiet"],
  horror: ["Dawn comes. The knocking stops. The house keeps the change", "She burns the photographs — all of them", "The rule holds: never answer after the third knock"],
  historical: ["The will burns; the empire survives anyway", "The payroll gold stays at the bottom of the harbor", "The census-taker's street finally gets its name"],
  general: ["The garden grows; the orchard stays", "The letters get sent — thirty years late", "One last summer becomes the first of many"],
};

const SEEDS: string[] = [
  "A lighthouse that shines inland", "The smell of rust and oranges", "A song everybody knows but nobody taught",
  "Keys that don't fit any door in the house", "A dog that waits at the wrong station", "Soup served in chipped bowls",
  "A clock that runs eleven minutes fast", "The last pay phone on the coast", "Handwriting that slants the wrong way",
  "A garden growing where nothing should grow", "Coins with a stranger's face", "A scar shaped like a question mark",
  "Bread cooling on a windowsill", "Footsteps that stop one room too soon",
];

function protagonistFor(fam: Fam): string {
  const p = FICTION[fam].pools;
  const one = (k: string): string => (p[k] && p[k]!.length ? pick(p[k]!) : "");
  switch (fam) {
    case 'fantasy': case 'scifi': return articles(cap(`a ${one('hero')} who wants to ${one('goal')}.`));
    case 'litrpg': return articles(cap(`a ${one('hero')} who has to ${one('goal')}.`));
    case 'romance': case 'thriller': return articles(cap(`a ${one('hero')} who ${one('setup')}.`));
    case 'mystery': return articles(cap(`a ${one('sleuth')} who can't let go when ${one('case')}.`));
    case 'horror': return articles(cap(`a ${one('victim')} who just wants to survive the first night at ${one('place')}.`));
    case 'historical': return articles(cap(`a ${one('figure')} trying to survive ${one('event')}.`));
    default: return articles(cap(`a ${one('protagonist')} who ${one('situation')}.`));
  }
}

export type SurpriseBundle = {
  title: string; premise: string; audience: string; tone: string; style: string;
  pov: string; tense: 'Past' | 'Present';
};
export type SurpriseAnchors = {
  subgenre: string; comps: string; protagonist: string; antagonist: string;
  stakes: string; theme: string; ending: string; seeds: string;
};

export function randomBundle(kind: 'fiction' | 'nonfiction', genre: string): SurpriseBundle {
  const premise = randomPremise(kind, genre);
  if (kind === 'nonfiction') {
    const t = nfTrackOf(genre);
    return { title: pick(NF_TITLES[t]), premise, audience: pick(NF_AUDIENCES[t]), tone: pick(NF_TONES[t]), style: pick(NF_STYLES[t]), pov: '', tense: 'Past' };
  }
  const fam = familyOf(genre);
  const w = POV_W[fam];
  const pov = wpick([['Third Person Limited', w[0]], ['First Person', w[1]], ['Third Person Omniscient', w[2]]]);
  return {
    title: pick(TITLES[fam]), premise,
    audience: pick(AUDIENCES[fam]), tone: pick(TONES[fam]), style: pick(STYLES[fam]),
    pov, tense: Math.random() < PRESENT_P[fam]! ? 'Present' : 'Past',
  };
}

export function randomAnchors(genre: string): SurpriseAnchors {
  const fam = familyOf(genre);
  return {
    subgenre: pick(SUBGENRES[fam]),
    comps: pickN(COMPS[fam], 2).join('\n'),
    protagonist: protagonistFor(fam),
    antagonist: pick(ANTAGONISTS[fam]),
    stakes: pick(STAKES),
    theme: pick(THEMES),
    ending: pick(ENDINGS[fam]),
    seeds: pickN(SEEDS, 3).join('\n'),
  };
}
