export type HeroUser = {
  name: string;
  age: number;
  photo: string;
  distance: string;
  status: string;
};

export const heroUsers: HeroUser[] = [
  { name: "Ava", age: 26, photo: "https://randomuser.me/api/portraits/women/21.jpg", distance: "4 miles away", status: "Online now" },
  { name: "Mia", age: 24, photo: "https://randomuser.me/api/portraits/women/45.jpg", distance: "7 miles away", status: "Active 5m ago" },
  { name: "Luna", age: 28, photo: "https://randomuser.me/api/portraits/women/67.jpg", distance: "2 miles away", status: "Just matched" },
  { name: "Sofia", age: 25, photo: "https://randomuser.me/api/portraits/women/52.jpg", distance: "3 miles away", status: "Online now" },
  { name: "Emma", age: 27, photo: "https://randomuser.me/api/portraits/women/33.jpg", distance: "5 miles away", status: "Active 1h ago" },
  { name: "Olivia", age: 23, photo: "https://randomuser.me/api/portraits/women/14.jpg", distance: "6 miles away", status: "Online now" },
  { name: "Noah", age: 29, photo: "https://randomuser.me/api/portraits/men/44.jpg", distance: "8 miles away", status: "Active 20m ago" },
  { name: "Liam", age: 30, photo: "https://randomuser.me/api/portraits/men/39.jpg", distance: "9 miles away", status: "Online now" },
  { name: "Ethan", age: 27, photo: "https://randomuser.me/api/portraits/men/55.jpg", distance: "4 miles away", status: "Active 10m ago" },
  { name: "Aria", age: 26, photo: "https://randomuser.me/api/portraits/women/61.jpg", distance: "3 miles away", status: "Just matched" },
  { name: "Nora", age: 24, photo: "https://randomuser.me/api/portraits/women/31.jpg", distance: "5 miles away", status: "Online now" },
  { name: "Kai", age: 28, photo: "https://randomuser.me/api/portraits/men/28.jpg", distance: "6 miles away", status: "Active 30m ago" }
];

export function shuffleUsers(input: HeroUser[]) {
  const items = [...input];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

