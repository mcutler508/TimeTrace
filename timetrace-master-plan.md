# TimeTrace — Master MVP Plan for Claude Code

## Product Summary

**TimeTrace** is a mobile-first precision arcade game where the player must accurately draw target shapes while stopping a timer at an exact target time.

The game is built around one core feeling:

> “I was so close. I can do better.”

This is not a traditional level-based game. It is a fast retry skill game built around precision, timing, visual feedback, and mastery.

---

## Core Concept

Players are given a micro-challenge:

> Draw this shape and stop at this exact time.

Example:

- Draw a circle and stop at **3.00 seconds**
- Draw a triangle and stop at **4.50 seconds**
- Draw a star and stop at **5.25 seconds**

After each attempt, the game scores the player based on:

1. **Shape accuracy**
2. **Timing accuracy**

The closer they are to perfect, the higher the score.

---

## Core Gameplay Loop

1. Player sees the current challenge.
2. Player taps **Start**.
3. Player draws the target shape on the canvas.
4. Player stops the timer.
5. Game calculates score.
6. Game shows result screen.
7. Player immediately retries or moves to the next challenge.

The loop must be extremely fast.

The player should be able to retry in under one second.

---

## Primary Design Philosophy

TimeTrace should feel like:

- Instant to understand
- Hard to perfect
- Fast to retry
- Skill-based
- Slightly frustrating in an addictive way
- Visually satisfying when close or perfect

Do not overbuild.

The MVP succeeds if players repeatedly say:

> “One more try.”

---

## MVP Scope

### Must Have

- Mobile-first responsive layout
- Touch and mouse drawing support
- Canvas drawing engine
- Timer system
- Start / Stop flow
- Shape comparison scoring
- Timing scoring
- Final score calculation
- Result screen
- Retry button
- Next challenge button
- First-time tutorial challenge
- Local best score tracking
- Local previous attempt ghost
- Basic visual polish and animations

### Should Have

- Streak tracking
- Best attempt ghost
- Shape unlock progression
- Simple challenge progression
- Haptic-like visual feedback
- Particle burst on high score or perfect result

### Do Not Include in MVP

- Real-time multiplayer
- User accounts
- Backend
- Leaderboards
- Ads
- In-app purchases
- Complex level map
- Heavy onboarding
- Story mode
- Complex asset pipeline

---

## Recommended Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- HTML Canvas
- localStorage
- Vercel deployment

Use a simple frontend-only architecture for the MVP.

No backend is required.

---

## UX Flow

### App Launch

The player should not land on a complex menu.

On first launch, the player enters the tutorial challenge immediately.

On later launches, the player lands directly on the current challenge screen.

The experience should feel ready to play instantly.

---

## Tutorial Flow

The tutorial is the first playable challenge.

It should not feel like a separate tutorial mode.

### Tutorial Challenge

- Shape: Circle
- Target time: 3.00 seconds
- Guide shape: clearly visible
- Scoring: forgiving
- Timing penalty: slightly reduced
- Optional subtle magnetism toward the target path

### Tutorial UX

Show minimal instructional text only:

- “Trace the shape”
- “Stop at 3.00s”

Avoid:

- Long text
- Multiple tutorial screens
- Blocking instructions
- Forced step-by-step popups

### Tutorial Result

Bias the first result slightly positive.

Do not give the player a perfect score automatically, but make the first result feel encouraging.

Suggested result copy:

- “Nice start”
- “Close”
- “Try again”

After 2–3 attempts, tutorial hints should disappear naturally and the game should transition into normal gameplay.

---

## Main Challenge Screen

The challenge screen should be simple and focused.

### Top Area

- Target shape name
- Target time
- Timer display

In harder future states, the timer can be hidden, but for MVP it should be visible except in optional advanced challenges.

### Center Area

- Main canvas
- Faint target shape guide
- Player stroke appears as a bright glowing line

### Bottom Area

- Large Start button before run
- Large Stop button during run

Keep all tap targets large and thumb-friendly.

Prevent page scrolling while drawing.

---

## Run State

During the run, keep the UI extremely focused.

Only show:

- Target shape / guide
- Target time
- Timer
- Canvas drawing area
- Stop control

Avoid distractions.

The player should be thinking only about two things:

1. Draw accurately
2. Stop at the exact time

---

## Stop Behavior

For the MVP, support an explicit **Stop** button.

Also allow the game logic to support future experimentation with finger-lift stopping.

Recommended MVP behavior:

- Player taps Start
- Player draws
- Player taps Stop when they believe the target time has been reached

This makes the timing mechanic obvious and controllable.

---

## Result Screen

The result screen is the retention engine.

It must instantly answer:

- How close was I?
- Was the shape or timing worse?
- Can I fix it right now?

### Required Elements

- Large final score
- Grade label
- Shape score
- Timing score
- Time delta, such as `+0.08s` or `-0.12s`
- Overlay of target shape vs player drawing
- Previous attempt ghost if available
- Retry button
- Next button

### Button Priority

Retry should be the dominant action.

Next should be secondary.

Suggested layout:

```txt
[ RETRY ]   [ NEXT ]
```

