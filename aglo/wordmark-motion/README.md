# Wordmark motion (app splash screens)

The five wordmark animations picked for the eltio.studio covers on 19 Oct 2026, packaged so each app and its
website can open on the same one. CSS and SVG only, no video, no JS.

Elliot's rule: the locked wordmark, unchanged, one soft thing moving. No italic, no stroke tracing, no gradient on
type (Aglo's gradient is the background only).

- Out & Scout: the orange sun rises slowly inside the name and stays, fades, rises again. Ink background, paper text, Geist.
- Grip: the fingertip on the i presses the crimp and lets go, on loop. Black background, mat blue mark.
- Lampwerk: the wordmark flickers on, holds, goes off, again. Console ink background, text #EDEDEA. (No icon on the splash.)
- Aglo: its sky gradient as the background, a small warm sun rising behind the still wordmark.
- Systems: one word "Systems" that softly breaks into "Sy ste ms" and closes again. Paper background, ink.

## Files
- cv.css: all five, scoped to .cv.cv-os / .cv-gr / .cv-lw / .cv-ag / .cv-sy. Includes a prefers-reduced-motion stop.
- markup-<app>.html: the markup to drop inside a positioned box (position: relative + a size). The .cv fills it and
  centres the word; sizes come from the box width (container query units) times --cvs. --cvs 1 is the portfolio tile
  size; a phone splash uses about 1.7 (Out & Scout 2.3), set on the box: `<div style="position:relative;inset:0;--cvs:1.7">`.
- demo.html: all five in phone-sized boxes.

## Timing
Loops: Out & Scout 12 s, Grip 6 s, Lampwerk 10 s, Aglo 14 s, Systems 12 s. For a splash that lasts about two seconds,
add class `cv-quick` to the .cv (Out & Scout 4 s, Grip 3 s, Lampwerk 4 s, Aglo 3.6 s, Systems 4 s) and fade to the
app at ~2.1 s; that is what the studio site does when a project opens (studio-site/land.js, .cg-sp).

## Native apps (SwiftUI)
Port the keyframes rather than embedding web views: the percentages in each @keyframes block are the timeline.
Out & Scout: sun offset .9em -> 0 over 45% with ease-in-out, hold, fade out at 86-95%. Grip: tip translateY 0 -> 44
SVG units at 60-72%, hold to 80%, back by 92%. Lampwerk: opacity 0/.5/.08/.85/.3/1 at 0/2/3.5/5.5/7/9%, hold to 78%,
off by 86%. Aglo: sun top 112% -> 58% over 55%, hold, down at 94%. Systems: the three groups start apart (dx +439 /
+74 / -439 SVG units), close over 22-48%, hold to 78%, open again by 100%.

Source of truth: /mnt/project-files/eltio/studio-site/cv.css and cover() in alt_build.py (the wordmark SVGs come from
live/lw/lampwerk-wordmark-ink.svg, live/ag/aglo-wordmark.svg, live/sy/systems-wordmark.svg and the Grip brand page).
