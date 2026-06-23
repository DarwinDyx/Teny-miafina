import React, { memo, useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text } from "react-native";
import { COLORS } from "../constants/theme.js";
import { getStatusColor } from "../utils/gameHelpers.js";

export const AnimatedKey = memo(function AnimatedKey({
  label,
  onPress,
  disabled,
  status,
  variant = "letter",
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const isAction = variant !== "letter";

  const handlePress = useCallback(() => {
    if (disabled) return;

    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.88,
        duration: 40,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 4,
        tension: 250,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  }, [disabled, onPress, scale]);

  return (
    <Pressable
      disabled={disabled}
      onPress={handlePress}
      style={styles.keyPressable}
    >
      <Animated.View
        style={[
          styles.key,
          isAction && styles.actionKey,
          variant === "confirm" && styles.confirmKey,
          status && { backgroundColor: getStatusColor(status), borderColor: "transparent" },
          disabled && styles.disabledKey,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.keyText, isAction && styles.actionKeyText]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  keyPressable: {
    flex: 1,
  },
  key: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.key,
    borderColor: COLORS.keyBorder,
    borderWidth: 1,
    borderRadius: 6,
  },
  actionKey: {
    backgroundColor: COLORS.surfaceRaised,
    height: 46,
  },
  confirmKey: {
    backgroundColor: COLORS.green,
    borderColor: "#6DAA67",
  },
  keyText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "800",
  },
  actionKeyText: {
    fontSize: 11,
    fontWeight: "900",
  },
  disabledKey: {
    opacity: 0.25,
  },
});
