export type CompanionMessage = {
  id: string;
  sender: "companion" | "user";
  text: string;
};
