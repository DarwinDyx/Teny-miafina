import { Dimensions } from "react-native";

export const COLORS = {
  background: "#0B0B0C",
  surface: "#121214",
  surfaceRaised: "#191A1D",
  border: "#2C2D31",
  selected: "#F2F2F4",
  text: "#FFFFFF",
  mutedText: "#A9ABB2",
  key: "#24262B",
  keyBorder: "#303139",
  green: "#538D4E",
  yellow: "#B59F3B",
  darkGray: "#272729",
  danger: "#F87171",
  overlay: "rgba(0, 0, 0, 0.75)",
};

export const MAX_ATTEMPTS = 6;
export const REVEAL_DELAY = 60;
export const SCREEN_WIDTH = Dimensions.get("window").width;
export const SCREEN_HEIGHT = Dimensions.get("window").height;
export const CELL_GAP = 6;

// AZERTY configuration without Q, W, X, U, C
export const KEYBOARD_ROWS = [
  ["A", "Z", "E", "R", "T", "Y", "I", "O", "P"],
  ["S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["V", "B", "N"],
];
