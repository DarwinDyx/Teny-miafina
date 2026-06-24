import React from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SCREEN_WIDTH } from "../constants/theme.js";

export default function MainMenu({ onSelectDifficulty, onOpenStats }) {
  return (
    <View style={styles.menuContainer}>
      {/* Title & Icon Header */}
      <View style={styles.header}>
        <Ionicons name="book-outline" size={64} color={COLORS.green} style={styles.icon} />
        <Text style={styles.title}>Teny Miafina</Text>
        <Text style={styles.subtitle}>MALAGASY WORDLE</Text>
      </View>

      {/* Difficulty Selector Label */}
      <View style={styles.difficultySection}>
        <Text style={styles.sectionTitle}>Safidio ny fahasosorana</Text>
        <Text style={styles.sectionSubtitle}>(Choisissez la difficulté)</Text>

        {/* Buttons List */}
        <Pressable
          style={({ pressed }) => [styles.diffButton, pressed && styles.diffButtonPressed]}
          onPress={() => onSelectDifficulty("facile")}
        >
          <Ionicons name="leaf-outline" size={24} color={COLORS.green} />
          <View style={styles.diffTextContainer}>
            <Text style={styles.diffTitle}>Tsotra</Text>
            <Text style={styles.diffDescription}>Teny misy litera 4</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.mutedText} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.diffButton, pressed && styles.diffButtonPressed]}
          onPress={() => onSelectDifficulty("moyen")}
        >
          <Ionicons name="speedometer-outline" size={24} color={COLORS.yellow} />
          <View style={styles.diffTextContainer}>
            <Text style={styles.diffTitle}>Antatany</Text>
            <Text style={styles.diffDescription}>Teny misy litera 5 na 6</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.mutedText} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.diffButton, pressed && styles.diffButtonPressed]}
          onPress={() => onSelectDifficulty("difficile")}
        >
          <Ionicons name="flame-outline" size={24} color={COLORS.danger} />
          <View style={styles.diffTextContainer}>
            <Text style={styles.diffTitle}>Sarotra</Text>
            <Text style={styles.diffDescription}>Teny misy litera 7 na mihoatra</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.mutedText} />
        </Pressable>
      </View>

      {/* Secondary Action Buttons */}
      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.statsButton, pressed && styles.statsButtonPressed]}
          onPress={onOpenStats}
        >
          <Ionicons name="stats-chart-outline" size={20} color={COLORS.text} style={{ marginRight: 8 }} />
          <Text style={styles.statsButtonText}>Hijery Statistika</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginTop: 20,
  },
  icon: {
    marginBottom: 16,
  },
  title: {
    color: COLORS.text,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.mutedText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
    marginTop: 4,
    textTransform: "uppercase",
  },
  difficultySection: {
    width: "100%",
    maxWidth: 400,
    gap: 12,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    color: COLORS.mutedText,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  diffButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    width: "100%",
    justifyContent: "space-between",
  },
  diffButtonPressed: {
    backgroundColor: COLORS.surfaceRaised,
    borderColor: COLORS.selected,
  },
  diffTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  diffTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
  },
  diffDescription: {
    color: COLORS.mutedText,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  statsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 24,
  },
  statsButtonPressed: {
    backgroundColor: COLORS.surface,
  },
  statsButtonText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
});
