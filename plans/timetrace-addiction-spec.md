# TimeTrace — Addictive Loop & Assist System Spec

## Core Principle
TimeTrace is not about levels. It is about **staying on a single challenge and chasing perfection**.

The goal is:
> Visible imperfection + instant retry + emotional feedback

---

## Perfect Chase Loop

Each attempt must:
- Show EXACTLY what was wrong
- Make the fix feel achievable
- Allow retry in <1 second

Loop:
Draw → Miss slightly → See mistake → Retry → Improve → Repeat

---

## Lock-In Mechanics

### Perfect Lock State
Triggered when score >= ~85

Effects:
- Background subtly darkens
- Guide line glows stronger
- Micro text: “You’re close”

Goal:
Player feels locked into THIS level.

---

## Result Overlay (No Screen Transitions)

Display directly on canvas:
- Score (animated)
- Timing delta (e.g. +0.07s)
- Shape comparison overlay
- Highlighted mistake segment

Buttons:
- RETRY (primary, glowing)
- NEXT (secondary, dim)

---

## Error Visualization System

Must show:
- Worst segment of shape deviation (highlighted)
- Timing difference clearly

Player reaction:
> “I can fix that”

---

## Assist System (MVP)

### Principle
Assist should feel invisible.

Player feels:
> “I’m getting better”

---

### 1. Path Guidance

If near target path:
- Slight attraction toward guide

Parameters:
- Threshold: ~12–18px
- Strength: ~0.15–0.25

No snapping. No obvious pull.

---

### 2. Stroke Smoothing

Apply light smoothing:
- Reduce jitter
- Improve curvature

---

### 3. Shape Closure Assist

If start/end within ~20px:
- Auto-close path

---

### 4. Visual Feedback for Assist

When on-track:
- Slight glow increase
- Subtle particles

---

### 5. Dynamic Reduction

After multiple attempts:
- Slightly reduce assist

Player feels improvement.

---

## Feedback / Juice System

### While Drawing
- Glow intensifies when accurate
- Dims slightly when off

### Perfect
- Micro screen freeze
- Neon burst along path
- Line snaps cleanly

### Near Miss
- Subtle shake
- Flicker

### Miss
- Soft fade/distortion

---

## Timer Feedback

- Pulses as target time approaches
- Color shifts (cool → warm)
- Builds tension

---

## UI Philosophy

- No menus between attempts
- No friction
- Canvas is the focus
- Retry loop is dominant

---

## What NOT to do

- No real multiplayer (MVP)
- No heavy progression systems
- No complex menus
- No slow transitions

---

## Success Condition

Player behavior:
- Plays same level repeatedly
- Sees improvement
- Chases perfect
- Loses track of time
