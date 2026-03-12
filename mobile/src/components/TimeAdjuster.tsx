import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

export default function TimeAdjuster({
  label,
  value,
  setter,
}: {
  label: string;
  value: string;
  setter: (v: string) => void;
}) {
  const adjust = (part: 'h' | 'm', delta: number) => {
    const [h, m] = value.split(':').map(Number);
    let newH = h;
    let newM = m;
    if (part === 'h') newH = (h + delta + 24) % 24;
    else newM = (m + delta + 60) % 60;
    setter(`${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
    Haptics.selectionAsync();
  };
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjust('h', 1)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={16} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeVal}>{value.split(':')[0]}</Text>
          <TouchableOpacity onPress={() => adjust('h', -1)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>
        <Text style={styles.timeSep}>:</Text>
        <View style={styles.timeUnit}>
          <TouchableOpacity onPress={() => adjust('m', 5)} style={styles.timeBtn}>
            <Ionicons name="chevron-up" size={16} color={Colors.accent} />
          </TouchableOpacity>
          <Text style={styles.timeVal}>{value.split(':')[1]}</Text>
          <TouchableOpacity onPress={() => adjust('m', -5)} style={styles.timeBtn}>
            <Ionicons name="chevron-down" size={16} color={Colors.accent} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  timeBlock: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.textSub,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeUnit: { alignItems: 'center' },
  timeBtn: { padding: 4 },
  timeVal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 26,
    color: Colors.text,
    width: 40,
    textAlign: 'center',
  },
  timeSep: { fontFamily: 'Inter_700Bold', fontSize: 26, color: Colors.textSub, marginBottom: 2 },
});
