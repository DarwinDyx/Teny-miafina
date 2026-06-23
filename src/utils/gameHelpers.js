import { Animated, Easing } from "react-native";
import { LISTE_MOTS } from "../data/mots.js";
import { COLORS, MAX_ATTEMPTS } from "../constants/theme.js";

export function pickRandomWord() {
  return LISTE_MOTS[Math.floor(Math.random() * LISTE_MOTS.length)].toUpperCase();
}

export function createEmptyBoard(wordLength) {
  return Array.from({ length: MAX_ATTEMPTS }, () =>
    Array.from({ length: wordLength }, () => "")
  );
}

export function createEmptyStatuses(wordLength) {
  return Array.from({ length: MAX_ATTEMPTS }, () =>
    Array.from({ length: wordLength }, () => "empty")
  );
}

export function createAnimatedGrid(wordLength, initialValue = 1) {
  return Array.from({ length: MAX_ATTEMPTS }, () =>
    Array.from({ length: wordLength }, () => new Animated.Value(initialValue))
  );
}

export function evaluateGuess(guess, secret) {
  const result = Array(secret.length).fill("absent");
  const remainingLetters = {};

  for (let index = 0; index < secret.length; index += 1) {
    if (guess[index] === secret[index]) {
      result[index] = "correct";
    } else {
      remainingLetters[secret[index]] =
        (remainingLetters[secret[index]] || 0) + 1;
    }
  }

  for (let index = 0; index < secret.length; index += 1) {
    const letter = guess[index];
    if (result[index] !== "correct" && remainingLetters[letter] > 0) {
      result[index] = "present";
      remainingLetters[letter] -= 1;
    }
  }

  return result;
}

export function getStatusColor(status) {
  if (status === "correct") return COLORS.green;
  if (status === "present") return COLORS.yellow;
  if (status === "absent") return COLORS.darkGray;
  return COLORS.surface;
}

export function animateTiming(value, toValue, duration) {
  return new Promise((resolve) => {
    Animated.timing(value, {
      toValue,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => resolve());
  });
}

export function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}
