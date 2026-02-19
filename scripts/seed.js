/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function loadEnvFromFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^"|"$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function ensureEnvLoaded() {
  const cwd = process.cwd();
  loadEnvFromFile(path.join(cwd, ".env.local"));
  loadEnvFromFile(path.join(cwd, ".env"));
}

function pickDbNameFromUri(uri) {
  try {
    const url = new URL(uri);
    const pathname = url.pathname.replace(/^\//, "");
    return pathname || "velora";
  } catch {
    return "velora";
  }
}

async function upsertUser(users, raw, passwordHash) {
  const username = (raw.username || raw.email.split("@")[0]).toLowerCase();
  const update = {
    $set: {
      name: raw.name,
      age: raw.age,
      gender: raw.gender,
      lookingFor: raw.lookingFor,
      username,
      bio: raw.bio,
      role: raw.role,
      accountStatus: "active",
      isVerified: true,
      coins: raw.coins,
      subscriptionPlan: raw.subscriptionPlan,
      isOnline: Boolean(raw.isOnline),
      lastActiveAt: raw.lastActiveAt || new Date(),
      photos: raw.photos,
      interests: raw.interests,
      location: {
        city: raw.city,
        country: "US",
        state: raw.state || "",
        radiusKm: 50,
        coordinates: raw.coordinates || [-73.935242, 40.73061]
      },
      preferences: {
        minAge: 21,
        maxAge: 45,
        gender: raw.preferencesGender || ["female", "male", "other"],
        verifiedOnly: false,
        onlineOnly: false,
        premiumOnly: false
      }
    },
    $setOnInsert: {
      email: raw.email,
      password: passwordHash,
      createdAt: new Date()
    }
  };

  await users.updateOne({ email: raw.email }, update, { upsert: true });
  return users.findOne({ email: raw.email });
}

async function run() {
  ensureEnvLoaded();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI in environment");
  }

  const dbName = pickDbNameFromUri(uri);
  await mongoose.connect(uri, { dbName });

  const db = mongoose.connection.db;
  const users = db.collection("users");
  const likes = db.collection("likes");
  const matches = db.collection("matches");
  const messages = db.collection("messages");
  const pricingPlans = db.collection("pricingplans");

  const seedPassword = process.env.SEED_DEFAULT_PASSWORD || "Velora@123";
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  const firstNamesFemale = [
    "Ava", "Mia", "Luna", "Sofia", "Emma", "Olivia", "Isabella", "Aria", "Nora", "Layla",
    "Zoe", "Ella", "Grace", "Ivy", "Camila", "Hannah", "Scarlett", "Chloe", "Stella", "Aaliyah",
    "Naomi", "Mila", "Leah", "Ruby", "Hazel", "Elena", "Aurora", "Gianna", "Amaya", "Freya"
  ];
  const firstNamesMale = [
    "Liam", "Noah", "Ethan", "Mason", "Elijah", "Lucas", "James", "Logan", "Henry", "Aiden",
    "Jackson", "Sebastian", "Mateo", "Leo", "Owen", "Julian", "Ezra", "Levi", "Asher", "Kai",
    "Theo", "Miles", "Nolan", "Roman", "Caleb", "Adrian", "Hudson", "Elias", "Jaxon", "Declan"
  ];
  const firstNamesNeutral = [
    "Alex", "Riley", "Jordan", "Taylor", "Casey", "Skyler", "Quinn", "Parker", "Avery", "Morgan"
  ];
  const cities = [
    { city: "New York", state: "NY", coordinates: [-73.935242, 40.73061] },
    { city: "Los Angeles", state: "CA", coordinates: [-118.243683, 34.052235] },
    { city: "Chicago", state: "IL", coordinates: [-87.623177, 41.881832] },
    { city: "Miami", state: "FL", coordinates: [-80.191788, 25.761681] },
    { city: "Seattle", state: "WA", coordinates: [-122.335167, 47.608013] },
    { city: "Austin", state: "TX", coordinates: [-97.743057, 30.267153] },
    { city: "Denver", state: "CO", coordinates: [-104.99025, 39.739235] },
    { city: "San Diego", state: "CA", coordinates: [-117.161087, 32.715736] },
    { city: "Boston", state: "MA", coordinates: [-71.058884, 42.360081] },
    { city: "Phoenix", state: "AZ", coordinates: [-112.074036, 33.448376] },
    { city: "Nashville", state: "TN", coordinates: [-86.781601, 36.162664] },
    { city: "Atlanta", state: "GA", coordinates: [-84.390185, 33.749001] }
  ];
  const interestsPool = [
    "Coffee", "Travel", "Live Music", "Pilates", "Hiking", "Foodie", "Photography", "Yoga",
    "Design", "Books", "Dogs", "Road Trips", "Cinema", "Running", "Tennis", "Cycling",
    "Art", "Cooking", "Beach", "Podcasts", "Gaming", "Museums", "Startups", "Fashion"
  ];
  const bioPartsA = [
    "Weekend explorer", "Coffee-first mornings", "Sunset walker", "Gym + brunch combo",
    "Always planning a trip", "Music and ramen fan", "Bookstore date advocate", "Dog park regular"
  ];
  const bioPartsB = [
    "looking for real vibes.", "here for chemistry and laughs.", "into honest conversations.",
    "let's trade playlists.", "let's find the best tacos in town.", "prefer slow burns over small talk.",
    "hoping to meet someone kind.", "let's start with a good chat."
  ];

  function pickFrom(list, index) {
    return list[index % list.length];
  }

  function makeEmail(index) {
    return `user${String(index).padStart(3, "0")}@velora.app`;
  }

  function makeName(gender, index) {
    if (gender === "female") return pickFrom(firstNamesFemale, index);
    if (gender === "male") return pickFrom(firstNamesMale, index);
    return pickFrom(firstNamesNeutral, index);
  }

  function randomUserPhotos(gender, index) {
    const bucket = gender === "female" ? "women" : "men";
    const p1 = index % 100;
    const p2 = (index + 17) % 100;
    const p3 = (index + 41) % 100;
    return [
      `https://randomuser.me/api/portraits/${bucket}/${p1}.jpg`,
      `https://randomuser.me/api/portraits/${bucket}/${p2}.jpg`,
      `https://randomuser.me/api/portraits/${bucket}/${p3}.jpg`
    ];
  }

  function makeDemoUsers(count) {
    const list = [];
    for (let i = 1; i <= count; i += 1) {
      const gender = i % 8 === 0 ? "other" : i % 2 === 0 ? "female" : "male";
      const effectivePhotoGender = gender === "other" ? (i % 3 === 0 ? "female" : "male") : gender;
      const name = makeName(gender, i);
      const city = pickFrom(cities, i);
      const age = 20 + (i % 17);
      const interests = [
        pickFrom(interestsPool, i),
        pickFrom(interestsPool, i + 5),
        pickFrom(interestsPool, i + 11)
      ];
      const plan = i % 9 === 0 ? "platinum" : i % 4 === 0 ? "gold" : "free";
      const bio = `${pickFrom(bioPartsA, i)}, ${pickFrom(bioPartsB, i + 3)}`;

      list.push({
        email: makeEmail(i),
        name,
        username: `${name.toLowerCase()}${i}`,
        age,
        gender,
        lookingFor: i % 5 === 0 ? "all" : gender === "male" ? "female" : "male",
        bio,
        role: "user",
        coins: 120 + ((i * 97) % 2600),
        subscriptionPlan: plan,
        photos: randomUserPhotos(effectivePhotoGender, i),
        interests,
        city: city.city,
        state: city.state,
        coordinates: city.coordinates,
        isOnline: i % 3 === 0,
        lastActiveAt: new Date(Date.now() - (i % 7) * 60 * 60 * 1000)
      });
    }
    return list;
  }

  const seedUsers = [
    {
      email: "superadmin@velora.app",
      name: "Velora Super Admin",
      age: 30,
      gender: "other",
      lookingFor: "all",
      bio: "Platform owner",
      role: "super_admin",
      coins: 5000,
      subscriptionPlan: "platinum",
      photos: ["https://randomuser.me/api/portraits/men/75.jpg", "https://randomuser.me/api/portraits/men/76.jpg"],
      interests: ["Ops", "Safety", "Growth"],
      city: "New York",
      state: "NY",
      coordinates: [-73.935242, 40.73061],
      isOnline: true
    },
    {
      email: "admin@velora.app",
      name: "Velora Admin",
      age: 28,
      gender: "female",
      lookingFor: "all",
      bio: "Moderation lead",
      role: "admin",
      coins: 2500,
      subscriptionPlan: "gold",
      photos: ["https://randomuser.me/api/portraits/women/65.jpg", "https://randomuser.me/api/portraits/women/66.jpg"],
      interests: ["Safety", "Trust"],
      city: "Los Angeles",
      state: "CA",
      coordinates: [-118.243683, 34.052235],
      isOnline: true
    },
    {
      email: "demo@velora.app",
      name: "Demo User",
      age: 27,
      gender: "male",
      lookingFor: "female",
      bio: "Product designer, gym in the morning, tacos at night.",
      role: "user",
      coins: 1900,
      subscriptionPlan: "gold",
      photos: [
        "https://randomuser.me/api/portraits/men/31.jpg",
        "https://randomuser.me/api/portraits/men/32.jpg",
        "https://randomuser.me/api/portraits/men/33.jpg"
      ],
      interests: ["Design", "Fitness", "Coffee"],
      city: "Austin",
      state: "TX",
      coordinates: [-97.743057, 30.267153],
      isOnline: true
    },
    {
      email: "ava@velora.app",
      name: "Ava",
      age: 26,
      gender: "female",
      lookingFor: "male",
      bio: "Sunrise runner and espresso person.",
      role: "user",
      coins: 300,
      subscriptionPlan: "free",
      photos: ["https://randomuser.me/api/portraits/women/12.jpg", "https://randomuser.me/api/portraits/women/13.jpg", "https://randomuser.me/api/portraits/women/14.jpg"],
      interests: ["Travel", "Pilates", "Music"],
      city: "Miami",
      state: "FL",
      coordinates: [-80.191788, 25.761681],
      isOnline: true
    },
    {
      email: "mia@velora.app",
      name: "Mia",
      age: 24,
      gender: "female",
      lookingFor: "male",
      bio: "Museum dates and ramen hunts.",
      role: "user",
      coins: 120,
      subscriptionPlan: "free",
      photos: ["https://randomuser.me/api/portraits/women/22.jpg", "https://randomuser.me/api/portraits/women/23.jpg", "https://randomuser.me/api/portraits/women/24.jpg"],
      interests: ["Art", "Books", "Food"],
      city: "Chicago",
      state: "IL",
      coordinates: [-87.623177, 41.881832],
      isOnline: false
    },
    {
      email: "luna@velora.app",
      name: "Luna",
      age: 28,
      gender: "female",
      lookingFor: "all",
      bio: "Designer, dog mom, sunset fan.",
      role: "user",
      coins: 800,
      subscriptionPlan: "gold",
      photos: ["https://randomuser.me/api/portraits/women/43.jpg", "https://randomuser.me/api/portraits/women/44.jpg", "https://randomuser.me/api/portraits/women/45.jpg"],
      interests: ["Design", "Dogs", "Hiking"],
      city: "Seattle",
      state: "WA",
      coordinates: [-122.335167, 47.608013],
      isOnline: true
    }
  ].concat(makeDemoUsers(94));

  const seedPricingPlans = [
    { key: "starter_290", kind: "coin", label: "Starter Pack", badge: "Limited", amount: 499, currency: "usd", coins: 290, extra: 0, active: true, sortOrder: 10 },
    { key: "basic_700", kind: "coin", label: "Basic", badge: "Basic", amount: 1199, currency: "usd", coins: 700, extra: 10, active: true, sortOrder: 20 },
    { key: "elite_1040", kind: "coin", label: "Elite", badge: "Elite", amount: 2495, currency: "usd", coins: 1040, extra: 20, active: true, sortOrder: 30 },
    { key: "bestseller_1760", kind: "coin", label: "Bestseller", badge: "Bestseller", amount: 3995, currency: "usd", coins: 1760, extra: 30, active: true, sortOrder: 40 },
    { key: "diamond_4160", kind: "coin", label: "Diamond", badge: "Diamond", amount: 8995, currency: "usd", coins: 4160, extra: 60, active: true, sortOrder: 50 },
    { key: "sub_gold", kind: "subscription", label: "Gold", badge: "Popular", amount: 1499, currency: "usd", subscriptionKey: "gold", stripePriceId: process.env.STRIPE_PRICE_GOLD || null, active: true, sortOrder: 10 },
    { key: "sub_platinum", kind: "subscription", label: "Platinum", badge: "Best Value", amount: 2999, currency: "usd", subscriptionKey: "platinum", stripePriceId: process.env.STRIPE_PRICE_PLATINUM || null, active: true, sortOrder: 20 }
  ];

  for (const plan of seedPricingPlans) {
    await pricingPlans.updateOne(
      { key: plan.key },
      {
        $set: {
          ...plan,
          key: plan.key.toLowerCase(),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
  }

  const docs = {};
  for (const user of seedUsers) {
    docs[user.email] = await upsertUser(users, user, passwordHash);
  }

  const seededEmails = seedUsers.map((entry) => entry.email);
  const seededDocs = await users.find({ email: { $in: seededEmails } }).project({ _id: 1, email: 1, role: 1 }).toArray();
  const seededIds = seededDocs.map((entry) => entry._id);

  await likes.deleteMany({ sender: { $in: seededIds }, receiver: { $in: seededIds } });
  await matches.deleteMany({ user1: { $in: seededIds }, user2: { $in: seededIds } });
  await messages.deleteMany({ sender: { $in: seededIds }, receiver: { $in: seededIds } });

  const userOnly = seededDocs.filter((entry) => entry.role === "user");
  const likeOps = [];
  const matchDocs = [];
  const messageDocs = [];
  const uniqueLike = new Set();
  const uniqueMatch = new Set();
  const threadTemplates = [
    "Hey, your profile stood out right away.",
    "Love your vibe. How's your week going?",
    "I'm checking out a new coffee place this weekend.",
    "What's your ideal first date?",
    "You seem fun. Want to chat more?",
    "Any travel plans coming up?",
    "Big fan of your music taste.",
    "Can we exchange playlist recommendations?"
  ];

  function addLike(senderId, receiverId) {
    const key = `${String(senderId)}:${String(receiverId)}`;
    if (uniqueLike.has(key)) return;
    uniqueLike.add(key);
    likeOps.push({
      updateOne: {
        filter: { sender: senderId, receiver: receiverId },
        update: { $setOnInsert: { sender: senderId, receiver: receiverId, createdAt: new Date(), updatedAt: new Date() } },
        upsert: true
      }
    });
  }

  function addMatch(aId, bId, initiatedBy) {
    const [user1, user2] = [aId, bId].sort((left, right) => String(left).localeCompare(String(right)));
    const key = `${String(user1)}:${String(user2)}`;
    if (uniqueMatch.has(key)) return;
    uniqueMatch.add(key);
    const matchedAt = new Date(Date.now() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000));
    matchDocs.push({
      user1,
      user2,
      initiatedBy,
      isActive: true,
      unmatchedAt: null,
      matchedAt,
      createdAt: matchedAt,
      updatedAt: matchedAt
    });

    for (let i = 0; i < 5; i += 1) {
      const sender = i % 2 === 0 ? aId : bId;
      const receiver = i % 2 === 0 ? bId : aId;
      const text = threadTemplates[(i + key.length) % threadTemplates.length];
      const timestamp = new Date(matchedAt.getTime() + i * 12 * 60 * 1000);
      messageDocs.push({
        sender,
        receiver,
        message: text,
        image: "",
        seen: i < 4,
        seenAt: i < 4 ? new Date(timestamp.getTime() + 2 * 60 * 1000) : null,
        isDeletedBySender: false,
        isDeletedByReceiver: false,
        metadata: { type: "text", requiresCoins: false, consumedCoins: 0 },
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
  }

  for (let i = 0; i < userOnly.length; i += 1) {
    const a = userOnly[i];
    const b = userOnly[(i + 1) % userOnly.length];
    const c = userOnly[(i + 3) % userOnly.length];
    const d = userOnly[(i + 7) % userOnly.length];

    addLike(a._id, b._id);
    addLike(b._id, a._id);
    addMatch(a._id, b._id, a._id);

    addLike(a._id, c._id);
    addLike(c._id, a._id);
    if (i % 2 === 0) addMatch(a._id, c._id, c._id);

    addLike(a._id, d._id);
  }

  if (likeOps.length) await likes.bulkWrite(likeOps, { ordered: false });
  if (matchDocs.length) await matches.insertMany(matchDocs, { ordered: false });
  if (messageDocs.length) await messages.insertMany(messageDocs, { ordered: false });

  console.log("Seed completed successfully.");
  console.log("Default password:", seedPassword);
  console.log(`Total users seeded/updated: ${seedUsers.length}`);
  console.log(`Likes seeded: ${likeOps.length}`);
  console.log(`Matches seeded: ${matchDocs.length}`);
  console.log(`Messages seeded: ${messageDocs.length}`);
  console.log("Primary demo accounts:");
  console.log("- demo@velora.app (user)");
  console.log("- admin@velora.app (admin)");
  console.log("- superadmin@velora.app (super_admin)");
  console.log("Users:");
  for (const user of seedUsers) {
    console.log(`- ${user.email} (${user.role})`);
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // noop
  }
  process.exit(1);
});
