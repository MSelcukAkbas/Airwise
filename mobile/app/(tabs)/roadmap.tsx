import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { getDaysSinceStart } from '@/utils/algorithm';
import { Phase, UserProfile } from '@/utils/types';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

// Duolingo-style path constants
const NODE_SIZE = 70;
const ZIGZAG_WIDTH = width * 0.4;

interface RoadmapNode {
  id: number;
  type: 'milestone' | 'checkpoint' | 'boss';
  label: string;
  phase: Phase;
}

import AIRWISE_CONFIG from '@/../airwise.config.json';

function generateRoadmap(profile: UserProfile, t: any): RoadmapNode[] {
  if (!profile) return [];
  
  const diff = AIRWISE_CONFIG.difficulties.find(d => d.key === profile.difficultyLevel) || AIRWISE_CONFIG.difficulties[1];
  const totalDays = diff.weeks ? diff.weeks * 7 : (diff.days || 30);
  
  const nodes: RoadmapNode[] = [];
  
  // Rule: Always start with Control Phase for 7 days
  nodes.push({ id: 1, type: 'milestone', label: t('roadmap.labels.start'), phase: 'control' });
  nodes.push({ id: 4, type: 'checkpoint', label: t('roadmap.labels.control_pass'), phase: 'control' });
  nodes.push({ id: 7, type: 'boss', label: t('roadmap.labels.phase_boss'), phase: 'control' });
  
  // Distribution for remaining days
  const restDays = totalDays - 7;
  const reductionEnd = Math.floor(restDays * 0.7); // 70% of rest is reduction
  const delayEnd = Math.floor(restDays * 0.9);    // 20% is delay
  // last 10% is freedom
  
  for (let i = 8; i <= totalDays; i++) {
    const rel = i - 7;
    let phase: Phase = 'reduction';
    if (rel > reductionEnd) phase = 'delay';
    if (rel > delayEnd) phase = 'freedom';
    
    // Logic: Node every 3 days in "Slow/Normal", every 2 days in "Hard", every day in "Veteran"
    const step = profile.difficultyLevel === 'veteran' ? 1 : (profile.difficultyLevel === 'easy' ? 4 : 3);
    
    if (i % step === 0 || i === totalDays || i === 7 + Math.floor(reductionEnd/2)) {
      let type: any = 'milestone';
      let label = t('roadmap.labels.milestone', { day: i });
      
      if (i === 7 + Math.floor(reductionEnd/2)) {
        type = 'checkpoint';
        label = t('roadmap.labels.halfway');
      } else if (i === 7 + reductionEnd) {
        type = 'boss';
        label = t('roadmap.labels.phase_boss');
      } else if (i === 7 + delayEnd) {
        type = 'checkpoint';
        label = t('roadmap.labels.almost_free');
      } else if (i === totalDays) {
        type = 'boss';
        label = t('roadmap.labels.smoke_free');
      }
      
      nodes.push({ id: i, type, label, phase });
    }
  }
  
  return nodes;
}

