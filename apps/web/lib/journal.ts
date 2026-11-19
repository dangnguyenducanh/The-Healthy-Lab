export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

export type Article = {
  slug: string;
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  category: string;
  author: string;
  lead: string;
  cover: { src: string; alt: string };
  body: Block[];
};

const AUTHOR = "The Healthy Lab kitchen";

// Newest first.
export const ARTICLES: Article[] = [
  {
    slug: "building-a-balanced-bowl",
    title: "Building a balanced bowl",
    date: "2025-04-18",
    category: "Recipes",
    author: AUTHOR,
    lead: "Grain, protein, colour, fat and a dressing: five steps to a bowl that is filling and easy to repeat.",
    cover: {
      src: "/images/journal-salmon-bowl.jpg",
      alt: "Bowl of quinoa with grilled salmon, edamame, spinach, avocado and a halved soft-boiled egg, with tahini dressing in a small dish",
    },
    body: [
      { type: "paragraph", text: "A bowl is a flexible way to put grains, protein, vegetables and fat on one plate. It looks good, it is satisfying, and once you know the pattern you can build a different one every day." },
      { type: "heading", text: "Step 1: the base" },
      { type: "paragraph", text: "Start with something that gives lasting energy: quinoa, brown rice, farro or sweet potato. For a lighter bowl, use a bed of dark leafy greens such as kale or spinach. Aim for about a third of the bowl." },
      { type: "heading", text: "Step 2: the protein" },
      { type: "paragraph", text: "Protein helps a bowl keep you full. Grilled salmon, baked tofu, edamame, a boiled egg or roasted chickpeas all work. A portion about the size of your palm is a good starting point." },
      { type: "heading", text: "Step 3: the colour" },
      { type: "paragraph", text: "Add vegetables in as many colours as you can: roasted beets, shredded carrot, cherry tomatoes, purple cabbage, blanched broccoli. Different colours bring different nutrients, and they make the bowl nicer to eat." },
      { type: "quote", text: "A balanced bowl is not a restriction. It is a lot of different food in one place." },
      { type: "heading", text: "Step 4: fat and crunch" },
      { type: "paragraph", text: "Avocado, toasted pumpkin seeds, hemp hearts or walnuts add richness and texture. Some vitamins are absorbed better alongside a little fat, so this step does real work." },
      { type: "heading", text: "Step 5: the dressing" },
      { type: "paragraph", text: "Tie it together with a lemon and tahini drizzle, a ginger and miso vinaigrette, or just olive oil and balsamic. Keep it light, and add it last." },
      { type: "paragraph", text: "At The Healthy Lab you can build a bowl this way yourself: pick a base, a protein, a few extras and a dressing." },
    ],
  },
  {
    slug: "fermented-foods-and-gut-health",
    title: "Fermented foods and gut health",
    date: "2025-04-01",
    category: "Nutrition",
    author: AUTHOR,
    lead: "Kimchi, kefir and miso are old ways of preserving food, and an easy way to add variety to what you eat.",
    cover: {
      src: "/images/journal-superfoods.jpg",
      alt: "Marble table with a berry smoothie bowl, a jar of berry chia pudding, fresh berries, turmeric, ginger, half an avocado and a small bowl of matcha with a whisk",
    },
    body: [
      { type: "paragraph", text: "Fermenting is one of the oldest ways to keep food. It is also having a moment in modern kitchens, and for good reason: fermented foods taste good and are simple to add to a meal." },
      { type: "heading", text: "What fermentation is" },
      { type: "paragraph", text: "Fermentation is what happens when microorganisms such as bacteria and yeast break down sugars in food. It is how yogurt, sauerkraut, kimchi, miso and kombucha get their tang and their character. Some of these foods contain live cultures." },
      { type: "heading", text: "Why people eat them" },
      { type: "list", items: [
        "Flavour: fermented foods add acidity, depth and a savoury edge to simple dishes.",
        "Variety: they are an easy way to bring different foods into your week, which a varied diet benefits from.",
        "Digestion: many people find that fermented foods can help them feel good, though everyone is different.",
      ] },
      { type: "quote", text: "Fermentation turns ordinary ingredients into something with more flavour than you started with." },
      { type: "heading", text: "How to add them to your day" },
      { type: "paragraph", text: "Start small. Add a forkful of sauerkraut to a salad, swap plain yogurt for kefir, or stir a little miso into a dressing. If you have a sensitive stomach, go slowly and see how you feel." },
    ],
  },
  {
    slug: "morning-habits-for-steady-energy",
    title: "Five morning habits for steady energy",
    date: "2025-03-12",
    category: "Wellness",
    author: AUTHOR,
    lead: "Small, repeatable habits, from a glass of water to a proper breakfast, can help your day start well.",
    cover: {
      src: "/images/journal-meal-prep.jpg",
      alt: "Wooden table set with glass meal-prep boxes, bowls of berries and nuts, a water bottle with lemon and an open notebook titled clean eating journal",
    },
    body: [
      { type: "paragraph", text: "A good morning routine does not mean getting up at four and running a marathon. It means a few small things you can repeat on an ordinary Tuesday. These are five that we like." },
      { type: "heading", text: "1. Water with lemon" },
      { type: "paragraph", text: "After a night's sleep, a large glass of room-temperature water is a gentle way to start. A squeeze of lemon makes it taste better, which makes it easier to keep doing." },
      { type: "heading", text: "2. Five minutes of daylight" },
      { type: "paragraph", text: "Stepping outside, or standing by a bright window, early in the day can help your body clock settle into a rhythm. It costs nothing and takes five minutes." },
      { type: "quote", text: "How you spend your first hour sets the tone for the rest of the day." },
      { type: "heading", text: "3. Coffee a little later" },
      { type: "paragraph", text: "Some people find that waiting an hour or so after waking before the first coffee helps them avoid an afternoon slump. Try it for a week and see whether it works for you." },
      { type: "heading", text: "4. A breakfast with protein" },
      { type: "paragraph", text: "Eggs, yogurt, beans or chicken alongside grains and fruit can help you feel full for longer than a pastry on its own. A bowl with a protein on top is an easy way to get there." },
      { type: "heading", text: "5. A little movement" },
      { type: "paragraph", text: "You do not need a hard workout. Ten minutes of stretching or walking gets you moving and can help clear your head before the day starts." },
    ],
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);

export const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { dateStyle: "long", timeZone: "UTC" });
