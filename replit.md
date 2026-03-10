# SmokePace

A behavioral modification mobile app for controlled smoking reduction, built with Expo React Native.

## Architecture

- **Frontend**: Expo Router (file-based routing), React Native, TypeScript
- **State Management**: React Context (AppContext) with AsyncStorage persistence
- **Backend**: Express.js on port 5000 (minimal - serves landing page and API)
- **Navigation**: 4-tab layout (Home, Log, Tasks, Profile) + onboarding + craving modal

## App Features

- **Onboarding**: 3-step profile setup (name, schedule, difficulty)
- **Permission Timer**: Real-time countdown to next allowed cigarette window
- **Dual Streak System**: Control streak (window compliance) + Target streak (limit compliance)
- **Craving Emergency**: Full-screen 90-second 4-7-8 breathing barrier with haptics
- **Smoke Log**: Today's sessions with type classification and trigger tagging
- **Daily Tasks**: Phase-aware micro-challenges that earn XP and Freeze tokens
- **Profile & Stats**: Phase progression, savings calculator, freeze token management

## Phase System

1. **Control** (Days 1–7): No reduction, establish rhythm
2. **Reduction** (Weeks 2–8): Daily limit decreases by difficulty rate per week
3. **Delay**: Intervals extend as limit drops
4. **Freedom**: Limit ≤ 3 cigarettes/day

## File Structure

```
app/
  _layout.tsx          # Root layout with AppProvider
  onboarding.tsx       # 3-step onboarding flow
  craving.tsx          # Full-screen emergency protocol
  (tabs)/
    _layout.tsx        # Tab navigation (NativeTabs/Classic)
    index.tsx          # Home - permission timer dashboard
    log.tsx            # Today's smoke log
    tasks.tsx          # Daily challenges + XP
    profile.tsx        # Stats, savings, settings
contexts/
  AppContext.tsx        # Main state + AsyncStorage persistence
utils/
  types.ts             # Shared TypeScript types
  algorithm.ts         # Permission timing, phase calculation
  taskCatalog.ts       # Task definitions and selection
constants/
  colors.ts            # Dark theme color system
```

## Key Design Decisions

- Dark theme throughout (health/wellness aesthetic)
- No backend database — all persistence via AsyncStorage
- Streaks are stored and updated per-day in user profile
- Tasks are randomly assigned each day from phase-appropriate catalog
- Craving screen uses Reanimated + Haptics for breathing exercise
