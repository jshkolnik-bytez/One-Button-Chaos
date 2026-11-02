"""One Button Chaos: the crew (8 skaters) and their skateboards (6 boards).

Makes, in the output folder:
  crew.png    one row per character, 48x48 frames (no board)
  boards.png  one row per board, the same frames (just the board, in the
              same place and tilt as in each pose)
  crew.json   where every frame is, and the animations
The game draws the board first, then the skater on top of it.

Facing right. The wheels touch row 45 of each frame (ground line = row 46).
Run (from the project folder):  python3 tools/make_crew.py assets/sprites
(Needs Python with Pillow: pip install pillow)
"""
from PIL import Image
import json, math, os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
CELL = 48


def hexc(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    ca, cb = hexc(a), hexc(b)
    return "#%02x%02x%02x" % tuple(round(x + (y - x) * t) for x, y in zip(ca, cb))


def shade(base, amount):
    return mix(base, "#ffffff", amount) if amount >= 0 else mix(base, "#000000", -amount)


# ---------- Colours ----------
# Every letter in the pixel maps below is one colour. Each character swaps
# some of them (hair, skin, clothes...). Letters:
#   K outline   W/P eye white/pupil   B eyebrow (drawn as outline)
#   H/h hair (dark/light)   S/s/e/r/M skin, skin shade, ear, blush, mouth
#   O/l/p/o/c/d hoodie (main, light, pocket, shade, cuff, dark)
#   T/v/t/u/U backpack   J/m/j/k trousers   Z/z/g/i/A sneakers (A = laces)
#   L/C/D/Q/Y cap   1/2/3 accessory (main/light/dark)   4/5 metal or glass

BASE = {
    "K": "#1a1626", "W": "#ffffff", "P": "#1a1626",
    "H": "#3b2417", "h": "#5c3a25",
    "S": "#f1c6a1", "s": "#d79a76", "e": "#c9886a", "r": "#f29a8a", "M": "#9c4a3c",
    "Z": "#f6f6f8", "z": "#c9ccd6", "g": "#8d93a0", "i": "#a7adbb", "A": "#ff5fa2",
    "L": "#5a70a8", "C": "#2f3d66", "D": "#1f2847", "Q": "#161d36", "Y": "#ffd166",
    "w": "#f4f1ea", "k": "#262d40",
}


def hoodie(base):
    return {"l": shade(base, 0.28), "O": base, "p": shade(base, -0.1), "o": shade(base, -0.2),
            "c": shade(base, -0.27), "d": shade(base, -0.45)}


def pants(base):
    return {"m": shade(base, 0.2), "J": base, "j": shade(base, -0.3), "k": shade(base, -0.48)}


def pack(base):
    return {"v": shade(base, 0.4), "T": base, "t": shade(base, -0.27), "u": shade(base, -0.48),
            "U": shade(base, -0.55)}


def skin(base):
    return {"S": base, "s": shade(base, -0.13), "e": shade(base, -0.2), "r": mix(base, "#ff6a6a", 0.35),
            "M": shade(mix(base, "#b03030", 0.5), -0.3)}


def hair(base, light):
    return {"H": base, "h": light}


def accessory(base):
    return {"1": base, "2": shade(base, 0.35), "3": shade(base, -0.35)}


# ---------- Heads (18 x 14) ----------
# Every head shares the same face (rows 6-13, eyes at columns 12-13).
# Each character has its own hair/hat on top, maybe hair hanging at the back,
# and maybe something worn on the face (glasses, headphones, an earring).

FACE = [
    ".....HHhSSSSBBhH..",
    ".....HsSSSSSWPS...",
    ".....HeeSSSSWPSS..",
    ".....HseSSSSSSSSS.",
    "......SSSSSrSSMS..",
    "......sSSSSSSMS...",
    ".......ssSSSSs....",
    "........sSSs......",
]

# The expressions, drawn on the 15-wide face they were designed on. Only the
# pixels that differ from the normal face get copied onto each character.
_FACE15 = {6: "..HHhSSSSBBhH..", 7: "..HsSSSSSWPS...", 8: "..HeeSSSSWPSS..", 9: "..HseSSSSSSSSS.",
           10: "...SSSSSrSSMS..", 11: "...sSSSSSSMS...", 12: "....ssSSSSs...."}


def _edits(rows):
    out = []
    for r, new in rows.items():
        for c, (a, b) in enumerate(zip(_FACE15[r], new)):
            if a != b:
                out.append((r, c, b))
    return out


SMILE = _edits({10: "...SSSSSSSSSS..", 11: "...sSSSSSMMMS..", 12: "....ssSSSSMs..."})
FOCUS = _edits({6: "..HHhSSSSSBBH..", 7: "..HsSSSSSPPS...", 8: "..HeeSSSSSSSS..",
                10: "...SSSSSSSMMS..", 11: "...sSSSSSSSS..."})
HURT = _edits({6: "..HHhSSSSSShH..", 7: "..HsSSSSPSPS...", 8: "..HeeSSSSPSSS..", 9: "..HsSSSSPSPSSS.",
               10: "...SSSSSSSMMS..", 11: "...sSSSSSSMMS.."})


def make_head(top, row6=None, back=None, overlay=None):
    """top = rows 0-5 (hair/hat). row6 = a whole new row 6 (or None).
    back = {row: "string"} drawn over the left columns (hair hanging at the back).
    overlay = [(row, col, letter)] drawn last (glasses, headphones...)."""
    rows = [r.ljust(18, ".")[:18] for r in top] + list(FACE)
    if row6:
        rows[6] = row6.ljust(18, ".")[:18]
    if back:
        for r, s in back.items():
            rows[r] = s + rows[r][len(s):]
    return {"rows": rows, "overlay": overlay or []}


def expression(head, edits):
    rows = [list(r) for r in head["rows"]]
    for r, c, ch in edits:
        rows[r][c + 3] = ch  # edits are written for the 15-wide face: shift 3 columns
    for r, c, ch in head["overlay"]:
        rows[r][c] = ch
    return ["".join(r) for r in rows]


# ---------- Bodies ----------
TORSO = [
    "..dddOOOO...",
    ".dddOOOOOOO.",
    ".ddOOOOOOwOl",
    ".oOOOOOOOwOl",
    ".oOOOOOOOOOl",
    ".oOOOOOOOOOl",
    ".oOOOOOOOOOl",
    ".oOOppppppOl",
    ".oOOpOOOOpOl",
    ".oOOppppppOl",
    ".ddddddddddd",
]
# A bigger, broader body (Tony): one column wider at the back, a jersey number
TORSO_BIG = [
    "..ddddOOOO...",
    ".ddddOOOOOOO.",
    "dddOOOOOOOOOl",
    "doOOOOOO22OOl",
    "doOOOOOOO2OOl",
    "doOOOOOO2OOOl",
    "doOOOOOO222Ol",
    "doOOOOOOOOOOl",
    "doOOOOOOOOOOl",
    "doOOOOOOOOOOl",
    "ddddddddddddd",
]
PACK = [
    "..TTT.",
    ".TvTTT",
    "TvTTTT",
    "TtTTTT",
    "TtuuTT",
    "TtTTTT",
    "TtTTTT",
    ".tttt.",
]
SHOE = [
    ".ZiZi..",
    "ZZZZAZZ",
    "zggggggg",
]
HAND = ["SS", "SSs", ".s"]
FIST = ["SSs", "SSs"]

# ---------- The crew ----------

CREW = [
    {
        "id": "jay",
        "colours": {},  # the original Street Kid
        "head": make_head([
            ".......LLLLLL.....",
            "......LLCCCCCC....",
            ".....CLCCCCCYCC...",
            "....QCCCCCCCCCC...",
            "...QQQDDDDDDhhDH..",
            "....hHHHhSSSHHHHH.",
        ]),
        "pack": True,
    },
    {
        "id": "maya",
        "colours": {**hair("#2b1a12", "#4a2c1c"), **skin("#e0a77f"), **hoodie("#ffc23d"), **pants("#5b7fd1"),
                    **pack("#ff6fae"), **accessory("#7bd389"), "A": "#7bd389"},
        "head": make_head([
            "......hHHHHHh.....",
            ".....hHHHHHHHHh...",
            "....hHHHhHHHHHHH..",
            "....HHHHHHHHHHhHH.",
            "..12HHHHHHHHHHHHH.",
            ".H11HHHHHSSSSHHHH.",
        ], row6="hHHH.HHhSSSSBBhH", back={7: "HHh", 8: "HHH", 9: ".HH", 10: ".Hh", 11: "..h"}),
        "pack": True,
    },
    {
        "id": "rosa",
        "colours": {**hair("#1d1210", "#3b2420"), **skin("#7a4a30"), **hoodie("#ff6fae"), **pants("#e8e2d0"),
                    "4": "#ffd166", "5": "#c9932a", "A": "#ffd166"},
        "head": make_head([
            "....hHhHHhHhH.....",
            "...hHHHhHHHhHHh...",
            "..hHHhHHHHhHHHHh..",
            ".hHHHHHhHHHHhHHHh.",
            ".HHhHHHHHHhHHHHHHh",
            ".HHHHHhHHHSSShHHHH",
        ], row6=".HhHHHHhSSSSBBhHH", back={7: ".HHHH", 8: ".hHHH", 9: "..HH.", 10: "..h.."},
            overlay=[(10, 6, "4"), (11, 6, "4"), (11, 7, "5")]),
        "pack": False,
    },
    {
        "id": "kai",
        "colours": {**hair("#1a1a24", "#3a3a52"), **skin("#f3d2a8"), **hoodie("#e9ecf4"), **pants("#c0392b"),
                    **pack("#2b2b3a"), "A": "#c0392b"},
        "head": make_head([
            "....h...h...h.....",
            "....HH..HH.HH..h..",
            "...HHHHhHHHHHhHH..",
            "..hHHHHHHHHHHHHHh.",
            ".hHHHHHHHHHHHHHHHH",
            "..HHHHHhHHSSSHHHHh",
        ], row6=".hHHHHHhSSSSBBhH", back={7: "..hH"}),
        "pack": True,
        "stripe": "#c0392b",  # a red stripe down the track jacket
    },
    {
        "id": "zeke",
        "colours": {**hair("#e8c15a", "#ffe08a"), **skin("#ffdcc4"), **hoodie("#3b4f8f"), **pants("#5a5f6e"),
                    **pack("#ff8a3d"), **accessory("#7ff0e4"), "A": "#7ff0e4"},
        "head": make_head([
            "......dOOOOOd.....",
            "....dOOOOOOOOd....",
            "...dOlOOOOOOOOO...",
            "..dOlOOOOOOOOOOO..",
            "..dOOOOOHhHHhHOOd.",
            "..dOOOO3hSSSHhHOd.",
        ], row6="..dOO11hSSSSBBhH", back={7: "..dOO", 8: "..dOo", 9: "..ddo"},
            overlay=[(6, 5, "1"), (7, 5, "2"), (7, 6, "1"), (8, 5, "1"), (8, 6, "1"), (9, 5, "3"), (9, 6, "3"),
                     (5, 7, "3"), (4, 8, "3")]),
        "pack": True,
    },
    {
        "id": "gloria",
        "colours": {**hair("#b8b8c8", "#e6e6f0"), **skin("#f0c8a8"), **hoodie("#9b6bcc"), **pants("#3d2a4d"),
                    "4": "#cfe8ff", "5": "#5a4a6a", "A": "#9b6bcc", "Z": "#efe6d8"},
        "head": make_head([
            "..hH...hHHHHh.....",
            ".hHHH.hHHHHHHH....",
            ".HHhH.hHHhHHHHH...",
            ".HHHHhHHHHHHHHHh..",
            "..HHhHHHHHHHHHHHH.",
            "....hHHHHSSSSHHHh.",
        ], overlay=[(6, 12, "5"), (6, 13, "5"), (9, 12, "5"), (9, 13, "5"), (7, 11, "5"), (8, 11, "5"),
                    (7, 14, "5"), (8, 14, "5"), (7, 8, "5"), (7, 9, "5"), (7, 10, "5")]),
        "pack": False,
    },
    {
        "id": "tony",
        "colours": {**hair("#1a1410", "#33261c"), **skin("#8d5a3b"), **hoodie("#2e9e5b"), **pants("#2a2a35"),
                    **accessory("#e63946"), "A": "#e63946", "2": "#f4f1ea"},
        "head": make_head([
            "..................",
            ".......hHHHHh.....",
            ".....hHHHHHHHH....",
            "....hHHHHHHHHHH...",
            "....3333333333333.",
            "....1111111111111.",
        ], row6=".....HHSSSSSBBSS"),
        "pack": False,
        "torso": TORSO_BIG,
    },
    {
        "id": "nova",
        "colours": {**hair("#5b4bff", "#9d8cff"), **skin("#c98e62"), **hoodie("#2d2a7a"), **pants("#e8e2d0"),
                    **pack("#ff5fa2"), **accessory("#ffd166"), "A": "#7ff0e4", "w": "#7ff0e4"},
        "head": make_head([
            "......hHHHHHh.....",
            ".....hHHHHHHHHh...",
            "....hHHHHHHHHHHH..",
            "...hHHHHHHHHHHhHH.",
            "...HHHHHHHHHHHHHH.",
            "..HHHHHHHHSSSSHHH.",
        ], row6="..HHHHHhSSSSBBhH", back={7: "..HHH", 8: "..hHH", 9: "...HH", 10: "...hH", 11: "....H"},
            overlay=[(4, 15, "1"), (5, 14, "1"), (5, 15, "2"), (5, 16, "1"), (6, 15, "1")]),
        "pack": True,
        "sparkles": True,
    },
]

# ---------- Boards ----------
# deck = (light, main, dark), stripe, wheels = (wheel, hub) or None for a hoverboard
BOARDS = [
    {"id": "classic", "deck": ("#b3a2ff", "#7b5cff", "#5541c4"), "stripe": "#ffd166",
     "wheels": ("#fff3d6", "#e0c49a")},
    {"id": "pop", "deck": ("#d4ff7a", "#8fd629", "#5c9a16"), "stripe": "#1a1626",
     "wheels": ("#ffffff", "#c9ccd6")},
    {"id": "cruiser", "deck": ("#ffc08a", "#ff8a3d", "#c9601c"), "stripe": "#fff3d6",
     "wheels": ("#7ff0e4", "#2ec4b6"), "big_wheels": True},
    {"id": "rocket", "deck": ("#ff8a80", "#e0303a", "#9a1a24"), "stripe": "#ffd166",
     "wheels": ("#2a2438", "#4a4458"), "flames": True},
    {"id": "hover", "deck": ("#c9fff8", "#3fd6c8", "#1f8f86"), "stripe": "#ffffff", "wheels": None},
    {"id": "gold", "deck": ("#fff0a8", "#ffcc33", "#c9932a"), "stripe": "#ffffff",
     "wheels": ("#ffffff", "#ffe39a")},
]

BOARD_LETTERS = {"G": "#2a2438", "X": "#c9ccd6", "x": "#8d93a0", "F": "#ffffff"}

PAL = {}


def use_colours(colours):
    global PAL
    PAL = {k: hexc(v) for k, v in {**BASE, **hoodie("#f0603e"), **pants("#4b5874"), **pack("#2ec4b6"),
                                     **skin("#f1c6a1"), **accessory("#e63946"), "4": "#ffd166", "5": "#c9932a",
                                     **BOARD_LETTERS, **colours}.items()}
    # Jay keeps his exact original skin and clothes
    if not colours:
        PAL.update({k: hexc(v) for k, v in {
            "S": "#f1c6a1", "s": "#d79a76", "e": "#c9886a", "r": "#f29a8a", "M": "#9c4a3c",
            "l": "#ff8f6a", "O": "#f0603e", "p": "#d64e33", "o": "#c2432c", "c": "#b03a28", "d": "#8a2c22",
            "v": "#7ff0e4", "T": "#2ec4b6", "t": "#1f8f86", "u": "#17675f", "U": "#126055",
            "m": "#6a789a", "J": "#4b5874", "j": "#333d55", "k": "#262d40"}.items()})


class Layer:
    def __init__(self, inner="K"):
        self.px = {}
        self.inner = inner  # outline colour where this part overlaps another part

    def plot(self, x, y, ch):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < CELL and 0 <= y < CELL:
            self.px[(x, y)] = ch

    def blit(self, rows, ox, oy, remap=None):
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    if remap and ch in remap:
                        ch = remap[ch]
                    self.plot(ox + i, oy + j, ch)

    def limb(self, a, b, ch, w):
        (x0, y0), (x1, y1) = a, b
        steps = max(abs(x1 - x0), abs(y1 - y0), 1)
        lo = -(w // 2)
        for k in range(int(steps) + 1):
            x = x0 + (x1 - x0) * k / steps
            y = y0 + (y1 - y0) * k / steps
            for dx in range(lo, lo + w):
                for dy in range(lo, lo + w):
                    self.plot(math.floor(x + 0.5) + dx, math.floor(y + 0.5) + dy, ch)

    def shaded_limb(self, a, b, base, light, shade_, w):
        """A limb with a lit side and a shadow side, so it looks round.
        Each pixel is coloured by how far it sits from the limb's middle line.
        Light comes from the upper right (in front of him)."""
        (x0, y0), (x1, y1) = a, b
        dx, dy = x1 - x0, y1 - y0
        L2 = dx * dx + dy * dy or 1.0
        n = math.sqrt(L2)
        nx, ny = -dy / n, dx / n
        if nx * 0.6 - ny < 0:
            nx, ny = -nx, -ny
        half = w / 2
        edge = 0.45 if w <= 3 else 0.85
        for py in range(int(min(y0, y1) - w), int(max(y0, y1) + w) + 1):
            for px in range(int(min(x0, x1) - w), int(max(x0, x1) + w) + 1):
                t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / L2))
                ex, ey = px - (x0 + dx * t), py - (y0 + dy * t)
                if ex * ex + ey * ey > (half + 0.05) ** 2:
                    continue
                d = ex * nx + ey * ny
                self.plot(px, py, light if d > edge else shade_ if d < -edge else base)

    def outline_spots(self):
        spots = []
        for (x, y) in list(self.px):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                p = (x + dx, y + dy)
                if p not in self.px and 0 <= p[0] < CELL and 0 <= p[1] < CELL:
                    spots.append(p)
        return set(spots)


