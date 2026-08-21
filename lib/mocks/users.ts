import type { User } from "@/lib/types/user";

export const currentUser: User = {
  id: "user-me",
  name: "びんび",
  email: "binbi@example.com",
  initials: "BB",
  avatarColor: "pink",
};

export const mockUsers: User[] = [
  currentUser,
  {
    id: "user-haru",
    name: "はる",
    email: "haru@example.com",
    initials: "HR",
    avatarColor: "blue",
  },
  {
    id: "user-mio",
    name: "みお",
    email: "mio@example.com",
    initials: "MO",
    avatarColor: "violet",
  },
  {
    id: "user-ren",
    name: "れん",
    email: "ren@example.com",
    initials: "RN",
    avatarColor: "amber",
  },
];

