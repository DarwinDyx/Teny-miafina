import AsyncStorage from "@react-native-async-storage/async-storage";

const STATS_STORAGE_KEY = "teny-miafina-stats";

export const DEFAULT_STATS = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  maxStreak: 0,
};

/**
 * Loads player statistics from AsyncStorage.
 * Returns default stats if nothing is stored or on error.
 */
export async function getGameStats() {
  try {
    const storedStats = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    return storedStats ? JSON.parse(storedStats) : DEFAULT_STATS;
  } catch (error) {
    console.error("Error loading stats from AsyncStorage:", error);
    return DEFAULT_STATS;
  }
}

/**
 * Persists player statistics to AsyncStorage.
 */
export async function saveGameStats(stats) {
  try {
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error("Error saving stats to AsyncStorage:", error);
  }
}

/**
 * Computes the new statistics state based on previous stats and the outcome of the game.
 */
export function calculateNewStats(prevStats, isWon) {
  const gamesPlayed = (prevStats?.gamesPlayed || 0) + 1;
  const gamesWon = isWon ? (prevStats?.gamesWon || 0) + 1 : (prevStats?.gamesWon || 0);
  const currentStreak = isWon ? (prevStats?.currentStreak || 0) + 1 : 0;
  const maxStreak = Math.max(prevStats?.maxStreak || 0, currentStreak);

  return { gamesPlayed, gamesWon, currentStreak, maxStreak };
}
