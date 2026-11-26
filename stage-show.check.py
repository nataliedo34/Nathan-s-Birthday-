#!/usr/bin/env python3
"""Smoke checks for Birthday Stage interactive show isolation."""
from pathlib import Path

ROOT = Path(__file__).resolve().parent

MESSAGES = [
    "I practiced saying it. Happy birthday, Nathan. I hope your day is quiet in the nice way, and sweet at the edges.",
    "Twenty. You made it look easy. For this year: good meals, good friends, and a soft place to put your worries down.",
    "NATHAN!! Twenty!! I brought the noise!! I hope your year is loud with happy things, and full of snacks you do not have to share!!",
]

PROTECTED = [
    "park.css",
    "park-game.js",
    "cafe-game.css",
    "cafe-game.js",
    "intro.css",
    "intro-cinema.js",
    "arcade-games.js",
    "arcade-games.css",
    "audio.js",
    "audio/config.js",
    "rooms.css",
    "main.js",
]


def main() -> None:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "stage-show.css").read_text(encoding="utf-8")
    js = (ROOT / "stage-show.js").read_text(encoding="utf-8")

    assert 'id="stage-show"' in html, "missing stage-show root"
    assert "stage-show.css" in html and "stage-show.js" in html, "stage assets not linked"
    assert "Start the show" in html
    assert "Happy 20th Birthday, Nathan!" in html
    assert "panel wish" not in html, "old wish cards still present"
    assert "stage-btn-applause" in html and "stage-btn-encore" in html
    assert "Throw flowers" in html

    for msg in MESSAGES:
        assert msg in js, f"missing message: {msg[:32]}..."

    assert "ParkAudio" in js
    assert "pauseLeave" in js
    assert "ensureStageStamp" in js
    assert "clearTimers" in js
    assert "is-concert" in css and "stage-curtain" in css
    assert "stage-cake-set" in css or "stage-cake" in css
    assert "prop-guitar" in html or "stage-prop-guitar" in html
    assert "Troubleshoot" not in css

    for name in PROTECTED:
        text = (ROOT / name).read_text(encoding="utf-8")
        assert "stage-show" not in text, f"stage leaked into {name}"

    print("PASS: stage-show checks OK")


if __name__ == "__main__":
    main()