No forced waiting.

No blocking animations.

No menu detours.

---

## Scoring System

### Timing Score

Calculate absolute difference between actual stop time and target time.

Suggested formula:

```ts
const timingScore = Math.max(0, 100 - Math.abs(actualTime - targetTime) * 40);
```

Examples:

- Exact hit: 100
- 0.10 seconds off: 96
- 0.50 seconds off: 80
- 1.00 second off: 60

Tune this after playtesting.

---

## Shape Score

Shape scoring should compare the player's drawn path against the target path.

### Basic Algorithm

1. Capture player stroke points.
2. Generate target shape path points.
3. Normalize both paths into comparable bounding boxes.
4. Resample both paths to the same number of points.
5. Calculate average distance between corresponding points.
6. Convert the error into a 0–100 score.
7. Apply penalties for incomplete or messy shapes.

### Penalties

Penalize:

- Very short paths
- Incomplete paths
- Poor closure on closed shapes
- Excessive jaggedness
- Major bounding box mismatch
- Drawing far outside the target area

### MVP Shapes

Include these in the MVP:

1. Circle
2. Square
3. Triangle
4. Star
5. Spiral

Start with simple target path generation functions for each shape.

---

## Final Score

Suggested formula:

```ts
const finalScore = Math.round(shapeScore * 0.7 + timingScore * 0.3);
```

Shape accuracy matters slightly more than timing, but timing still meaningfully affects the final result.

This can be tuned after playtesting.

---

## Grades

Use clear, emotionally readable grades.

Suggested grading:

- 98–100: Perfect
- 90–97: Elite
- 75–89: Great
- 50–74: Close
- Below 50: Miss

Grades should feel rewarding without being too noisy.

---

## Ghost System

Do not build real multiplayer in the MVP.

Instead, build a local ghost system.

### MVP Ghosts

Store locally:

- Previous attempt path
- Best attempt path
- Previous score
- Best score

### Display

On the result screen and optionally during retry:

- Show previous attempt as a faint line
- Show best attempt as an even subtler reference

This supports the core feeling:

> “I can beat my last attempt.”

Use localStorage for MVP persistence.

---

## Multiplayer Decision

Real-time multiplayer is intentionally excluded from MVP.

Reason:

- It adds networking complexity
- It creates latency fairness issues
- It slows down the instant retry loop
- It distracts from validating the core mechanic

Future multiplayer should be asynchronous only after the core loop is proven.

Possible future additions:

- Daily challenge leaderboard
- Friend challenge link
- Shared ghost run
- Async score battles

---

## Progression Philosophy

TimeTrace should not feel like a traditional level-selection game.

The player should not be forced into a map or grid.

The experience should feel like:

> Play immediately → retry instantly → improve → continue

Progression should be mostly invisible and automatic.

### MVP Progression

Use a simple ordered challenge list.

Example:

1. Circle — 3.00s
2. Circle — 2.50s
3. Square — 3.50s
4. Triangle — 4.00s
5. Star — 5.00s
6. Spiral — 6.00s

The player can tap Next after a result to move forward.

Avoid building a large level selection UI in the MVP.

---

## Difficulty Scaling

Difficulty can increase through:

- More complex shapes
- Shorter or more awkward target times
- Fainter guide lines
- Stricter scoring
- Hidden timer in future advanced challenges
- Moving or rotating targets in future versions

For MVP, keep the difficulty simple.

Focus on feel, scoring, and replay.

---

## Visual Direction

### Style Name

**Neon Precision Arcade**

### Visual Goals

The game should feel modern, mobile-native, and competitive with popular casual/hybrid-casual mobile games.

It should be:

- Clean
- Fast
- Bright
- High-contrast
- Satisfying
- Slightly premium
- Easy to understand instantly

---

## Visual System

### Gameplay Layer

- Clean vector-style shapes
- Faint glowing target outline
- Bright glowing player stroke
- Smooth canvas lines
- Subtle background gradient
- Minimal distractions

### UI Layer

- Rounded soft 3D-style buttons
- Large text
- Clear hierarchy
- Slight shadows
- Squishy button press animations

### Feedback Layer

High feedback density is critical.

Add juice through:

- Stroke glow
- Score pop animation
- Button bounce
- Small screen pulse on near-perfect
- Particle burst on Perfect
- Subtle shake on major miss
- Time freeze feel on exact timing hit

Do not overdo effects during drawing.

The canvas must remain readable.

---

## Color Direction

Use a dark or deep gradient background with bright precision-focused accents.

Suggested palette:

- Background: deep navy / purple gradient
- Primary line: electric cyan
- Target guide: faint white / blue glow
- Perfect feedback: gold / white glow
- Error feedback: red/orange accent
- UI cards: dark translucent surfaces
- Text: white / near-white

The player stroke should always be highly visible.

---

## Motion Direction

Animations should be fast and responsive.

Guidelines:

- UI transitions under 300ms
- Retry should feel instant
- Result animations should not block input
- Perfect animation can be celebratory but still short

The game should never feel slow.

---

## Mobile UX Requirements