def compose(layers):
    """Stacks the layers. Where a part's outline falls on top of another part,
    it uses a dark shade of its own colour instead of black ("selective
    outlines"), which makes the sprite look much less blocky."""
    grid = {}
    for f in layers:
        if f is None:
            continue
        spots = f.outline_spots()
        for p, ch in f.px.items():
            grid[p] = ch
        for p in spots:
            under = grid.get(p)
            grid[p] = f.inner if (under is not None and under != "K") else "K"
    img = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    for (x, y), ch in grid.items():
        img.putpixel((x, y), PAL[ch] + (255,))
    return img


# ---------- The skateboard ----------

def board_layer(style, cx, wy, tilt=0.0, spin=0):
    """A skateboard seen from the side. cx = middle of the deck, wy = the row
    its wheels touch, tilt = slope (+ = nose up), spin = wheel turn (0..3)."""
    PAL.update({"N": hexc(style["deck"][0]), "B": hexc(style["deck"][1]), "b": hexc(style["deck"][2]),
                "R": hexc(style["stripe"])})
    if style["wheels"]:
        PAL.update({"E": hexc(style["wheels"][0]), "f": hexc(style["wheels"][1])})
    f = Layer(inner="G")
    half = 12
    deck = {}
    for i in range(-half, half + 1):
        y = wy - 5 - tilt * i
        if i <= -half + 2:
            y -= (-half + 3 - i) * 0.7
        if i >= half - 2:
            y -= (i - half + 3) * 0.7
        deck[i] = y
    for i, y in deck.items():
        yy = math.floor(y + 0.5)
        f.plot(cx + i, yy - 1, "G")
        f.plot(cx + i, yy, "B" if abs(i) < half else "b")
    # The deck is thicker in the middle (a concave), showing more of its colour
    for i in range(-5, 6):
        f.plot(cx + i, math.floor(deck[i] + 0.5) + 1, "b" if abs(i) == 5 else "B")
    for i in range(-5, 6):
        if i % 4 == 0:
            f.plot(cx + i, math.floor(deck[i] + 0.5), "R")
            f.plot(cx + i + 1, math.floor(deck[i] + 0.5) + 1, "R")
    for i in (-9, -8, 3, 4):
        f.plot(cx + i, math.floor(deck[i] + 0.5), "N")
    if style.get("flames"):
        for i, ch in ((-4, "R"), (-3, "R"), (-2, "N"), (5, "R"), (6, "R"), (7, "N")):
            f.plot(cx + i, math.floor(deck[i] + 0.5), ch)
    for ti in (-7, 7):
        y = math.floor(deck[ti] + 0.5)
        tx = cx + ti
        f.plot(tx - 1, y - 1, "x")  # bolts on the grip tape
        f.plot(tx + 1, y - 1, "x")
        if not style["wheels"]:
            # Hoverboard: glowing pads instead of trucks and wheels
            for dx in (-2, -1, 0, 1, 2):
                f.plot(tx + dx, y + 1, "b")
                f.plot(tx + dx, y + 2, "N" if (dx + spin) % 2 == 0 else "R")
            f.plot(tx, y + 3, "N")
            continue
        f.plot(tx - 1, y + 1, "x")
        f.plot(tx, y + 1, "X")
        f.plot(tx + 1, y + 1, "x")
        f.plot(tx, y + 2, "x")
        big = style.get("big_wheels")
        size = 4 if big else 3
        wx0, wy0 = tx - (2 if big else 1), y + 2 - (1 if big else 0)
        for dx in range(size):
            for dy in range(size):
                if big and (dx, dy) in ((0, 0), (3, 0), (0, 3), (3, 3)):
                    continue
                f.plot(wx0 + dx, wy0 + dy, "E")
        f.plot(wx0 + size // 2, wy0 + size // 2, "f")
        shine = [(0, 0), (size - 1, 0), (size - 1, size - 1), (0, size - 1)][spin % 4]
        if big:
            shine = [(1, 0), (3, 1), (2, 3), (0, 2)][spin % 4]
        f.plot(wx0 + shine[0], wy0 + shine[1], "F")
    return f


# ---------- The skater ----------

def kid(ch, hip, feet, arms, *, face=None, lean=0, head_dy=0, shoes=True, torso_dy=0):
    """hip = (x, y) of the hip joint. feet = [(knee, ankle) back leg, (knee, ankle) front leg].
    arms = [(elbow, hand) back arm, (elbow, hand) front arm]. lean = shoulders ahead of hips."""
    hx, hy = hip
    shoulder_y = hy - 8 + torso_dy
    sh_back = (hx - 3 + lean, shoulder_y)
    sh_front = (hx + 1 + lean, shoulder_y)

    def arm(sh, a, front):
        base, light, shade_ = ("O", "l", "o") if front else ("o", "O", "d")
        f = Layer(inner="c" if front else "d")
        elbow, h = a
        f.shaded_limb(sh, elbow, base, light, shade_, 3)
        f.shaded_limb(elbow, h, base, light, shade_, 3)
        if ch.get("stripe"):
            f.limb(sh, elbow, "c", 1)  # Kai's track-jacket stripe
        f.plot(elbow[0] + (h[0] - elbow[0]) * 0.8, elbow[1] + (h[1] - elbow[1]) * 0.8, "c" if front else "d")
        f.blit(HAND, h[0] - 1, h[1] - 1)
        return f

    def leg(hp, l, front):
        base, light, shade_ = ("J", "m", "j") if front else ("j", "J", "k")
        f = Layer(inner="k")
        knee, ankle = l
        f.shaded_limb(hp, knee, base, light, shade_, 4)
        f.shaded_limb(knee, ankle, base, light, shade_, 3)
        f.blit(["kkk"], ankle[0] - 1, ankle[1])
        if shoes:
            f.blit(SHOE, ankle[0] - 2, ankle[1] + 1)
        return f

    torso_map = ch.get("torso", TORSO)
    back_arm = arm(sh_back, arms[0], False)
    back_leg = leg((hx - 2, hy), feet[0], False)
    pack_l = None
    if ch["pack"]:
        pack_l = Layer(inner="u")
        pack_l.blit(PACK, hx - 10 + lean, hy - 9 + torso_dy)
    body = Layer(inner="d")
    tx, ty = hx - 6 + lean - (len(torso_map[0]) - 12), hy - 10 + torso_dy
    body.blit(torso_map, tx, ty)
    if ch["pack"]:
        for k in range(7):
            body.plot(tx + 3 + (1 if k > 3 else 0), ty + 1 + k, "U")
    if ch.get("stripe"):
        for k in range(9):
            body.plot(tx + 10, ty + 1 + k, "c")
    if ch.get("sparkles"):
        for (sx, sy) in ((5, 3), (8, 6), (3, 8), (9, 2)):
            body.plot(tx + sx, ty + sy, "w")
    body.plot(tx + len(torso_map[0]) - 6, ty + 5, "o")
    body.plot(tx + len(torso_map[0]) - 5, ty + 5, "o")
    head_l = Layer(inner="s")
    rows = expression(ch["head"], face or [])
    head_l.blit(rows, hx - 10 + lean + (1 if lean > 1 else 0) + (lean // 2), hy - 24 + head_dy + torso_dy,
                remap={"B": "K"})
    front_leg = leg((hx + 1, hy), feet[1], True)
    front_arm = arm(sh_front, arms[1], True)
    return compose([back_arm, back_leg, pack_l, body, head_l, front_leg, front_arm])


def duck(ch, i):
    """A deep tuck, as low as possible. Nothing above row 20 (beams hang at row 18)."""
    bob = i
    back_leg = Layer(inner="k")
    back_leg.shaded_limb((18, 33), (24, 30 + bob), "j", "J", "k", 4)
    back_leg.shaded_limb((24, 30 + bob), (18, ANK), "j", "J", "k", 3)
    back_leg.blit(["kkk"], 17, ANK)
    back_leg.blit(SHOE, 15, ANK + 1)
    torso = Layer(inner="d")
    torso.limb((15, 31 + bob), (26, 27 + bob), "O", 7)
    torso.limb((14, 33 + bob), (22, 33 + bob), "o", 3)
    torso.limb((16, 28 + bob), (24, 25 + bob), "l", 1)
    for x in range(17, 25, 3):
        torso.plot(x, 30 + bob, "d")
    if ch.get("sparkles"):
        for (sx, sy) in ((18, 29), (22, 28)):
            torso.plot(sx, sy + bob, "w")
    pack_l = None
    if ch["pack"]:
        pack_l = Layer(inner="u")
        pack_l.blit(["..TTTT..", ".TvTTTTT", "TvTTTTTT", "TtTTuuTT", ".tttttt."], 12, 23 + bob)
    head = Layer(inner="s")
    head.blit(expression(ch["head"], FOCUS), 22, 21 + bob, remap={"B": "K"})
    front_leg = Layer(inner="k")
    front_leg.shaded_limb((21, 33), (29, 31 + bob), "J", "m", "j", 4)
    front_leg.shaded_limb((29, 31 + bob), (30, ANK), "J", "m", "j", 3)
    front_leg.blit(["kkk"], 29, ANK)
    front_leg.blit(SHOE, 28, ANK + 1)
    arm = Layer(inner="c")
    arm.shaded_limb((25, 29 + bob), (31, 33 + bob), "O", "l", "o", 3)
    arm.shaded_limb((31, 33 + bob), (34, 36), "O", "l", "o", 3)
    arm.plot(33, 35, "c")
    arm.blit(FIST, 34, 35)
    return compose([back_leg, torso, pack_l, head, front_leg, arm])


# ---------- Poses ----------
# Board: deck centre x=24; wheels touch row 45; the grip tape is row 39,
# so sneakers' soles sit on row 38.
BX, WY = 24, 45
SOLE = 38
ANK = SOLE - 3

POSES = []  # (name, draw(ch) -> image, board (cx, wy, tilt, spin) or None)


def pose(name, board, **kw):
    POSES.append((name, lambda ch, kw=kw: kid(ch, **kw), board))


for i in range(4):
    bob = [0, 0, 1, 1][i]
    sway = [0, 1, 1, 0][i]
    pose(f"ride_{i}", (BX, WY, 0.0, i), hip=(23, 27 + bob),
         feet=[((19, 32 + bob), (17, ANK)), ((28, 31 + bob), (30, ANK))],
         arms=[((14 - sway, 22 + bob), (11 - sway, 26 + bob)), ((28 + sway, 22 + bob), (31 + sway, 25 + bob))])

push_back = [((19, 31), (17, ANK)), ((18, 33), (14, 39)), ((16, 37), (10, 42)),
             ((14, 37), (5, 42)), ((16, 34), (9, 38)), ((19, 32), (15, ANK + 1))]
for i, back in enumerate(push_back):
    bob = [0, 1, 2, 2, 1, 0][i]
    lean = [0, 1, 2, 2, 1, 0][i]
    arms = ([((17, 22 + bob), (13, 25 + bob)), ((25, 22 + bob), (29, 25 + bob))] if i in (2, 3) else
            [((14, 22 + bob), (11, 26 + bob)), ((28, 22 + bob), (31, 25 + bob))])
    pose(f"push_{i}", (BX, WY, 0.0, i % 4), hip=(23, 27 + bob), feet=[back, ((28, 31 + bob // 2), (30, ANK))],
         arms=arms, lean=lean, face=FOCUS if i in (2, 3) else None)

pose("idle_0", (BX, WY, 0.0, 0), hip=(23, 26), feet=[((20, 31), (17, ANK)), ((27, 31), (30, ANK))],
     arms=[((19, 24), (19, 29)), ((26, 24), (27, 29))], face=SMILE)
pose("idle_1", (BX, WY, 0.0, 0), hip=(23, 27), feet=[((20, 32), (17, ANK)), ((27, 32), (30, ANK))],
     arms=[((19, 25), (18, 30)), ((26, 25), (27, 30))], face=SMILE)
pose("crouch", (BX, WY, 0.0, 0), hip=(23, 31), feet=[((18, 35), (17, ANK)), ((29, 34), (30, ANK))],
     arms=[((15, 27), (13, 31)), ((28, 26), (31, 29))], lean=2, face=FOCUS)
pose("pop", (BX, WY, 0.3, 1), hip=(23, 25), feet=[((19, 30), (16, 36)), ((28, 26), (30, 31))],
     arms=[((15, 17), (12, 13)), ((28, 17), (32, 14))], lean=1, face=FOCUS)
pose("air", (BX, WY - 7, 0.0, 2), hip=(23, 24), feet=[((20, 29), (17, 31)), ((29, 26), (30, 31))],
     arms=[((15, 15), (12, 11)), ((28, 15), (32, 12))], face=SMILE)
pose("grab", (BX, WY - 7, -0.08, 3), hip=(23, 24), feet=[((18, 28), (16, 31)), ((30, 26), (31, 31))],
     arms=[((15, 14), (11, 11)), ((29, 30), (33, 34))], face=SMILE)
pose("fall", (BX, WY - 3, -0.05, 0), hip=(23, 25), feet=[((19, 30), (17, 34)), ((28, 29), (30, 34))],
     arms=[((14, 19), (10, 18)), ((29, 19), (34, 18))])
pose("land", (BX, WY, 0.0, 1), hip=(23, 31), feet=[((18, 35), (17, ANK)), ((29, 34), (30, ANK))],
     arms=[((14, 26), (10, 27)), ((29, 26), (33, 27))], lean=2, face=SMILE)
for i in range(2):
    POSES.append((f"duck_{i}", lambda ch, i=i: duck(ch, i), (BX, WY, 0.0, i * 2)))
for i in range(2):
    pose(f"dash_{i}", (BX, WY, 0.0, i * 2), hip=(22, 30), feet=[((17, 33), (16, ANK)), ((28, 32), (30, ANK))],
         arms=[((14, 26), (8, 27 + i)), ((18, 26), (11, 28 - i))], lean=4, head_dy=2, face=FOCUS)
pose("brake", (BX, WY, 0.22, 0), hip=(21, 28), feet=[((18, 33), (15, 37)), ((27, 30), (29, 33))],
     arms=[((14, 21), (10, 18)), ((26, 21), (31, 19))], lean=-2, face=FOCUS)
pose("hurt", None, hip=(23, 25), feet=[((27, 28), (31, 30)), ((26, 31), (29, 36))],
     arms=[((28, 18), (33, 13)), ((15, 16), (11, 11))], face=HURT)
POSES.append(("board", lambda ch: Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0)), (24, 30, 0.0, 0)))

ANIMATIONS = {
    "ride": {"frames": [f"ride_{i}" for i in range(4)], "fps": 10, "loop": True},
    "push": {"frames": [f"push_{i}" for i in range(6)], "fps": 14, "loop": False},
    "idle": {"frames": ["idle_0", "idle_1"], "fps": 2, "loop": True},
    "crouch": {"frames": ["crouch"], "fps": 1, "loop": False},
    "pop": {"frames": ["pop"], "fps": 1, "loop": False},
    "air": {"frames": ["air"], "fps": 1, "loop": False},
    "grab": {"frames": ["grab"], "fps": 1, "loop": False},
    "fall": {"frames": ["fall"], "fps": 1, "loop": False},
    "land": {"frames": ["land"], "fps": 1, "loop": False},
    "duck": {"frames": ["duck_0", "duck_1"], "fps": 6, "loop": True},
    "dash": {"frames": ["dash_0", "dash_1"], "fps": 16, "loop": True},
    "brake": {"frames": ["brake"], "fps": 1, "loop": False},
    "hurt": {"frames": ["hurt"], "fps": 1, "loop": False},
    "board": {"frames": ["board"], "fps": 1, "loop": False},
}

# ---------- Draw everything ----------
names = [p[0] for p in POSES]
crew_sheet = Image.new("RGBA", (CELL * len(POSES), CELL * len(CREW)), (0, 0, 0, 0))
for row, ch in enumerate(CREW):
    use_colours(ch["colours"])
    for col, (name, draw, _) in enumerate(POSES):
        crew_sheet.paste(draw(ch), (col * CELL, row * CELL))

board_sheet = Image.new("RGBA", (CELL * len(POSES), CELL * len(BOARDS)), (0, 0, 0, 0))
use_colours({})
for row, style in enumerate(BOARDS):
    for col, (name, _, b) in enumerate(POSES):
        if b:
            board_sheet.paste(compose([board_layer(style, *b)]), (col * CELL, row * CELL))

os.makedirs(OUT, exist_ok=True)
crew_sheet.save(os.path.join(OUT, "crew.png"))
board_sheet.save(os.path.join(OUT, "boards.png"))
meta = {
    "frameWidth": CELL, "frameHeight": CELL,
    "crew": [c["id"] for c in CREW], "boards": [b["id"] for b in BOARDS],
    "frames": {n: {"x": i * CELL, "w": CELL, "h": CELL} for i, n in enumerate(names)},
    "animations": ANIMATIONS,
    "notes": "crew.png: one row per character (no board). boards.png: one row per board, same columns. "
             "Draw the board frame first, then the character frame on top. Wheels touch row 45 (ground line 46).",
}
with open(os.path.join(OUT, "crew.json"), "w") as fh:
    json.dump(meta, fh, indent=2)
print("ok", len(CREW), "characters,", len(BOARDS), "boards,", len(POSES), "frames each")
