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
  Switch,
  Text,
  View,
  Alert,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

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
  generateSecretWord,
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
import MainMenu from "./src/components/MainMenu.jsx";

const HAPTICS_STORAGE_KEY = "teny-miafina-haptics";

export default function App() {
  // Navigation & Game Config
  const [gameState, setGameState] = useState("HOME"); // "HOME", "PLAYING", "STATS"
  const [wordLength, setWordLength] = useState(5); // 4, 5, or 7
  const [difficulty, setDifficulty] = useState("moyen"); // "facile", "moyen", "difficile"
  const [secretWord, setSecretWord] = useState(() => generateSecretWord(5));

  const [board, setBoard] = useState(() => createEmptyBoard(secretWord.length));
  const [statuses, setStatuses] = useState(() => createEmptyStatuses(secretWord.length));
  const [currentRow, setCurrentRow] = useState(0);
  const [selectedCol, setSelectedCol] = useState(0);
  const [message, setMessage] = useState("Tadiavo ny teny miafina.");
  const [gameStatus, setGameStatus] = useState("playing");
  const [isRevealing, setIsRevealing] = useState(false);

  // Player statistics state
  const [stats, setStats] = useState(DEFAULT_STATS);

  // Modals Visibility
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [isStatsModalVisible, setIsStatsModalVisible] = useState(false);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

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

  // Load configuration and statistics on mount
  useEffect(() => {
    async function loadInitialData() {
      const storedStats = await getGameStats();
      setStats(storedStats);

      try {
        const storedHaptics = await AsyncStorage.getItem(HAPTICS_STORAGE_KEY);
        if (storedHaptics !== null) {
          setHapticsEnabled(JSON.parse(storedHaptics));
        }
      } catch (e) {
        console.error("Error loading haptics config:", e);
      }
    }
    loadInitialData();
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

  // Centralized Haptic Trigger helper
  const triggerHaptic = useCallback((type) => {
    if (!hapticsEnabled) return;

    if (type === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else if (type === "warning") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } else if (type === "success") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [hapticsEnabled]);

  // Toggle Haptics configuration
  const toggleHaptics = useCallback(async (value) => {
    setHapticsEnabled(value);
    try {
      await AsyncStorage.setItem(HAPTICS_STORAGE_KEY, JSON.stringify(value));
    } catch (e) {
      console.error("Error saving haptics config:", e);
    }
  }, []);

  // Reset player statistics
  const handleResetStats = useCallback(() => {
    Alert.alert(
      "Hamerina ny statistika",
      "Tena te-hamerina ho 0 ny statistika rehetra ve ianao?",
      [
        { text: "Hanafoana", style: "cancel" },
        {
          text: "Eny, avereno",
          style: "destructive",
          onPress: async () => {
            await saveGameStats(DEFAULT_STATS);
            setStats(DEFAULT_STATS);
            triggerHaptic("warning");
            Alert.alert("Voaverina!", "Voaverina ho 0 ny statistika rehetra.");
          },
        },
      ]
    );
  }, [triggerHaptic]);

  // Update statistics helper using storageHelper methods
  const updateStats = useCallback(async (isWon) => {
    setStats((prevStats) => {
      const newStats = calculateNewStats(prevStats, isWon);
      saveGameStats(newStats);
      return newStats;
    });
  }, []);

  // Dynamic board width calculation according to word length
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

  const getDifficultyLabel = useCallback((diff) => {
    if (diff === "facile") return "TSOTRA";
    if (diff === "moyen") return "ANTATANY";
    if (diff === "difficile") return "SAROTRA";
    return diff.toUpperCase();
  }, []);

  // Launches the game with a selected difficulty
  const startGame = useCallback((selectedDiff) => {
    setDifficulty(selectedDiff);
    let length = 5;
    if (selectedDiff === "facile") length = 4;
    else if (selectedDiff === "moyen") length = 5;
    else if (selectedDiff === "difficile") length = 7;
    
    setWordLength(length);
    const nextWord = generateSecretWord(length);
    
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
    setGameState("PLAYING");
  }, []);

  const resetGame = useCallback(() => {
    const nextWord = generateSecretWord(wordLength);
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
  }, [wordLength]);

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

    // Premium light tactile feedback
    triggerHaptic("light");

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
  }, [animateCellPop, currentRow, isInputDisabled, getNextAvailableCell, selectedCol, triggerHaptic]);

  const removeLetter = useCallback(() => {
    if (isInputDisabled) return;

    // Premium light tactile feedback
    triggerHaptic("light");

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
  }, [currentRow, isInputDisabled, selectedCol, triggerHaptic]);

  const selectCell = useCallback((colIndex) => {
    if (isInputDisabled) return;
    triggerHaptic("light");
    setSelectedCol(colIndex);
  }, [isInputDisabled, triggerHaptic]);

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
      triggerHaptic("warning");
      triggerRowShake(currentRow);
      return;
    }

    const guess = board[currentRow].join("").toUpperCase();

    // STRICT VALIDATION AGAINST THE DICTIONARY (Rakibolana)
    if (!LISTE_MOTS.includes(guess.toLowerCase())) {
      setMessage("Tsy ao anatin'ny rakibolana");
      triggerHaptic("warning");
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

      // Premium success haptics
      triggerHaptic("success");
      
      // Update persistent user statistics
      await updateStats(true);
      return;
    }

    if (currentRow === MAX_ATTEMPTS - 1) {
      setGameStatus("lost");
      setMessage("Tapitra ny andrana.");
      setIsRevealing(false);

      // Premium warning haptics for defeat
      triggerHaptic("warning");

      // Update persistent user statistics
      await updateStats(false);
      return;
    }

    setCurrentRow((previousRow) => previousRow + 1);
    setSelectedCol(0);
    setMessage("Andramo indray.");
    setIsRevealing(false);
  }, [board, canConfirm, currentRow, isInputDisabled, revealRow, secretWord, updateStats, triggerRowShake, triggerHaptic]);

  const modalTitle = gameStatus === "won" ? "Arahabaina!" : "Miala tsiny!";
  const modalMessage =
    gameStatus === "won" ? "Hita ny teny miafina!" : "Tsy hita ny teny miafina.";

  const winPercentage = stats.gamesPlayed > 0 
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
    : 0;

  // Render Splash Screen directly on top if active
  if (isSplashVisible) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {gameState === "HOME" || gameState === "STATS" ? (
        <MainMenu
          onSelectDifficulty={startGame}
          onOpenStats={() => {
            setIsStatsModalVisible(true);
            setGameState("STATS");
          }}
        />
      ) : (
        // Game View
        <View style={styles.container}>
          {/* Header Section */}
          <View style={styles.headerBox}>
            <View style={styles.headerRow}>
              <Pressable onPress={() => setGameState("HOME")} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </Pressable>
              
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Teny Miafina</Text>
                <Text style={styles.subtitle}>MALAGASY WORDLE ({difficulty.toUpperCase()})</Text>
              </View>
              
              <Pressable onPress={() => setIsSettingsVisible(true)} style={styles.settingsButton}>
                <Ionicons name="settings-sharp" size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            <View style={styles.messageWrap}>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>

          {/* Board Grid */}
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
                      secretWordLength={secretWord.length}
                    />
                  ))}
                </Animated.View>
              ))}
            </View>
          </View>

          {/* Keyboard Input */}
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
      )}

      {gameStatus === "won" && gameState === "PLAYING" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ConfettiCannon count={140} origin={{ x: -20, y: 30 }} explosionSpeed={200} fallSpeed={1200} fadeOut autoStart />
          <ConfettiCannon count={140} origin={{ x: SCREEN_WIDTH + 20, y: 30 }} explosionSpeed={200} fallSpeed={1200} fadeOut autoStart />
        </View>
      )}

      {/* Settings Modal (Fikirana) */}
      <Modal transparent visible={isSettingsVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Fikirana</Text>
              <Pressable onPress={() => setIsSettingsVisible(false)} style={styles.closeButton}>
                <Ionicons name="close" size={26} color="#A9ABB2" />
              </Pressable>
            </View>

            {/* Switch Haptics */}
            <View style={styles.settingRow}>
              <View>
                <Text style={styles.settingLabel}>Vibrations / Haptique</Text>
                <Text style={styles.settingSublabel}>Tsindry sy vibrations amin'ny rantsan-tanana</Text>
              </View>
              <Switch
                value={hapticsEnabled}
                onValueChange={toggleHaptics}
                trackColor={{ false: COLORS.border, true: COLORS.green }}
                thumbColor={hapticsEnabled ? COLORS.text : COLORS.mutedText}
              />
            </View>

            {/* Rules of the game */}
            <Text style={styles.sectionTitle}>Fomba filalaovana</Text>
            <View style={styles.rulesContainer}>
              <Text style={styles.ruleText}>• Tadiavo ny teny miafina amin'ny andrana 6.</Text>
              <Text style={styles.ruleText}>• Ny andrana tsirairay dia tsy maintsy teny misy dikany.</Text>
              <Text style={styles.ruleText}>• Rehefa manamarina ianao, dia hiova ny lokon'ireo litera :</Text>
              
              <View style={styles.ruleExplanationRow}>
                <View style={[styles.miniIndicator, { backgroundColor: COLORS.green }]} />
                <Text style={styles.ruleDetailText}>Toerana marina (Maitso / Manga)</Text>
              </View>
              <View style={styles.ruleExplanationRow}>
                <View style={[styles.miniIndicator, { backgroundColor: COLORS.yellow }]} />
                <Text style={styles.ruleDetailText}>Litera misy ihany (Mavo)</Text>
              </View>
              <View style={styles.ruleExplanationRow}>
                <View style={[styles.miniIndicator, { backgroundColor: COLORS.darkGray }]} />
                <Text style={styles.ruleDetailText}>Tsy ao anatin'ny teny (Mainty)</Text>
              </View>
            </View>

            {/* Reset statistics button */}
            <Pressable onPress={handleResetStats} style={styles.resetButton}>
              <Ionicons name="trash-outline" size={20} color="#F87171" style={{ marginRight: 8 }} />
              <Text style={styles.resetButtonText}>Hamerina ny statistika rehetra</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Persistent Statistics Modal (Shared for Game Over and Stats Button) */}
      <Modal transparent visible={isGameOver || isStatsModalVisible || gameState === "STATS"} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, !isStatsModalVisible && gameStatus === "lost" && styles.modalTitleLost]}>
                {isStatsModalVisible ? "Statistika" : modalTitle}
              </Text>
              {isStatsModalVisible && (
                <Pressable onPress={() => {
                  setIsStatsModalVisible(false);
                  setGameState("HOME");
                }} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color="#A9ABB2" />
                </Pressable>
              )}
            </View>
            
            {!isStatsModalVisible && (
              <>
                <Text style={styles.modalMessage}>{modalMessage}</Text>
                <Text style={styles.secretRevealText}>Ny teny marina : {secretWord}</Text>
              </>
            )}

            {/* Statistics Dashboard */}
            {isStatsModalVisible && <Text style={styles.statsTitle}>Statistika ankapobeny</Text>}
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

            {!isStatsModalVisible ? (
              <Pressable onPress={resetGame} style={styles.playAgainButton}>
                <Text style={styles.playAgainText}>HILALAO INDRAY</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => {
                setIsStatsModalVisible(false);
                setGameState("HOME");
              }} style={styles.playAgainButton}>
                <Text style={styles.playAgainText}>HIKATONA</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 20,
  },
  titleContainer: {
    alignItems: "center",
    flex: 1,
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
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: "900",
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
  /* Settings (Fikirana) Styles */
  settingsCard: {
    width: "88%",
    maxWidth: 360,
    backgroundColor: COLORS.surfaceRaised,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  settingsTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: "900",
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  settingSublabel: {
    color: COLORS.mutedText,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 10,
  },
  rulesContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 8,
  },
  ruleText: {
    color: COLORS.mutedText,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  ruleExplanationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  miniIndicator: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  ruleDetailText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  resetButton: {
    flexDirection: "row",
    width: "100%",
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginTop: 24,
  },
  resetButtonText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: "800",
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