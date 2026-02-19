export const discoverProfiles = [
  {
    id: "u1",
    name: "Ava",
    age: 26,
    distance: "4 km away",
    bio: "Sunrise runner, espresso person, and spontaneous road-trip planner.",
    interests: ["Travel", "Pilates", "Indie Music"],
    images: ["/profiles/ava.svg", "/profiles/ava-2.svg"]
  },
  {
    id: "u2",
    name: "Mia",
    age: 24,
    distance: "7 km away",
    bio: "Museum dates, ramen hunts, and talking about books after midnight.",
    interests: ["Art", "Food", "Books"],
    images: ["/profiles/mia.svg", "/profiles/mia-2.svg"]
  },
  {
    id: "u3",
    name: "Luna",
    age: 28,
    distance: "2 km away",
    bio: "Product designer. Dog mom. Looking for kind energy and great banter.",
    interests: ["Design", "Dogs", "Hiking"],
    images: ["/profiles/luna.svg", "/profiles/luna-2.svg"]
  }
];

export const matchCards = [
  { id: "m1", name: "Aria", lastMessage: "Dinner this Friday?", online: true, image: "/profiles/ava.svg" },
  { id: "m2", name: "Noor", lastMessage: "That playlist is unreal.", online: false, image: "/profiles/mia.svg" },
  { id: "m3", name: "Kiara", lastMessage: "Send me your coffee list.", online: true, image: "/profiles/luna.svg" }
];

export const messages = [
  { id: "1", sender: "them", text: "Hey, I loved your profile.", time: "10:02" },
  { id: "2", sender: "me", text: "Thanks. Your travel photos are amazing.", time: "10:04" },
  { id: "3", sender: "them", text: "Want to grab coffee this weekend?", time: "10:05" }
] as const;
