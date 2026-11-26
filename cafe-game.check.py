#!/usr/bin/env python3
"""Static checks for Birthday Café restaurant simulation."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
js = (ROOT / "cafe-game.js").read_text(encoding="utf-8")
css = (ROOT / "cafe-game.css").read_text(encoding="utf-8")
html = (ROOT / "index.html").read_text(encoding="utf-8")
errors = []

def ok(cond, msg):
    if not cond:
        errors.append(msg)

# Isolation / progress
ok('CAFE_KEY = "nates-birthday-cafe-v1"' in js, "café v1 storage missing")
ok('CAFE_SIM_KEY = "nates-birthday-cafe-sim-v1"' in js, "sim storage key missing")
ok("passport" not in js.lower() or "nates-birthday-cafe" in js, "unexpected coupling")

# Recipes preserved
for rid in ("pudding", "onigiri", "cake"):
    ok(f'id: "{rid}"' in js or f'"{rid}":' in js, f"recipe {rid} missing")
ok("renderPuddingStep" in js and "renderOnigiriStep" in js and "renderCakeStep" in js, "cooking renderers missing")
ok("Place strawberries" in js or "berries" in js, "cake berries step missing")

# Restaurant systems
for token in (
    "seatCustomer", "takeOrder", "startCookingForOrder", "deliverToTable",
    "animateEating", "finishMeal", "cleanTable", "trySpawn", "cafeFull",
    "renderTickets", "returnToFloor", "clearAllTimers", "orderLine"
):
    ok(token in js, f"missing {token}")

# Lifecycles
ok("arriving" in js and "waitingFood" in js and "needsCleaning" in js, "lifecycle states missing")
ok("pending" in js and "preparing" in js and "ready" in js, "order states missing")
ok("rewarded" in js, "duplicate reward guard missing")

# HTML floor pieces
for token in (
    'id="cafe-floor"', 'id="cafe-dining"', 'id="cafe-ticket-rail"',
    'id="cafe-serving-tray"', 'id="cafe-dish-bin"', 'id="cafe-kitchen"',
    'id="cafe-actors"', 'id="cafe-playfield"', 'id="cafe-restart"'
):
    ok(token in html, f"HTML missing {token}")

# HUD
ok('id="cafe-tips"' in html and 'id="cafe-streak"' in html, "tips/streak HUD missing")
ok("Cozy" in html, "cozy mode badge missing")

# Park section markers still present (unchanged attractions exist)
ok('id="play"' in html and 'id="garden"' in html and 'id="ending"' in html, "other rooms missing from index")
ok('data-room="snacks"' in html, "café room hook missing")

# Cache
ok("cafe-game.js?v=9" in html and "cafe-game.css?v=9" in html, "cache bump missing")

# Balance
ok(js.count("{") == js.count("}"), "JS brace mismatch")
ok(css.count("{") == css.count("}"), "CSS brace mismatch")

# Confirm park scripts not café-only breakage
ok("audio.js" in html and "main.js" in html, "core scripts missing")

if errors:
    print("FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print("PASS: café restaurant static checks OK")
print(f"  cafe-game.js={len(js)} cafe-game.css={len(css)}")
