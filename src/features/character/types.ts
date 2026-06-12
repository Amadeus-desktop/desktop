export type CharacterId = "ruda" | "emilia" | "daon";

export type Character = {
  id: CharacterId;
  name: string;
  description: string;
  avatar: string;
  avatarClassName: string;
};
