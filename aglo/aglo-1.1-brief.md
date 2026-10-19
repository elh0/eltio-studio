# Aglo 1.1 build brief

Agreed with Elliot on 19 Oct 2026; he said "build it". This replaces any answers from the Mac's own question round. Free keeps 3 apps and there are no analytics.

## Release
- 1.0 (6) stays unreleased. Hard launch on 1.1, released manually the first Tuesday after Apple approves it.
- No founding tester free year for Aglo: remove the founding tester and claim cards. George gets a Plus code at launch.
- No tester round. Elliot and George run through 1.1 on TestFlight themselves. Don't submit to Apple until Elliot says.

## Free and Plus
- Free: sky home, widgets, 3 apps, Gentle and Firm, breaths and press-ups, this week's time-back card.
- Plus: unlimited apps, Locked schedules, Hard mode, all tasks, full stats history, extra skies.
- Prices: £2.99 a month, £19.99 a year with a 7-day free trial on yearly only, £34.99 lifetime.
- The paywall shows after a good unlock, never during onboarding.

## Build list
1. StoreKit subscriptions, the paywall and restore purchases.
2. Switch weather from Open-Meteo to WeatherKit (Open-Meteo is non-commercial only).
3. Onboarding order: the live sky for your city, then pick 3 apps, then Screen Time permission, then try one unlock.
4. Real Screen Time numbers on the device (DeviceActivityReport) replace the 12-minute guess. Keep "Data Not Collected".
5. A weekly time-back card that shares as a story image: sky, minutes back, apps resisted, a-glo.com.
6. Apple's rating prompt after the third time someone walks away from a blocked app, never tied to any reward.
7. Hard mode: opt-in and Plus only. Turning Aglo off needs a 24-hour cool-down or a task.
8. Replace the 4 placeholder quotes with the 30 below.
9. Make press-up and squat counting ready to test on a real person.
10. Round location coordinates to 2 decimal places.
11. Update the privacy page and App Privacy answers to match (WeatherKit, purchases).
12. Opening screen: sky background with a small sun rising behind the still Aglo wordmark, short and subtle, like the Aglo cover on the studio test site.

Use release Xcode, iPhone only. Test on Elliot's phone, then upload to TestFlight.

## Quotes (30)

Original:
1. The sky did all this without checking once.
2. Look up. It's changing right now.
3. Nothing in that app is as new as this light.
4. The sun's been setting for an hour. Did you see it?
5. Every evening is the first one of its kind.
6. Your thumb can rest. The day isn't going anywhere.
7. Some things only show up when you're looking.
8. Slow is a speed too.
9. The light moves whether you watch or not.
10. Put it down. The clouds are doing something.
11. You were going to check something. Check the sky.
12. There's good light left today.
13. Quiet isn't empty.
14. A walk is a feed with better colours.
15. Live in the afterglow.

Philosophers and poets:
16. Nature does not hurry, yet everything is accomplished. (Lao Tzu)
17. Knowing others is intelligence; knowing yourself is true wisdom. (Lao Tzu)
18. Very little is needed to make a happy life. (Marcus Aurelius)
19. The soul becomes dyed with the colour of its thoughts. (Marcus Aurelius)
20. Waste no more time arguing what a good man should be. Be one. (Marcus Aurelius)
21. It is not that we have a short time to live, but that we waste a lot of it. (Seneca)
22. While we are postponing, life speeds by. (Seneca)
23. We suffer more often in imagination than in reality. (Seneca)
24. I went to the woods because I wished to live deliberately. (Thoreau)
25. Our life is frittered away by detail. Simplify, simplify. (Thoreau)
26. Heaven is under our feet as well as over our heads. (Thoreau)
27. Adopt the pace of nature: her secret is patience. (Emerson)
28. To the illumined mind the whole world burns and sparkles with light. (Emerson)
29. An old pond. A frog jumps in. The sound of water. (Bashō)
30. Every day is a journey, and the journey itself is home. (Bashō)

## Opening screen notes (item 12)
Exact timings, CSS and SwiftUI port notes are in `aglo/wordmark-motion/` next to this file (README.md, cv.css, markup-aglo.html). Aglo: its sky gradient as the background, sun top 112% -> 58% over 55% of the loop, hold, down at 94%. For a ~2 s splash use the `cv-quick` timing (3.6 s loop) and fade to the app at ~2.1 s. Port the keyframes to SwiftUI rather than embedding a web view. Respect Reduce Motion.
