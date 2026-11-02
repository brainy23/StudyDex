// Existing quiz topic definitions and demo questions, shared by the route pages.
export const scienceTopics = [
  { key: 'p3-living', level: 3, theme: 'Diversity', name: 'Living and Non-Living Things', official: 'Diversity of living and non-living things (General characteristics and classification)', aliases: ['Diversity of living and non-living things', 'General characteristics and classification'] },
  { key: 'p3-materials', level: 3, theme: 'Diversity', name: 'Materials', official: 'Diversity of materials', aliases: ['Diversity of materials'] },
  { key: 'p3-life-cycles', level: 3, theme: 'Cycles', name: 'Life Cycles', official: 'Cycles in plants and animals (Life cycles)', aliases: ['Life cycles of plants and animals'] },
  { key: 'p3-magnets', level: 3, theme: 'Interactions', name: 'Magnets', official: 'Interaction of forces (Magnets)', aliases: ['Magnetism'] },
  { key: 'p4-plants', level: 4, theme: 'Systems', name: 'Plant Parts and Functions', official: 'Plant system (Plant parts and functions)', aliases: [] },
  { key: 'p4-digestion', level: 4, theme: 'Systems', name: 'Digestive System', official: 'Human system (Digestive system)', aliases: ['Human digestive system', 'Digestion'] },
  { key: 'p4-matter', level: 4, theme: 'Cycles', name: 'Matter', official: 'Cycles in matter and water (Matter)', aliases: [] },
  { key: 'p4-light', level: 4, theme: 'Energy', name: 'Light', official: 'Energy forms and uses (Light)', aliases: [] },
  { key: 'p4-heat', level: 4, theme: 'Energy', name: 'Heat', official: 'Energy forms and uses (Heat)', aliases: [] },
  { key: 'p5-reproduction', level: 5, theme: 'Cycles', name: 'Reproduction in Plants and Animals', official: 'Cycles in plants and animals (Reproduction)', aliases: ['Reproduction'] },
  { key: 'p5-water', level: 5, theme: 'Cycles', name: 'Water', official: 'Cycles in matter and water (Water)', aliases: ['Water cycle'] },
  { key: 'p5-plants', level: 5, theme: 'Systems', name: 'Plant Respiratory and Circulatory Systems', official: 'Plant system (Respiratory and circulatory systems)', aliases: ['Plant transport system', 'Plant transport systems'] },
  { key: 'p5-human', level: 5, theme: 'Systems', name: 'Human Respiratory and Circulatory Systems', official: 'Human system (Respiratory and circulatory systems)', aliases: [] },
  { key: 'p5-electricity', level: 5, theme: 'Systems', name: 'Electrical System', official: 'Electrical system', aliases: ['Electrical systems', 'Electricity'] },
  { key: 'p6-photosynthesis', level: 6, theme: 'Energy', name: 'Photosynthesis', official: 'Energy forms and uses (Photosynthesis)', aliases: [] },
  { key: 'p6-energy', level: 6, theme: 'Energy', name: 'Energy Conversion', official: 'Energy conversion', aliases: [], standardOnly: true },
  { key: 'p6-forces', level: 6, theme: 'Interactions', name: 'Forces', official: 'Interaction of forces (Frictional force, gravitational force, elastic spring force)', aliases: ['Interaction of forces', 'Frictional force, gravitational force, elastic spring force'] },
  { key: 'p6-environment', level: 6, theme: 'Interactions', name: 'Interactions within the Environment', official: 'Interactions within the environment', aliases: ['Interactions in the environment'] },
]

