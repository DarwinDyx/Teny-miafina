import React, { memo } from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/theme.js";
import { getStatusColor } from "../utils/gameHelpers.js";

export const GameCell = memo(function GameCell({
  letter,
  status,
  isSelected,
  isTouchable,
  flipValue,
  popValue,
  onPress,
}) {
  const rotateX = flipValue.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ["-90deg", "0deg", "90deg"],
  });

  return (
    <Pressable
      disabled={!isTouchable}
      onPress={onPress}
      style={styles.cellPressable}
    >
      <Animated.View
        style={[
          styles.cell,
          {
            backgroundColor: getStatusColor(status),
            borderColor:
              status === "empty" ? COLORS.border : getStatusColor(status),
            transform: [{ perspective: 800 }, { rotateX }, { scale: popValue }],
          },
          isSelected && styles.selectedCell,
        ]}
      >
        <Text style={styles.cellText}>{letter}</Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cellPressable: {
    flex: 1,
    aspectRatio: 1,
  },
  cell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  selectedCell: {
    borderColor: COLORS.selected,
    borderWidth: 2,
  },
  cellText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: "800",
  },
});
