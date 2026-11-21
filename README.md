# The Quiet Courier

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/c/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/Dansam97/stealth-game/rank.svg)](https://make.fun/c/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/Dansam97/stealth-game/reward.svg)](https://make.fun/c/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**The Quiet Courier** — an original top-down stealth game that plays offline in a desktop browser from its own static files. You are a courier slipping through the Night Archive after dark: lift the files in each of three wings, then reach the green exit door unseen. Wardens patrol fixed routes with raycast vision cones that walls and crates block; being seen fills a detection meter instead of failing you instantly, so a near miss is a scare you can recover from by breaking line of sight. Sneak with Shift, hide in the shadow rugs where detection grows half as fast, and click to throw a pebble that draws a nearby warden off to investigate. Caught wardens chase, search your last seen spot, then drift back to patrol. Every tile, cone and sound is drawn and synthesized by the game's own code — no image or audio files, no network.

## Run it

```sh
python3 -m http.server 8080 --directory game
# then open http://localhost:8080 — or serve game/ from any static server
```

WASD / arrows move · Shift sneak · Click throws a pebble to distract · R restart level · M mute

---

<sub>Entered on [make.fun](https://make.fun/?ref=p62m1pd8&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