export const demoBank = {
  "p3-living": [
    [
      "Which is a living thing?",
      [
        "Stone",
        "Mushroom",
        "Plastic bottle",
        "Spoon"
      ],
      1,
      "A mushroom is a living thing. It grows and needs food, air and water."
    ],
    [
      "Which observation alone does NOT prove that something is living?",
      [
        "It reproduces",
        "It grows naturally",
        "It moves",
        "It needs food"
      ],
      2,
      "A toy car can move, but it is not living. Consider several characteristics together."
    ]
  ],
  "p3-materials": [
    [
      "Which material is suitable for a clear window?",
      [
        "Glass",
        "Cardboard",
        "Cloth",
        "Wood"
      ],
      0,
      "Clear glass allows us to see through it."
    ],
    [
      "Why is rubber suitable for a rubber band?",
      [
        "It is transparent",
        "It dissolves easily",
        "It is magnetic",
        "It can stretch"
      ],
      3,
      "Rubber can stretch and return towards its original shape."
    ]
  ],
  "p3-life-cycles": [
    [
      "What comes after the egg in a butterfly’s life cycle?",
      [
        "Adult butterfly",
        "Pupa",
        "Larva (caterpillar)",
        "Seed"
      ],
      2,
      "The egg hatches into a caterpillar, which is the larval stage."
    ],
    [
      "What can a seed grow into under suitable conditions?",
      [
        "A young plant",
        "A pupa",
        "An egg",
        "A rock"
      ],
      0,
      "A seed can germinate and develop into a young plant."
    ]
  ],
  "p3-magnets": [
    [
      "What happens when two north poles are brought close together?",
      [
        "They attract",
        "They repel",
        "They disappear",
        "They melt"
      ],
      1,
      "Like magnetic poles repel one another."
    ],
    [
      "Which object is attracted to a magnet?",
      [
        "Wooden ruler",
        "Plastic cup",
        "Iron nail",
        "Glass marble"
      ],
      2,
      "Iron is a magnetic material."
    ]
  ],
  "p4-plants": [
    [
      "Which plant part mainly absorbs water from the soil?",
      [
        "Flower",
        "Leaf",
        "Fruit",
        "Roots"
      ],
      3,
      "Roots absorb water and mineral salts from the soil."
    ],
    [
      "Which part usually supports the leaves and flowers?",
      [
        "Stem",
        "Seed",
        "Petal",
        "Fruit"
      ],
      0,
      "The stem supports the plant and transports substances."
    ]
  ],
  "p4-digestion": [
    [
      "Where does digestion begin?",
      [
        "Stomach",
        "Mouth",
        "Large intestine",
        "Small intestine"
      ],
      1,
      "Digestion begins in the mouth, where food is chewed and mixed with saliva."
    ],
    [
      "Where is most digested food absorbed into the blood?",
      [
        "Mouth",
        "Food pipe",
        "Small intestine",
        "Stomach"
      ],
      2,
      "Most digested food is absorbed through the walls of the small intestine."
    ]
  ],
  "p4-matter": [
    [
      "Which statement describes matter?",
      [
        "It must be visible",
        "It must be solid",
        "It has no mass",
        "It has mass and occupies space"
      ],
      3,
      "Matter has mass and occupies space. Air is matter too."
    ],
    [
      "What happens to the shape of water when it is poured into another container?",
      [
        "It takes the container’s shape",
        "It always stays square",
        "It becomes a solid",
        "It loses all its mass"
      ],
      0,
      "A liquid has no fixed shape and takes the shape of its container."
    ]
  ],
  "p4-light": [
    [
      "Why can we see a book under a lamp?",
      [
        "The book makes light",
        "Light reflects from the book into our eyes",
        "Our eyes send light to it",
        "The book absorbs all light"
      ],
      1,
      "We see the book when reflected light enters our eyes."
    ],
    [
      "How is a shadow formed?",
      [
        "Sound strikes a wall",
        "Air becomes cold",
        "An object blocks light",
        "Water evaporates"
      ],
      2,
      "A shadow forms where an object blocks light from reaching a surface."
    ]
  ],
  "p4-heat": [
    [
      "In which direction does heat flow naturally?",
      [
        "From colder to hotter",
        "Only upwards",
        "Only through water",
        "From hotter to colder"
      ],
      3,
      "Heat flows from a hotter object or region to a colder one."
    ],
    [
      "Which material is usually suitable for a saucepan handle?",
      [
        "Wood",
        "Copper",
        "Iron",
        "Aluminium"
      ],
      0,
      "Wood is a poor conductor of heat, so less heat reaches the hand."
    ]
  ],
  "p5-reproduction": [
    [
      "Why do living things reproduce?",
      [
        "To become heavier",
        "To ensure their kind continues",
        "To stop growing",
        "To avoid needing food"
      ],
      1,
      "Reproduction produces new individuals and helps a kind of organism continue."
    ],
    [
      "After fertilisation, what can an ovule in a flower develop into?",
      [
        "A leaf",
        "A root",
        "A seed",
        "A petal"
      ],
      2,
      "A fertilised ovule can develop into a seed."
    ]
  ],
  "p5-water": [
    [
      "What is the change from water vapour to liquid water called?",
      [
        "Melting",
        "Freezing",
        "Evaporation",
        "Condensation"
      ],
      3,
      "Condensation changes water vapour into liquid water as it loses heat."
    ],
    [
      "What provides the energy for much of the evaporation in the water cycle?",
      [
        "The Sun",
        "The Moon",
        "The soil’s colour",
        "Clouds blocking light"
      ],
      0,
      "Heat from the Sun causes water to evaporate."
    ]
  ],
  "p5-plants": [
    [
      "Which substances are carried from roots to other plant parts in water-carrying tubes?",
      [
        "Only oxygen",
        "Water and mineral salts",
        "Only sugar",
        "Only carbon dioxide"
      ],
      1,
      "Water-carrying tubes transport water and mineral salts absorbed by roots."
    ],
    [
      "Through which structures does most gas exchange occur in leaves?",
      [
        "Petals",
        "Seeds",
        "Stomata",
        "Roots only"
      ],
      2,
      "Stomata are tiny openings through which gases enter and leave leaves."
    ]
  ],
  "p5-human": [
    [
      "Which organs take in oxygen from air and remove carbon dioxide?",
      [
        "Stomach",
        "Kidneys",
        "Food pipe",
        "Lungs"
      ],
      3,
      "Gas exchange takes place in the lungs."
    ],
    [
      "What is the main function of the heart?",
      [
        "Pump blood around the body",
        "Digest food",
        "Make air",
        "Store undigested food"
      ],
      0,
      "The heart pumps blood to transport substances around the body."
    ]
  ],
  "p5-electricity": [
    [
      "What is needed for a bulb to light in a simple working circuit?",
      [
        "A gap in the wire",
        "A complete circuit with a cell",
        "Only a bulb",
        "A plastic connection"
      ],
      1,
      "Current can flow through a complete circuit connected to a cell."
    ],
    [
      "Which material can complete a circuit by conducting electricity?",
      [
        "Rubber",
        "Plastic",
        "Copper",
        "Dry wood"
      ],
      2,
      "Copper conducts electricity and is commonly used in wires."
    ]
  ],
  "p6-photosynthesis": [
    [
      "Which gas do green plants take in for photosynthesis?",
      [
        "Oxygen",
        "Nitrogen",
        "Helium",
        "Carbon dioxide"
      ],
      3,
      "Plants use carbon dioxide and water to make food in the presence of light."
    ],
    [
      "What is the role of light in photosynthesis?",
      [
        "It supplies energy to make food",
        "It supplies mineral salts",
        "It replaces water",
        "It stops gas exchange"
      ],
      0,
      "Light supplies the energy needed for photosynthesis."
    ]
  ],
  "p6-energy": [
    [
      "A battery-powered torch mainly converts stored chemical energy into which useful output?",
      [
        "Sound",
        "Light",
        "Gravitational potential energy",
        "Elastic potential energy"
      ],
      1,
      "A torch produces useful light energy, as well as some heat."
    ],
    [
      "What happens to a falling ball’s gravitational potential energy as its speed increases?",
      [
        "It becomes water",
        "It disappears completely",
        "It is converted into kinetic energy",
        "It becomes food"
      ],
      2,
      "As the ball falls, gravitational potential energy is converted into kinetic energy."
    ]
  ],
  "p6-forces": [
    [
      "Which force pulls a dropped object towards Earth?",
      [
        "Magnetic force",
        "Elastic spring force",
        "Friction only",
        "Gravitational force"
      ],
      3,
      "Earth’s gravitational force pulls the object towards Earth."
    ],
    [
      "What does friction usually do to a sliding object?",
      [
        "Opposes its sliding motion",
        "Always speeds it up",
        "Makes it weightless",
        "Turns it into a magnet"
      ],
      0,
      "Friction opposes motion between surfaces in contact."
    ]
  ],
  "p6-environment": [
    [
      "In the chain grass → grasshopper → frog, which organism is the producer?",
      [
        "Frog",
        "Grass",
        "Grasshopper",
        "All three"
      ],
      1,
      "Grass makes its own food using light energy."
    ],
    [
      "If food becomes scarce in a habitat, what is likely to increase among animals needing that food?",
      [
        "Photosynthesis",
        "Water production",
        "Competition",
        "Seed dispersal"
      ],
      2,
      "Animals compete when a shared resource such as food is limited."
    ]
  ]
}
