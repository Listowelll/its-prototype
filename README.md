# React Effect Tutor

React Effect Tutor is a small Intelligent Tutoring System prototype for teaching `useEffect` side effects to University of Delaware Computer Science students.

## Prototype Goal

The prototype focuses on one learning objective: students should be able to manage component side effects by correctly applying `useEffect`, dependency arrays, and cleanup functions.

## What The Prototype Demonstrates

- A domain model with three common `useEffect` misconceptions:
  - infinite loops caused by state updates inside effects
  - stale data caused by missing dependencies
  - missing cleanup for timers
- A student model that tracks skill estimates for syntax, dependency logic, and cleanup.
- Misconception flags that activate after specific wrong answers.
- Scaffolded tutor feedback that starts with a hint and then gives direct corrective feedback.
- An Effect Timeline that visualizes render, effect execution, state updates, re-rendering, and cleanup.

## Why It Is Implementable

This version does not try to build a full IDE or compiler. It uses three controlled React scenarios with multiple-choice fixes. That keeps the system simple while still showing the important ITS behavior: misconception diagnosis, learner modeling, targeted feedback, and visual explanation.

## Presentation Talking Points

1. The curriculum gap is React lifecycle and side-effect reasoning.
2. The prototype teaches `useEffect` in depth instead of reviewing all of React.
3. Each scenario maps a student answer to a misconception.
4. The student model changes after each attempt.
5. The Effect Timeline makes invisible runtime behavior visible.
6. The prototype is intentionally small so it can be completed and tested.

## Running Locally

```bash
npm install
npm run dev
```

Then open the local URL shown in the terminal.