export default function RoadmapScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const dayCount = profile ? getDaysSinceStart(profile) + 1 : 1;
  const streak = profile?.targetStreak ?? 0;

  const [pathOffset, setPathOffset] = React.useState(0);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const opacityAnim = React.useRef(new Animated.Value(0.6)).current;

  React.useEffect(() => {
    let animId: any;
    const animate = () => {
      setPathOffset(prev => (prev - 1) % 18);
      animId = requestAnimationFrame(animate);
    };
    animate();

    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.5, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
          Animated.timing(opacityAnim, { toValue: 0.6, duration: 1500, useNativeDriver: true })
        ])
      ])
    ).start();

    return () => cancelAnimationFrame(animId);
  }, []);

  const ROADMAP_DATA = React.useMemo(() => profile ? generateRoadmap(profile, t) : [], [profile, t]);

  const points = ROADMAP_DATA.map((node, index) => {
    const pattern = [0, 0.5, 0.8, 0.5, 0, -0.5, -0.8, -0.5];
    const x = width / 2 + pattern[index % pattern.length] * ZIGZAG_WIDTH;
    const y = 80 + index * 130;
    return { x, y };
  });

  const renderNode = (node: RoadmapNode, index: number) => {
    // Current progress logic
    const isCompleted = node.id < dayCount;
    const isCurrent = node.id === dayCount;
    const isLocked = node.id > dayCount;

    let iconName: any = 'checkmark-circle';
    if (node.type === 'checkpoint') iconName = 'star';
    if (node.type === 'boss') iconName = 'trophy';
    if (isLocked) iconName = 'lock-closed';

    const phaseColor = node.phase === 'control' ? Colors.phaseControl :
                       node.phase === 'reduction' ? Colors.phaseReduction :
                       node.phase === 'delay' ? Colors.phaseDelay : Colors.phaseFreedom;

    const isLast = index === ROADMAP_DATA.length - 1;

    const nodeCenterX = points[index].x;
    const nodeCenterY = points[index].y;

    // Use absolute positioning to perfectly synchronize SVG path and circles!
    return (
      <View 
        key={node.id} 
        style={[
          styles.nodeContainer, 
          { 
            position: 'absolute', 
            top: nodeCenterY - (NODE_SIZE / 2),
            left: nodeCenterX - 70, // Container width is 140, so half is 70
            zIndex: isLast ? 20 : 2
          }
        ]}
      >
        <TouchableOpacity
          style={[
            styles.node,
            { backgroundColor: isLocked ? Colors.border : phaseColor },
            isCurrent && styles.currentNode,
            isLast && !isLocked && styles.lastNode,
          ]}
          disabled={isLocked}
        >
          <Ionicons 
            name={isLast && !isLocked ? 'crown' : iconName} 
            size={isLast ? 36 : (node.type === 'boss' ? 32 : 28)} 
            color={isLocked ? Colors.textTertiary : '#fff'} 
          />
          {isCurrent && (
            <View style={[styles.nodePulse, { borderColor: phaseColor }]} />
          )}
          {isLast && !isLocked && (
            <Animated.View style={[styles.crownGlow, { transform: [{ scale: pulseAnim }], opacity: opacityAnim }]} />
          )}
        </TouchableOpacity>
        <Text style={[styles.nodeLabel, isLocked && { color: Colors.textTertiary }]}>
          {node.label}
        </Text>
      </View>
    );
  };

  const generatePath = () => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const midY = (p0.y + p1.y) / 2;
        d += ` C ${p0.x} ${midY}, ${p1.x} ${midY}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const totalHeight = points.length > 0 ? points[points.length - 1].y + 150 : '100%';

  // Calculate dynamic Focus Fog start position
  let currentY = 0;
  const currentIndex = ROADMAP_DATA.findIndex(n => n.id >= dayCount);
  if (currentIndex !== -1) {
    currentY = points[currentIndex]?.y || 0;
  } else if (points.length > 0) {
    currentY = points[points.length - 1].y;
  }
  const fogStartY = currentY + 200;

  return (
    <View style={[styles.container, { paddingTop: insets.top + (Platform.OS === 'web' ? 20 : 0) }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.dayBadge}>
            <Text style={styles.dayText}>{t('roadmap.day', { day: dayCount })}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.streakBadge}>
            <Text style={[styles.streakText, streak > 0 && { color: Colors.warning }]}>{streak}</Text>
            <Ionicons name={streak > 0 ? "flame" : "flame-outline"} size={22} color={streak > 0 ? Colors.warning : Colors.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 150 }
        ]}
      >
        <View style={[styles.pathWrapper, { height: totalHeight }]}>
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
                <Path
                    d={generatePath()}
                    stroke={Colors.border}
                    strokeWidth={6}
                    fill="none"
                    strokeDasharray="10, 8"
                    strokeDashoffset={pathOffset}
                />
                <Path
                    d={generatePath()}
                    stroke={Colors.accent}
                    strokeWidth={6}
                    fill="none"
                    strokeDasharray="10, 8"
                    strokeDashoffset={pathOffset}
                    opacity={0.3}
                />
            </Svg>
          </View>
          {ROADMAP_DATA.filter((_, i) => i !== ROADMAP_DATA.length - 1).map((node, index) => renderNode(node, index))}
          
          {/* Dynamic Focus Fog Overlay */}
          <LinearGradient
            colors={['transparent', Colors.background, Colors.background]}
            locations={[0, 0.15, 1]}
            style={{
              position: 'absolute',
              top: fogStartY,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
            pointerEvents="none"
          />

          {/* Render Last Node ABOVE the Fog */}
          {ROADMAP_DATA.length > 0 && renderNode(ROADMAP_DATA[ROADMAP_DATA.length - 1], ROADMAP_DATA.length - 1)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    zIndex: 10,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayBadge: {
    backgroundColor: Colors.elevated,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: Colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  streakText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: Colors.textSub,
  },
  scrollContent: {
    paddingTop: 40,
    alignItems: 'center',
  },
  pathWrapper: {
    width: '100%',
    position: 'relative',
  },
  svgLine: {
    position: 'absolute',
    width: 4,
    height: '100%',
    backgroundColor: Colors.border,
    borderRadius: 2,
    zIndex: -1,
  },
  nodeContainer: {
    alignItems: 'center',
    width: 140,
    zIndex: 2,
  },
  node: {
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  currentNode: {
    transform: [{ scale: 1.1 }],
    borderWidth: 4,
    borderColor: '#fff',
  },
  nodePulse: {
    position: 'absolute',
    width: NODE_SIZE + 16,
    height: NODE_SIZE + 16,
    borderRadius: (NODE_SIZE + 16) / 2,
    borderWidth: 2,
    opacity: 0.5,
  },
  lastNode: {
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowRadius: 15,
  },
  crownGlow: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: Colors.accent,
    opacity: 0.2,
  },
  nodeLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
});
