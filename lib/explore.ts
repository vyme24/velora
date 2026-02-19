export type ExploreUser = {
  _id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  interests: string[];
  location?: { city?: string };
  isOnline?: boolean;
  privatePhotosLocked?: boolean;
};

export type ExploreCategory = {
  id: string;
  title: string;
  subtitle: string;
  stat: string;
  tone: string;
  bubble: string;
  type: "base" | "interest";
};

const tones = [
  { tone: "from-[#5B3BFF] to-[#8A6BFF]", bubble: "bg-[#7A60FF]" },
  { tone: "from-[#0076FF] to-[#44A0FF]", bubble: "bg-[#2D8CFF]" },
  { tone: "from-[#00A870] to-[#1ED09A]", bubble: "bg-[#16B982]" },
  { tone: "from-[#D43EFF] to-[#7E5BFF]", bubble: "bg-[#975AFF]" },
  { tone: "from-[#2BB9B7] to-[#4CD0CE]", bubble: "bg-[#1F8F9B]" }
];

export function interestToSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function slugToInterestLabel(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function milesFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * 13) % 16;
  return Math.max(1, hash);
}

export function buildExploreCategories(profiles: ExploreUser[]) {
  const allCount = profiles.length;
  const onlineCount = profiles.filter((entry) => Boolean(entry.isOnline)).length;
  const nearbyCount = profiles.filter((entry) => milesFromId(entry._id) <= 5).length;
  const privateCount = profiles.filter((entry) => Boolean(entry.privatePhotosLocked)).length;

  const base: ExploreCategory[] = [
    {
      id: "all",
      title: "All Profiles",
      subtitle: "Curated for you",
      stat: `+${allCount}`,
      ...tones[0],
      type: "base"
    },
    {
      id: "online",
      title: "Online Now",
      subtitle: "Ready to chat",
      stat: `+${onlineCount}`,
      ...tones[1],
      type: "base"
    },
    {
      id: "nearby",
      title: "Nearby",
      subtitle: "Local connections",
      stat: `+${nearbyCount}`,
      ...tones[2],
      type: "base"
    },
    {
      id: "private",
      title: "Private Photos",
      subtitle: "Unlock premium",
      stat: `+${privateCount}`,
      ...tones[3],
      type: "base"
    }
  ];

  const counts = new Map<string, { label: string; count: number }>();
  for (const profile of profiles) {
    for (const interestRaw of profile.interests || []) {
      const label = String(interestRaw || "").trim();
      if (!label) continue;
      const slug = interestToSlug(label);
      if (!slug) continue;
      const existing = counts.get(slug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(slug, { label, count: 1 });
      }
    }
  }

  const interestCategories: ExploreCategory[] = Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1].count !== a[1].count) return b[1].count - a[1].count;
      return a[1].label.localeCompare(b[1].label);
    })
    .slice(0, 8)
    .map(([slug, value], index) => ({
      id: `interest-${slug}`,
      title: value.label,
      subtitle: "Shared interest",
      stat: `+${value.count}`,
      ...tones[(index + 1) % tones.length],
      type: "interest"
    }));

  return [...base, ...interestCategories];
}