- Portrait-first design
- One-thumb friendly controls
- Large Start / Stop / Retry buttons
- Prevent accidental scroll
- Prevent browser zoom while drawing
- Canvas should resize cleanly on mobile screens
- Works on iOS Safari and Android Chrome
- Also playable with mouse on desktop for testing

---

## Suggested File Structure

```txt
src/
  App.tsx
  main.tsx
  styles.css
  components/
    ChallengeScreen.tsx
    DrawingCanvas.tsx
    ResultScreen.tsx
    TutorialHint.tsx
    ScoreBadge.tsx
  game/
    challenges.ts
    scoring.ts
    shapes.ts
    pathUtils.ts
    storage.ts
    types.ts
```

---

## Data Models

### Challenge

```ts
export type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'spiral';

export interface Challenge {
  id: string;
  shape: ShapeType;
  targetTime: number;
  guideOpacity: number;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard';
}
```

### Point

```ts
export interface Point {
  x: number;
  y: number;
  t?: number;
}
```

### AttemptResult

```ts
export interface AttemptResult {
  challengeId: string;
  shapeScore: number;
  timingScore: number;
  finalScore: number;
  targetTime: number;
  actualTime: number;
  timeDelta: number;
  playerPath: Point[];
  targetPath: Point[];
  grade: 'Perfect' | 'Elite' | 'Great' | 'Close' | 'Miss';
}
```

---

## Local Storage

Store:

```ts
interface SavedGameState {
  hasCompletedTutorial: boolean;
  currentChallengeIndex: number;
  bestScoresByChallenge: Record<string, AttemptResult>;
  previousAttemptByChallenge: Record<string, AttemptResult>;
  currentStreak: number;
}
```

---

## Implementation Steps for Claude Code

### Step 1 — Project Setup

Create a React + Vite + TypeScript + Tailwind project.

Set up the basic app shell and mobile-first layout.

---

### Step 2 — Canvas Drawing

Implement `DrawingCanvas` with:

- Touch input
- Mouse input
- Smooth line rendering
- Point capture
- Clear/reset support
- Target guide rendering

---

### Step 3 — Timer and Run State

Implement game states:

- ready
- running
- result

Timer starts on Start.

Timer stops on Stop.

Actual elapsed time is captured in seconds.

---

### Step 4 — Shape Generation

Implement target path generators for:

- Circle
- Square
- Triangle
- Star
- Spiral

Each generator should return normalized points that can be scaled into the canvas area.

---

### Step 5 — Scoring

Implement:

- Path normalization
- Path resampling
- Average distance calculation
- Closure penalty
- Jaggedness penalty
- Timing score
- Final score
- Grade assignment

---

### Step 6 — Result Screen

Build a result screen with:

- Final score
- Grade
- Shape score
- Timing score
- Time delta
- Target/player overlay
- Previous ghost overlay
- Retry
- Next

---

### Step 7 — Tutorial

Implement first-run tutorial behavior:

- Circle at 3.00s
- Hints: “Trace the shape” and “Stop at 3.00s”
- Forgiving scoring
- Tutorial completion stored in localStorage

---

### Step 8 — Local Persistence

Save:

- Best score by challenge
- Previous attempt by challenge
- Current challenge index
- Tutorial completion
- Streak

---

### Step 9 — Visual Polish

Add:

- Neon line styling
- Glow effects
- Soft 3D buttons
- Score pop animation
- Perfect particle burst
- Subtle miss shake
- Fast retry behavior

---

## Acceptance Criteria

The MVP is successful when:

- The player understands the game in under 5 seconds
- First-time tutorial is playable without explanation
- Drawing feels smooth on mobile
- Timer feels responsive
- Scoring feels fair enough to retry
- Result screen clearly shows what happened
- Retry is immediate
- Previous attempt ghost appears correctly
- Best score persists after refresh
- Game works on mobile browser

---

## Important Product Notes

- Do not add heavy menus.
- Do not build a complex level map.
- Do not add real multiplayer.
- Do not add backend services.
- Do not over-invest in progression before the core loop feels good.
- Prioritize feel over feature count.
- The result screen and retry loop are more important than the home screen.

---

## Core Hook

**TimeTrace**

> Skill meets timing. Trace the shape. Stop on the dot.

Alternative marketing copy:

> You think you’re precise? Prove it.

---

## Claude Code Build Prompt

Use this prompt after adding this file to the repo:

```md
You are Claude Code acting as a senior frontend game engineer and product-minded mobile game prototyper.

Read `timetrace-master-plan.md` completely before coding.

Build the TimeTrace MVP exactly according to the plan.

Prioritize:
1. Smooth mobile drawing
2. Accurate timer behavior
3. Fair scoring
4. Fast retry loop
5. Clean neon precision arcade visual style
6. First-run tutorial
7. Local ghost and best-score persistence

Do not add backend, auth, real multiplayer, ads, payments, or complex menus.

Use React, Vite, TypeScript, Tailwind CSS, HTML Canvas, and localStorage.

Work in small implementation steps.

After implementation, provide:
- What files were created or changed
- How to run locally
- Any scoring assumptions made
- Any follow-up improvements recommended after playtesting
```
