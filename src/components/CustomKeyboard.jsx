import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import { KEYBOARD_ROWS } from "../constants/theme.js";
import { AnimatedKey } from "./AnimatedKey.jsx";

export const CustomKeyboard = memo(function CustomKeyboard({
  onLetterPress,
  onBackspace,
  onConfirm,
  keyboardColors,
  disabled,
  canConfirm,
}) {
  return (
    <View style={styles.keyboard}>
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <View key={`keyboard-row-${rowIndex}`} style={styles.keyboardRow}>
          {rowIndex === 2 && <View style={styles.keyboardSpacer} />}
          
          {row.map((letter) => {
            const status = keyboardColors[letter];
            const isAbsent = status === "absent";

            return (
              <AnimatedKey
                key={letter}
                label={letter}
                onPress={() => onLetterPress(letter)}
                disabled={disabled || isAbsent}
                status={status}
              />
            );
          })}

          {rowIndex === 2 && <View style={styles.keyboardSpacer} />}
        </View>
      ))}

      <View style={styles.keyboardActions}>
        <AnimatedKey
          label="SUPPRIMER"
          onPress={onBackspace}
          disabled={disabled}
          variant="backspace"
        />
        <AnimatedKey
          label="CONFIRMER"
          onPress={onConfirm}
          disabled={disabled || !canConfirm}
          variant="confirm"
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  keyboard: {
    width: "100%",
    gap: 8,
  },
  keyboardRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  keyboardSpacer: {
    flex: 3,
  },
  keyboardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
});
