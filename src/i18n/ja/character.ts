import type { CharacterMessages } from "../modules/character";

export const character: CharacterMessages = {
  eyebrow: "Amadeus Persona",
  title: "キャラクター選択",
  description: "作業の流れに合わせて口調と反応強度を調整する相棒プロフィールです。",
  section: "Character",
  currentMode: "Current Mode",
  currentModeTemplate: "{name}基準で吹き出しとチャットのトーンを合わせます。",
  profiles: {
    ruda: {
      name: "ルダ",
      description: "やんちゃな妹テンション",
    },
    emilia: {
      name: "エミリア",
      description: "さりげなく見守るやさしさ",
    },
    daon: {
      name: "ダオン",
      description: "落ち着いた静かな慰め",
    },
  },
};
