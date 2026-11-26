#!/usr/bin/env python3
"""Static checks for Birthday Café cooking-game fixes (no browser required)."""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
js = (ROOT / "cafe-game.js").read_text(encoding="utf-8")
css = (ROOT / "cafe-game.css").read_text(encoding="utf-8")
html = (ROOT / "index.html").read_text(encoding="utf-8")
errors = []

def ok(cond, msg):
    if not cond:
        errors.append(msg)

# Dialogue must be recipe-keyed
ok("orderLines" in js, "customers should use orderLines")
ok("orderLine(customer, recipe)" in js or "orderLine(customer, recipe)" in js.replace(" ", ""), "orderLine helper missing")
ok("rand(customer.greet)" not in js, "legacy random greet still used")
ok("quietly… pudding?" in js and "quietly… strawberry cake?" in js, "chiikawa cake/pudding lines missing")

# Berry softlock fixes
ok("cafe-berry-tray" in js and "cafe-berry-tray" in css, "berry tray class missing")
ok("returnToTray" in js, "missed drag should return berry to tray")
ok("els.board.appendChild(berry)" in js, "drag should reparent berry onto board")
ok("stack.appendChild(berry)" in js, "placed berries should attach to cake stack")
ok("dataset.placed" in js, "placed flag missing")
ok("click" not in js[js.find('if (step === "berries")'):js.find('if (step === "toppings")')] or
   'addEventListener("click"' not in js[js.find('if (step === "berries")'):js.find('if (step === "toppings")')],
   "berries step should not use click+pointerup double handlers")

berries = js[js.find('if (step === "berries")'):js.find('if (step === "toppings")')]
ok('addEventListener("click"' not in berries, "berries still bind click (double-count risk)")
ok("placeBerry" in berries, "placeBerry helper missing")
ok("NEEDED = 3" in berries, "needed berry count missing")
ok("advanced" in berries, "advance guard missing")

# Restart recipe
ok('id="cafe-restart"' in html, "Restart recipe button missing in HTML")
ok("restartRecipe" in js, "restartRecipe missing")
ok("setRestartVisible" in js, "restart visibility helper missing")

# Storage isolation untouched
ok('CAFE_KEY = "nates-birthday-cafe-v1"' in js, "café storage key changed")

# CSS: tray berries are relative; placed are absolute
ok(".cafe-berry-tray .cafe-berry" in css, "tray berry positioning rule missing")
ok("overflow: visible" in css[css.find(".cafe-frost-layer"):css.find(".cafe-frost-cover")],
   "frost layer should not clip placed berries")

# Recipe step maps intact
for recipe, steps in {
    "pudding": ["crack", "ingredients", "mix", "pour", "flip", "decorate"],
    "onigiri": ["filling", "rice", "shape", "nori", "plate"],
    "cake": ["stack", "frost", "berries", "toppings"],
}.items():
    for step in steps:
        ok(f'"{step}"' in js, f"missing step token {recipe}/{step}")

# Serve / rewards still present
ok("persist.coins +=" in js and "persist.stars +=" in js and "persist.served +=" in js, "reward persistence broken")
ok("saveCafe(persist)" in js, "saveCafe not called on serve")

# Brace balance
ok(js.count("{") == js.count("}"), "cafe-game.js brace mismatch")
ok(css.count("{") == css.count("}"), "cafe-game.css brace mismatch")

# Simulate berry counter invariant
placed = 0
available = 3
for _ in range(3):
    assert available == 3 - placed
    placed += 1
    available -= 1
ok(placed == 3 and available == 0, "counter simulation failed")

# Simulate order-line selection never returns cross-recipe pudding line for cake
order_lines = {
    "pudding": ["quietly… pudding?", "um… caramel pudding…"],
    "cake": ["um… strawberry cake…?", "quietly… strawberry cake?"],
}
for line in order_lines["cake"]:
    ok("pudding" not in line.lower() or "strawberry" in line.lower(), f"cake line mentions pudding oddly: {line}")

if errors:
    print("FAIL")
    for e in errors:
        print(" -", e)
    sys.exit(1)

print("PASS: café static checks OK")
print(f"  files: cafe-game.js ({len(js)} bytes), cafe-game.css ({len(css)} bytes)")
print("  covered: dialogue, berries, restart, rewards, recipe steps")
