import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import * as Haptics from "expo-haptics";

import { LISTE_MOTS } from "./src/data/mots.js";
import {
  COLORS,
  MAX_ATTEMPTS,
  REVEAL_DELAY,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  CELL_GAP,
} from "./src/constants/theme.js";
import {
  evaluateGuess,
  pickRandomWord,
  createEmptyBoard,
  createEmptyStatuses,
  createAnimatedGrid,
  animateTiming,
  sleep,
} from "./src/utils/gameHelpers.js";
import {
  getGameStats,
  saveGameStats,
  calculateNewStats,
  DEFAULT_STATS,
} from "./src/utils/storageHelpers.js";
import { GameCell } from "./src/components/GameCell.jsx";
import { CustomKeyboard } from "./src/components/CustomKeyboard.jsx";

export default function App() {
  const [secretWord, setSecretWord] = useState(() => pickRandomWord());
  const [board, setBoard] = useState(() => createEmptyBoard(secretWord.length));
  const [statuses, setStatuses] = useState(() => createEmptyStatuses(secretWord.length));
  const [currentRow, setCurrentRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [message, setMessage] = useState("Tadiavo ny teny miafina.");
  const [gameStatus, setGameStatus] = useState("playing");
  const [isRevealing, setIsRevealing] = useState(false);

  // Player statistics state
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Animated Splash Screen States
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const textOpacity = useRef(new Animated.Value(0)).current;
  const zoomScale = useRef(new Animated.Value(0.9)).current;
  const splashOpacity = useRef(new Animated.Value(1)).current;

  // Grid pop & flip animations
  const popValuesRef = useRef(createAnimatedGrid(secretWord.length, 1));
  const flipValuesRef = useRef(createAnimatedGrid(secretWord.length, 0));

  // Shake animation translation values (one per row)
  const shakeValuesRef = useRef(
    Array.from({ length: MAX_ATTEMPTS }, () => new Animated.Value(0))
  );

  const isGameOver = gameStatus !== "playing";
  const isInputDisabled = isGameOver || isRevealing || isSplashVisible;
  const canConfirm = board[currentRow]?.every(Boolean);

  // Load player statistics on mount
  useEffect(() => {
    async function loadStats() {
      const storedStats = await getGameStats();
      setStats(storedStats);
    }
    loadStats();
  }, []);

  // Animated Splash Screen sequence
  useEffect(() => {
    // 1. Text fade-in (0 to 1) in 800ms
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // 2. Slow, continuous zoom (0.9 to 1.05) over 2500ms
    Animated.timing(zoomScale, {
      toValue: 1.05,
      duration: 2500,
      useNativeDriver: true,
    }).start();

    // 3. Fade-out the entire splash screen (1 to 0) in 500ms after 2500ms
    const timer = setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setIsSplashVisible(false);
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [textOpacity, zoomScale, splashOpacity]);

  // Update statistics helper using storageHelper methods
  const updateStats = useCallback(async (isWon) => {
    setStats((prevStats) => {
      const newStats = calculateNewStats(prevStats, isWon);
      saveGameStats(newStats);
      return newStats;
    });
  }, []);

  const boardWidth = useMemo(() => {
    const horizontalPadding = 28;
    const maxBoardWidth = Math.min(SCREEN_WIDTH - horizontalPadding, 420);
    const maxGridHeight = SCREEN_HEIGHT * 0.45;
    const maxCellFromWidth = (maxBoardWidth - CELL_GAP * (secretWord.length - 1)) / secretWord.length;
    const maxCellFromHeight = (maxGridHeight - CELL_GAP * (MAX_ATTEMPTS - 1)) / MAX_ATTEMPTS;
    const cellSize = Math.max(34, Math.min(maxCellFromWidth, maxCellFromHeight, 68));

    return cellSize * secretWord.length + CELL_GAP * (secretWord.length - 1);
  }, [secretWord.length]);

  const keyboardColors = useMemo(() => {
    const colorsByLetter = {};
    const rank = { absent: 1, present: 2, correct: 3 };

    statuses.forEach((row, rowIndex) => {
      row.forEach((status, colIndex) => {
        const letter = board[rowIndex][colIndex];
        if (!letter || status === "empty") return;

        const currentRank = rank[colorsByLetter[letter]] || 0;
        if (rank[status] > currentRank) {
          colorsByLetter[letter] = status;
        }
      });
    });

    return colorsByLetter;
  }, [board, statuses]);

  const resetGame = useCallback(() => {
    const nextWord = pickRandomWord();
    popValuesRef.current = createAnimatedGrid(nextWord.length, 1);
    flipValuesRef.current = createAnimatedGrid(nextWord.length, 0);
    shakeValuesRef.current.forEach((val) => val.setValue(0));

    setSecretWord(nextWord);
    setBoard(createEmptyBoard(nextWord.length));
    setStatuses(createEmptyStatuses(nextWord.length));
    setCurrentRow(0);
    setSelectedCol(0);
    setMessage("Tadiavo ny teny miafina.");
    setGameStatus("playing");
    setIsRevealing(false);
  }, []);

  const animateCellPop = useCallback((rowIndex, colIndex) => {
    const popValue = popValuesRef.current[rowIndex]?.[colIndex];
    if (!popValue) return;

    popValue.setValue(0.85);
    Animated.spring(popValue, {
      toValue: 1,
      friction: 4,
      tension: 280,
      useNativeDriver: true,
    }).start();
  }, []);

  // Triggers a horizontal shake sequence on the active row
  const triggerRowShake = useCallback((rowIndex) => {
    const shakeValue = shakeValuesRef.current[rowIndex];
    if (!shakeValue) return;

    shakeValue.setValue(0);
    Animated.sequence([
      Animated.timing(shakeValue, { toValue: -10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 10, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: -8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 8, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: -5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 5, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeValue, { toValue: 0, duration: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const getNextAvailableCell = useCallback((currentBoard, startCol) => {
    for (let index = startCol + 1; index < secretWord.length; index += 1) {
      if (!currentBoard[currentRow][index]) return index;
    }
    return Math.min(startCol + 1, secretWord.length - 1);
  }, [currentRow, secretWord.length]);

  const addLetter = useCallback((letter) => {
    if (isInputDisabled) return;

    // Premium light tactile feedback for key presses
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Clear dictionary or completion error messages when typing a new letter
    setMessage((prev) => {
      if (prev === "Tsy ao anatin'ny rakibolana" || prev.startsWith("Fenoy aloha")) {
        return "Tadiavo ny teny miafina.";
      }
      return prev;
    });

    setBoard((previousBoard) => {
      const nextBoard = previousBoard.map((row) => [...row]);
      nextBoard[currentRow][selectedCol] = letter;
      
      const nextCol = getNextAvailableCell(nextBoard, selectedCol);
      setSelectedCol(nextCol);
      return nextBoard;
    });

    animateCellPop(currentRow, selectedCol);
  }, [animateCellPop, currentRow, isInputDisabled, getNextAvailableCell, selectedCol]);

  const removeLetter = useCallback(() => {
    if (isInputDisabled) return;

    // Premium light tactile feedback for backspace press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    // Clear dictionary or completion error messages when removing a letter
    setMessage((prev) => {
      if (prev === "Tsy ao anatin'ny rakibolana" || prev.startsWith("Fenoy aloha")) {
        return "Tadiavo ny teny miafina.";
      }
      return prev;
    });

    setBoard((previousBoard) => {
      const nextBoard = previousBoard.map((row) => [...row]);

      if (nextBoard[currentRow][selectedCol]) {
        nextBoard[currentRow][selectedCol] = "";
        return nextBoard;
      }

      if (selectedCol > 0) {
        const prevCol = selectedCol - 1;
        nextBoard[currentRow][prevCol] = "";
        setSelectedCol(prevCol);
      }

      return nextBoard;
    });
  }, [currentRow, isInputDisabled, selectedCol]);

  const selectCell = useCallback((colIndex) => {
    if (isInputDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedCol(colIndex);
  }, [isInputDisabled]);

  const revealRow = useCallback(async (rowIndex, evaluatedRow) => {
    for (let colIndex = 0; colIndex < evaluatedRow.length; colIndex += 1) {
      const flipValue = flipValuesRef.current[rowIndex][colIndex];
      await animateTiming(flipValue, 90, 75); 

      setStatuses((previousStatuses) => {
        const nextStatuses = previousStatuses.map((row) => [...row]);
        nextStatuses[rowIndex][colIndex] = evaluatedRow[colIndex];
        return nextStatuses;
      });

      flipValue.setValue(-90);
      animateTiming(flipValue, 0, 95);
      await sleep(REVEAL_DELAY);
    }
  }, []);

  const confirmGuess = useCallback(async () => {
    if (isInputDisabled) return;

    // Check if the current row has all letters filled
    if (!canConfirm) {
      setMessage(`Fenoy aloha ny litera ${secretWord.length}.`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerRowShake(currentRow);
      return;
    }

    const guess = board[currentRow].join("").toUpperCase();

    // STRICT VALIDATION AGAINST THE DICTIONARY (Rakibolana)
    if (!LISTE_MOTS.includes(guess)) {
      setMessage("Tsy ao anatin'ny rakibolana");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      triggerRowShake(currentRow);
      return;
    }

    setIsRevealing(true);
    setMessage("Mamarina...");

    // Evaluate guess using local helper logic
    const evaluatedRow = evaluateGuess(guess, secretWord);
    await revealRow(currentRow, evaluatedRow);

    if (guess === secretWord) {
      setGameStatus("won");
      setMessage("Tena tsara!");
      setIsRevealing(false);

      // Premium success haptics feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      
      // Update persistent user statistics
      await updateStats(true);
      return;
    }

    if (currentRow === MAX_ATTEMPTS - 1) {
      setGameStatus("lost");
      setMessage("Tapitra ny andrana.");
      setIsRevealing(false);

      // Premium error haptics feedback for defeat
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});

      // Update persistent user statistics
      await updateStats(false);
      return;
    }

    setCurrentRow((previousRow) => previousRow + 1);
    setSelectedCol(0);
    setMessage("Andramo indray.");
    setIsRevealing(false);
  }, [board, canConfirm, currentRow, isInputDisabled, revealRow, secretWord, updateStats, triggerRowShake]);

  const modalTitle = gameStatus === "won" ? "Arahabaina!" : "Miala tsiny!";
  const modalMessage =
    gameStatus === "won" ? "Hita ny teny miafina!" : "Tsy hita ny teny miafina.";

  const winPercentage = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      <View style={styles.container}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>Teny Miafina</Text>
          <Text style={styles.subtitle}>MALAGASY WORDLE</Text>
          <View style={styles.messageWrap}>
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>

        <View style={styles.gridBox}>
          <View style={[styles.board, { width: boardWidth }]}>
            {board.map((row, rowIndex) => (
              <Animated.View
                key={`row-${rowIndex}`}
                style={[
                  styles.row,
                  {
                    transform: [
                      { translateX: shakeValuesRef.current[rowIndex] },
                    ],
                  },
                ]}
              >
                {row.map((letter, colIndex) => (
                  <GameCell
                    key={`cell-${rowIndex}-${colIndex}`}
                    letter={letter}
                    status={statuses[rowIndex][colIndex]}
                    isSelected={
                      rowIndex === currentRow &&
                      colIndex === selectedCol &&
                      !isInputDisabled
                    }
                    isTouchable={rowIndex === currentRow && !isInputDisabled}
                    flipValue={flipValuesRef.current[rowIndex][colIndex]}
                    popValue={popValuesRef.current[rowIndex][colIndex]}
                    onPress={() => selectCell(colIndex)}
                  />
                ))}
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.keyboardBox}>
          <CustomKeyboard
            onLetterPress={addLetter}
            onBackspace={removeLetter}
            onConfirm={confirmGuess}
            keyboardColors={keyboardColors}
            disabled={isInputDisabled}
            canConfirm={canConfirm}
          />
        </View>
      </View>

      {gameStatus === "won" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon count={140} origin={{ x: -20, y: 30 }} explosionSpeed={200} fallSpeed={1200} fadeOut autoStart />
          <ConfettiCannon count={140} origin={{ x: SCREEN_WIDTH + 20, y: 30 }} explosionSpeed={200} fallSpeed={1200} fadeOut autoStart />
        </View>
      )}

      {/* Persistent Statistics Modal */}
      <Modal transparent visible={isGameOver} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, gameStatus === "lost" && styles.modalTitleLost]}>
              {modalTitle}
            </Text>
            <Text style={styles.modalMessage}>{modalMessage}</Text>
            <Text style={styles.secretRevealText}>Ny teny marina : {secretWord}</Text>

            {/* Statistics Dashboard */}
            <Text style={styles.statsTitle}>Statistika</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.gamesPlayed}</Text>
                <Text style={styles.statLabel}>Lalao</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{winPercentage}%</Text>
                <Text style={styles.statLabel}>Fandresena</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.currentStreak}</Text>
                <Text style={styles.statLabel}>Série</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.maxStreak}</Text>
                <Text style={styles.statLabel}>Max</Text>
              </View>
            </View>

            <Pressable onPress={resetGame} style={styles.playAgainButton}>
              <Text style={styles.playAgainText}>HILALAO INDRAY</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Animated Splash Screen Overlay */}
      {isSplashVisible && (
        <Animated.View style={[styles.splashContainer, { opacity: splashOpacity }]}>
          <Animated.View
            style={[
              styles.splashContent,
              {
                opacity: textOpacity,
                transform: [{ scale: zoomScale }],
              },
            ]}
          >
            <Text style={styles.splashTitle}>Teny Miafina</Text>
            <Text style={styles.splashSubtitle}>MALAGASY WORDLE</Text>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
  headerBox: {
    flex: 15,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: "900",
  },
  subtitle: {
    color: COLORS.mutedText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 2,
  },
  gridBox: {
    flex: 45,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  board: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    gap: 6,
  },
  messageWrap: {
    minHeight: 24,
    justifyContent: "center",
    marginTop: 6,
  },
  message: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: "700",
  },
  keyboardBox: {
    flex: 40,
    width: "100%",
    maxWidth: 480,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.overlay,
  },
  modalCard: {
    width: "85%",
    maxWidth: 340,
    alignItems: "center",
    backgroundColor: COLORS.surfaceRaised,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
    marginBottom: 6,
  },
  modalTitleLost: {
    color: COLORS.danger,
  },
  modalMessage: {
    color: COLORS.mutedText,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  secretRevealText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 16,
    marginTop: 4,
  },
  statsTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
    textTransform: "uppercase",
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.mutedText,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase",
  },
  playAgainButton: {
    width: "100%",
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.green,
    borderRadius: 8,
  },
  playAgainText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  /* Splash Screen Animated Styles */
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  splashContent: {
    alignItems: "center",
  },
  splashTitle: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 2,
  },
  splashSubtitle: {
    color: COLORS.mutedText,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 8,
    textTransform: "uppercase",
  },
});