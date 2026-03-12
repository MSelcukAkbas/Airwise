import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

export default function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix = '',
  suffix = '',
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => { onChange(Math.max(min, value - step)); Haptics.selectionAsync(); }}
        disabled={value <= min}
      >
        <Ionicons name="remove" size={18} color={value <= min ? Colors.textTertiary : Colors.text} />
      </TouchableOpacity>
      <Text style={styles.stepValue}>{prefix}{value}{suffix}</Text>
      <TouchableOpacity
        style={styles.stepBtn}
        onPress={() => { onChange(Math.min(max, value + step)); Haptics.selectionAsync(); }}
        disabled={value >= max}
      >
        <Ionicons name="add" size={18} color={value >= max ? Colors.textTertiary : Colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.text,
    minWidth: 72,
    textAlign: 'center',
  },
});
