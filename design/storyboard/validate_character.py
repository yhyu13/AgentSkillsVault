#!/usr/bin/env python
"""
validate_character.py
Validate a Storyboard "Character Definition" JSON (the bring-your-own format)
before shipping it. Checks the schema the engine's defineCharacter() reads,
whitelists shapes/attributes, and flags anything unsafe (script/handlers/
external url(...) refs, quotes in colors) that the engine would strip or that
would render wrong. The safety scan skips the never-rendered meta fields
(author, license, version, description, credits, source, $schema, _*).

Schema (what storyboard-engine.js defineCharacter / _renderParts read):
  name      string (required unless bundled as SB_CHARACTERS[key] / data-char-src)
  viewBox   [w, h]
  origin    [x, y]         body pivot; the engine uses y (x is always viewBox w/2)
  shadow    [cx, cy, rx, ry]
  arms      {L:[x,y], R:[x,y]}   shoulder pivots for rig armL/armR (gestures)
  params    {name: "#color" | "$token"}   per-character tokens; parts reference them
            as "$name". The engine reads el.dataset[name], so hairColor is overridden
            by data-hair-color="..." on the element (a key like "hair-color" still
            works in parts but can't be overridden - warned)
  face      {eyes:{L:[x,y],R:[x,y],rx,ry,pupil,outline,outlineW},
             mouth:{x,y,w}, brows:{y,default,w,color}, cheeks:{L:[x,y],R:[x,y]},
             render:bool}
  parts     [{shape: rect|circle|ellipse|line|path|polygon|g, rig?, ...}]
            rect x,y,w,h,r | circle cx,cy,r | ellipse cx,cy,rx,ry |
            line x1,y1,x2,y2 | path d | polygon points | g parts
            common: fill, stroke, sw, opacity, lc (round|square), lj (round)
  defs      [{type: linearGradient|radialGradient, id, units, x1,y1,x2,y2 |
             cx,cy,r,fx,fy, transform:[a,b,c,d,e,f], spread, stops:[{offset,color,opacity}]}]
            gradients referenced from fills as "url(#id) <fallback color>"
            (the fallback is what shows if the engine does not render defs).

Rig checks: the engine drives the FIRST part of each rig class (open/mouthOpen
share one, smile/mouth another) - duplicates are warned. It sets rx/ry on the
open mouth and rewrites the smile's path d, so rig open/mouthOpen must be an
ellipse and rig smile/mouth a path (warned otherwise: that part could only
show/hide). A backslash in a color is an ERROR (a CSS escape such as
u\\rl(https://...) would hide an external reference).

Usage:
  python validate_character.py my-character.json
  python validate_character.py examples/characters/        # all *.json in a dir
  python validate_character.py my-character.json --strict  # warnings fail too

Output levels: ERROR (exit 1), warn (exit 1 only with --strict) and note
(informational, never fails - e.g. "defs are not rendered by this engine").
"""
import json
import math
import re
import sys
from pathlib import Path

SHAPES = {"rect", "circle", "ellipse", "line", "path", "polygon", "g"}
# numeric attributes the engine reads, per shape
SHAPE_ATTRS = {
    "rect": {"x", "y", "w", "h", "r"},
    "circle": {"cx", "cy", "r"},
    "ellipse": {"cx", "cy", "rx", "ry"},
    "line": {"x1", "y1", "x2", "y2"},
    "path": set(),
    "polygon": set(),
    "g": set(),
}
REQUIRED = {"rect": ("w", "h"), "circle": ("r",), "ellipse": ("rx", "ry"),
            "path": ("d",), "polygon": ("points",)}
NUM_ATTRS = {"x", "y", "w", "h", "r", "rx", "ry", "cx", "cy",
             "x1", "y1", "x2", "y2", "sw", "opacity"}
COMMON = {"shape", "rig", "fill", "stroke", "sw", "opacity", "lc", "lj"}
# engine _SBC_RIG: rig key -> the class the engine looks the part up by (it drives the
# FIRST element with that class, in parts order)
RIG_CLASS = {"armL": "sbc-armL", "armR": "sbc-armR", "eyeL": "sbc-eyeL", "eyeR": "sbc-eyeR",
             "pupilL": "sbc-pupil", "pupilR": "sbc-pupil", "pupil": "sbc-pupil",
             "smile": "sbc-smile", "mouth": "sbc-smile", "open": "sbc-open",
             "mouthOpen": "sbc-open", "brL": "sbc-brL", "brR": "sbc-brR",
             "cheekL": "sbc-cheekL", "cheekR": "sbc-cheekR", "body": "sbc-body"}
RIG = set(RIG_CLASS)
# the shape the engine needs for the part it drives: it animates the open mouth with
# setAttribute('rx'/'ry') and changes expressions with setAttribute('d')
RIG_SHAPE = {"sbc-open": ("ellipse", "animates the open mouth by setting rx/ry"),
             "sbc-smile": ("path", "draws expressions by rewriting the path 'd'")}
# engine _charTokens() built-ins ("$name" in fill/stroke)
BASE_TOKENS = {"color", "skin", "hair", "accent", "accent2", "accent3", "gold",
               "clothing", "pants", "ink", "white"}
TOP_KEYS = {"name", "viewBox", "origin", "shadow", "arms", "params", "face", "parts", "defs"}
META_KEYS = {"author", "license", "version", "description", "credits", "source", "$schema"}
FACE_KEYS = {"eyes", "mouth", "brows", "cheeks", "render"}
PATH_RE = re.compile(r"^[\sMLHVCSQTAZmlhvcsqtaz0-9eE,.\- ]+$")
PATH_MAX = 4000            # engine _sbPathOK drops longer paths
COLOR_MAX = 64             # engine _sbColorOK
COLOR_BAD = re.compile(r"""[<>"']""")
URL_RE = re.compile(r"url\(\s*([^)]*?)\s*\)", re.I)
LOCAL_URL = re.compile(r"^#([A-Za-z_][\w\-.:]*)$")
ID_RE = re.compile(r"^[A-Za-z_][\w\-]*$")
# characters an HTML attribute name can't hold
ATTR_BAD = re.compile(r"[\s\"'>/=\x00-\x1f\x7f]")
# element data-* attributes the engine reads itself: a params key with one of these
# names is also changed by that attribute
ENGINE_DATASET = {"anim", "char", "charSrc", "charSvg", "mood", "acts", "talk", "look", "face",
                  "viewbox", "t", "tRel", "dur", "ease", "loop", "then", "exit", "exitAt",
                  "exitT", "hold", "accessory", "stagger", "sbc"}
RAW_BAD = ("<script", "javascript:", "<foreignobject", "xlink:href", "<iframe")
RAW_HANDLER = re.compile(r"\bon[a-z]{3,}\s*=", re.I)
# the scan runs on json.dumps() text, where a quote inside a value reads \" - so
# url(\"#id\") is a local ref (the color check reports its quotes), not an external one
RAW_EXT_URL = re.compile(r"url\(\s*(?:\\?['\"])?\s*(?![#'\"\s\\])[^)\s]", re.I)


_ENGINE = Path(__file__).resolve().parent / "storyboard-engine.js"
_ENGINE_DEFS = None


def engine_renders_defs():
    """True when the storyboard-engine.js next to this script renders a character
    definition's `defs` (gradients). Engine 0.8 does not: url(#id) fills show their
    fallback color."""
    global _ENGINE_DEFS
    if _ENGINE_DEFS is None:
        try:
            src = _ENGINE.read_text(encoding="utf-8", errors="replace")
            _ENGINE_DEFS = bool(re.search(r"\bdef\.defs\b|\bS\.defs\b", src))
        except Exception:
            _ENGINE_DEFS = False
    return _ENGINE_DEFS


class Report:
    """errs fail the check; warns fail it only with --strict; notes are
    informational (never fail, not even with --strict)."""
    def __init__(self):
        self.errs = []
        self.warns = []
        self.notes = []
    def err(self, m): self.errs.append(m)
    def warn(self, m): self.warns.append(m)
    def note(self, m): self.notes.append(m)


def is_num(v):
    """A real JSON number: bools are NOT numbers (json True would pass isinstance int)."""
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def is_point(v):
    return isinstance(v, (list, tuple)) and len(v) == 2 and all(is_num(x) for x in v)


def _num_list(v, n):
    return isinstance(v, (list, tuple)) and len(v) == n and all(is_num(x) for x in v)


class Ctx:
    """What a part's colors may reference."""
    def __init__(self, tokens, def_ids):
        self.tokens = tokens
        self.def_ids = def_ids
        self.rig_seen = {}
        self.rig_parts = []      # (rig, shape, where) in document (parts) order
        self.used_ids = set()


def check_color(v, where, r, ctx=None, tokens_ok=True):
    """Validate a paint value: color / 'none' / $token / url(#id) [fallback]."""
    if v is None:
        return
    if not isinstance(v, str):
        r.err("%s: must be a color string, got %r" % (where, v)); return
    if COLOR_BAD.search(v):
        r.err("%s: %r contains quotes or <> (unsafe; the engine drops it)" % (where, v)); return
    if "\\" in v:
        # a CSS escape spells url( without the letters: u\rl(https://...) / \75 rl(...)
        r.err("%s: %r contains a backslash (a CSS escape can hide an external url(); "
              "colors never need one)" % (where, v)); return
    if len(v) > COLOR_MAX:
        r.err("%s: %r is longer than %d chars (the engine drops it)" % (where, v, COLOR_MAX)); return
    if v.startswith("$"):
        if not tokens_ok:
            r.warn("%s: %r - $tokens are not resolved here (used verbatim)" % (where, v))
        elif ctx is not None and v[1:] not in ctx.tokens:
            r.warn("%s: token %r is not a built-in token or a params key (renders #888)" % (where, v))
        return
    for m in URL_RE.finditer(v):
        ref = m.group(1).strip("'\" ")
        lm = LOCAL_URL.match(ref)
        if not lm:
            r.err("%s: external reference url(%s) is not allowed (only url(#id) to a defs entry)"
                  % (where, ref)); return
        if ctx is not None:
            ctx.used_ids.add(lm.group(1))
            if lm.group(1) not in ctx.def_ids:
                r.warn("%s: url(#%s) has no matching 'defs' entry" % (where, lm.group(1)))
        rest = URL_RE.sub("", v).strip()
        if not rest:
            r.warn("%s: %r has no fallback color - add one (\"url(#id) #7C5CFF\") so the part "
                   "stays visible where gradients are not rendered" % (where, v))


def check_part(p, where, r, ctx=None, parent_rigs=()):
    if ctx is None:
        ctx = Ctx(BASE_TOKENS, set())
    if not isinstance(p, dict):
        r.err("%s: part is not an object" % where); return
    sh = p.get("shape")
    if sh not in SHAPES:
        r.err("%s: shape %r not allowed (use %s)" % (where, sh, "/".join(sorted(SHAPES)))); return
    rig = p.get("rig")
    if rig is not None:
        if rig not in RIG:
            r.warn("%s: rig %r is not a known rig point (ignored by engine)" % (where, rig))
        else:
            ctx.rig_seen.setdefault(rig, []).append(where)
            ctx.rig_parts.append((rig, sh, where))
            if rig == "pupilR" and "eyeR" not in parent_rigs:
                r.warn("%s: rig pupilR is only driven when nested inside a g with rig eyeR" % where)
    allowed = SHAPE_ATTRS[sh]
    for k, v in p.items():
        if k in COMMON:
            continue
        if k in ("parts", "d", "points"):
            owner = {"parts": "g", "d": "path", "points": "polygon"}[k]
            if sh != owner:
                r.warn("%s: '%s' is ignored on %s (only a %s reads it)" % (where, k, sh, owner))
            continue
        if k in NUM_ATTRS:
            if not is_num(v):
                r.err("%s: attr '%s' must be a number, got %r" % (where, k, v))
            elif k not in allowed:
                hint = " (use r)" if sh == "rect" and k in ("rx", "ry") else ""
                r.warn("%s: attr '%s' is ignored on %s%s" % (where, k, sh, hint))
        elif k == "transform":
            r.warn("%s: 'transform' is not applied by the engine - bake it into the coordinates "
                   "(rigger.html's JSON export does this)" % where)
        else:
            r.warn("%s: attr '%s' is not recognized (engine will ignore it)" % (where, k))
    for k in ("sw", "opacity"):
        if k in p and not is_num(p[k]):
            r.err("%s: attr '%s' must be a number, got %r" % (where, k, p[k]))
    if is_num(p.get("opacity")) and not 0 <= p["opacity"] <= 1:
        r.warn("%s: opacity %r outside 0..1" % (where, p["opacity"]))
    if is_num(p.get("sw")) and p["sw"] < 0:
        r.err("%s: sw (stroke width) must be >= 0" % where)
    for req in REQUIRED.get(sh, ()):
        if req not in p:
            r.warn("%s: %s without '%s' renders nothing" % (where, sh, req))
    if sh == "g":
        for k in ("fill", "stroke", "sw", "opacity", "lc", "lj"):
            if k in p:
                r.warn("%s: '%s' on a g is ignored by the engine - set it on the children" % (where, k))
    for ck in ("fill", "stroke"):
        if ck in p and p[ck] is not None:
            check_color(p[ck], "%s: %s" % (where, ck), r, ctx)
    if sh == "path":
        d = p.get("d")
        if not isinstance(d, str) or not PATH_RE.match(d):
            r.err("%s: path 'd' missing or contains disallowed characters" % where)
        elif len(d) > PATH_MAX:
            r.err("%s: path 'd' is %d chars; the engine drops paths over %d (split it)"
                  % (where, len(d), PATH_MAX))
    if sh == "polygon":
        pts = p.get("points")
        if not isinstance(pts, str) or not PATH_RE.match(pts):
            r.err("%s: polygon 'points' missing or contains disallowed characters" % where)
        elif len(pts) > PATH_MAX:
            r.err("%s: polygon 'points' is over %d chars (the engine drops it)" % (where, PATH_MAX))
    if sh == "g":
        kids = p.get("parts", [])
        if not isinstance(kids, list):
            r.err("%s: group 'parts' must be a list" % where)
        else:
            rigs = tuple(parent_rigs) + ((rig,) if rig else ())
            for i, kid in enumerate(kids):
                check_part(kid, "%s>g[%d]" % (where, i), r, ctx, rigs)
    if p.get("lc") not in (None, "round", "square"):
        r.warn("%s: lc should be 'round' or 'square'" % where)
    if p.get("lj") not in (None, "round"):
        r.warn("%s: lj only supports 'round' (others are ignored)" % where)


def _check_point_field(obj, key, where, r):
    if key in obj and not is_point(obj[key]):
        r.err("%s.%s must be [x, y] numbers, got %r" % (where, key, obj[key]))


def check_face(F, r):
    if not isinstance(F, dict):
        r.err("face must be an object"); return
    for k in F:
        if k not in FACE_KEYS:
            r.warn("face.%s is not recognized (engine ignores it)" % k)
    e = F.get("eyes")
    if e is None:
        r.warn("face.eyes missing (defaults used: L=[92,136], R=[148,136])")
    elif not isinstance(e, dict):
        r.err("face.eyes must be an object")
    else:
        if "L" not in e or "R" not in e:
            r.warn("face.eyes should have L and R points (defaults used otherwise)")
        _check_point_field(e, "L", "face.eyes", r)
        _check_point_field(e, "R", "face.eyes", r)
        for k in ("rx", "ry", "pupil", "outlineW"):
            if k in e and not (is_num(e[k]) and e[k] > 0):
                r.err("face.eyes.%s must be a positive number, got %r" % (k, e[k]))
        if "outline" in e:
            check_color(e["outline"], "face.eyes.outline", r, tokens_ok=False)
        for k in e:
            if k not in ("L", "R", "rx", "ry", "pupil", "outline", "outlineW"):
                r.warn("face.eyes.%s is not recognized" % k)
    m = F.get("mouth")
    if m is not None:
        if not isinstance(m, dict):
            r.err("face.mouth must be an object")
        else:
            for k, v in m.items():
                if k in ("x", "y", "w"):
                    if not is_num(v):
                        r.err("face.mouth.%s must be a number, got %r" % (k, v))
                else:
                    r.warn("face.mouth.%s is not recognized" % k)
    b = F.get("brows")
    if b is not None:
        if not isinstance(b, dict):
            r.err("face.brows must be an object")
        else:
            for k, v in b.items():
                if k in ("y", "w", "default"):
                    if not is_num(v):
                        r.err("face.brows.%s must be a number, got %r" % (k, v))
                elif k == "color":
                    check_color(v, "face.brows.color", r, tokens_ok=False)
                else:
                    r.warn("face.brows.%s is not recognized" % k)
            if is_num(b.get("default")) and not 0 <= b["default"] <= 1:
                r.warn("face.brows.default is an opacity (0..1)")
    c = F.get("cheeks")
    if c is not None:
        if not isinstance(c, dict):
            r.err("face.cheeks must be an object")
        else:
            _check_point_field(c, "L", "face.cheeks", r)
            _check_point_field(c, "R", "face.cheeks", r)
    if "render" in F and not isinstance(F["render"], bool):
        r.err("face.render must be true/false, got %r" % (F["render"],))


def param_attr(k):
    """The data- attribute that overrides params key k (the engine reads
    el.dataset[k]), or None when no attribute maps to that dataset key."""
    k = str(k)
    if not k or re.search(r"-[a-z]", k) or ATTR_BAD.search(k):
        return None
    return "data-" + re.sub(r"[A-Z]", lambda m: "-" + m.group(0).lower(), k)


def check_params(P, r):
    """Returns the set of tokens parts may use."""
    tokens = set(BASE_TOKENS)
    if not isinstance(P, dict):
        r.err("params must be an object {name: default color or $token}")
        return tokens
    for k, v in P.items():
        attr = param_attr(k)
        if attr is None:
            r.warn("params key %r works as \"$%s\" in parts, but no data- attribute can override "
                   "it (the engine reads el.dataset[%r]) - use a name like hairColor "
                   "(data-hair-color) to make it overridable" % (k, k, k))
        elif k in ENGINE_DATASET:
            r.warn("params key %r is also an engine attribute (%s): setting that attribute on "
                   "the element changes this color too - rename it" % (k, attr))
        if not isinstance(v, str):
            r.err("params.%s must be a color string or \"$token\", got %r" % (k, v))
        elif v.startswith("$") and v[1:] not in tokens:
            r.warn("params.%s: %r is not a built-in token or an earlier param (stays unresolved)" % (k, v))
        else:
            check_color(v, "params.%s" % k, r)
        tokens.add(k)
    return tokens


def check_defs(D, r):
    ids = set()
    if not isinstance(D, list):
        r.err("defs must be a list of gradient definitions"); return ids
    for i, g in enumerate(D):
        w = "defs[%d]" % i
        if not isinstance(g, dict):
            r.err("%s: not an object" % w); continue
        t = g.get("type")
        if t not in ("linearGradient", "radialGradient"):
            r.err("%s: type must be linearGradient or radialGradient, got %r" % (w, t)); continue
        gid = g.get("id")
        if not isinstance(gid, str) or not ID_RE.match(gid):
            r.err("%s: id %r must match [A-Za-z_][\\w-]*" % (w, gid))
        elif gid in ids:
            r.err("%s: duplicate id %r" % (w, gid))
        else:
            ids.add(gid)
        nums = ("x1", "y1", "x2", "y2") if t == "linearGradient" else ("cx", "cy", "r", "fx", "fy", "fr")
        for k, v in g.items():
            if k in nums:
                if not is_num(v):
                    r.err("%s.%s must be a number, got %r" % (w, k, v))
            elif k == "units":
                if v not in ("userSpaceOnUse", "objectBoundingBox"):
                    r.err("%s.units must be userSpaceOnUse or objectBoundingBox" % w)
            elif k == "spread":
                if v not in ("pad", "reflect", "repeat"):
                    r.err("%s.spread must be pad, reflect or repeat" % w)
            elif k == "transform":
                if not _num_list(v, 6):
                    r.err("%s.transform must be a matrix [a,b,c,d,e,f]" % w)
            elif k == "stops":
                if not isinstance(v, list) or not v:
                    r.err("%s.stops must be a non-empty list" % w); continue
                for j, s in enumerate(v):
                    sw = "%s.stops[%d]" % (w, j)
                    if not isinstance(s, dict):
                        r.err("%s: not an object" % sw); continue
                    if not (is_num(s.get("offset")) and 0 <= s["offset"] <= 1):
                        r.err("%s.offset must be a number 0..1" % sw)
                    if "color" not in s:
                        r.err("%s.color missing" % sw)
                    else:
                        check_color(s["color"], sw + ".color", r, tokens_ok=False)
                        if isinstance(s["color"], str) and "url(" in s["color"].lower():
                            r.err("%s.color cannot be a url()" % sw)
                    if "opacity" in s and not (is_num(s["opacity"]) and 0 <= s["opacity"] <= 1):
                        r.err("%s.opacity must be a number 0..1" % sw)
            elif k not in ("type", "id"):
                r.warn("%s.%s is not recognized" % (w, k))
        if "stops" not in g:
            r.err("%s: stops missing" % w)
    return ids


def validate_obj(d, r):
    """Validate an already-parsed definition (dict)."""
    if not isinstance(d, dict):
        r.err("top level must be an object"); return d
    for k in d:
        if k not in TOP_KEYS and k not in META_KEYS and not str(k).startswith("_"):
            r.warn("top-level key %r is not recognized (engine ignores it)" % k)
    if not d.get("name") or not isinstance(d.get("name"), str):
        r.warn("no 'name' (engine uses the data-char key when bundled)")
    vb = d.get("viewBox")
    if vb is not None:
        if not _num_list(vb, 2):
            r.err("viewBox must be [width, height] numbers, got %r" % (vb,))
        elif vb[0] <= 0 or vb[1] <= 0:
            r.err("viewBox width/height must be > 0")
    vbw = vb[0] if _num_list(vb, 2) else 240
    if "origin" in d:
        o = d["origin"]
        if not is_point(o):
            r.err("origin must be [x, y] numbers, got %r" % (o,))
        elif abs(o[0] - vbw / 2.0) > 1:
            r.warn("origin[0]=%r is ignored: the engine pivots the body at viewBox center x (%g)"
                   % (o[0], vbw / 2.0))
    if "shadow" in d and not _num_list(d["shadow"], 4):
        r.err("shadow must be [cx, cy, rx, ry] numbers, got %r" % (d["shadow"],))
    arms = d.get("arms")
    if arms is not None:
        if not isinstance(arms, dict):
            r.err("arms must be {L:[x,y], R:[x,y]}")
            arms = None
        else:
            for side in ("L", "R"):
                if side in arms and not is_point(arms[side]):
                    r.err("arms.%s must be [x, y] numbers, got %r" % (side, arms[side]))
            if ("L" in arms) != ("R" in arms):
                r.warn("arms needs both L and R pivots - with only one, the engine ignores arms")
            for k in arms:
                if k not in ("L", "R"):
                    r.warn("arms.%s is not recognized" % k)
    tokens = check_params(d["params"], r) if "params" in d else set(BASE_TOKENS)
    def_ids = check_defs(d["defs"], r) if "defs" in d else set()
    if "face" in d:
        check_face(d["face"], r)
    ctx = Ctx(tokens, def_ids)
    parts = d.get("parts", [])
    face_off = isinstance(d.get("face"), dict) and d["face"].get("render") is False
    if not isinstance(parts, list):
        r.err("parts must be a list")
    elif not parts and not face_off:
        r.warn("no parts -> the character will only show the engine face")
    else:
        for i, p in enumerate(parts):
            check_part(p, "parts[%d]" % i, r, ctx)
    # rig consistency - the engine drives the FIRST part of each rig class (open and
    # mouthOpen share one, as do smile and mouth)
    by_class = {}
    for rig, sh, where in ctx.rig_parts:
        by_class.setdefault(RIG_CLASS[rig], []).append((rig, sh, where))
    for cls, uses in by_class.items():
        if len(uses) > 1 and cls != "sbc-pupil":
            names = sorted({u[0] for u in uses})
            r.warn("rig %s used %d times (%s): only the first is animated"
                   % ("/".join(repr(n) for n in names), len(uses),
                      ", ".join(u[2] for u in uses[:3])))
        need = RIG_SHAPE.get(cls)
        rig, sh, where = uses[0]
        if need and sh != need[0]:
            r.warn("%s: rig %r is a %s, but the engine %s, which only a%s %s has - it can "
                   "only show/hide this part (use shape %r)"
                   % (where, rig, sh, need[1], "n" if need[0][0] in "aeiou" else "", need[0],
                      need[0]))
    has_arms = "armL" in ctx.rig_seen or "armR" in ctx.rig_seen
    arms_ok = isinstance(arms, dict) and is_point(arms.get("L")) and is_point(arms.get("R"))
    if has_arms and not arms_ok:
        r.warn("parts rig armL/armR but no arms {L,R} pivots: arms rotate around the "
               "SVG origin (0,0) and gestures (wave/shrug/point) look broken")
    if arms_ok and not has_arms:
        r.warn("arms pivots given but no part has rig armL/armR - gestures won't move any arm")
    own_eyes = {"eyeL", "eyeR"} & set(ctx.rig_seen)
    if not face_off and own_eyes:
        r.warn("parts rig eyeL/eyeR while face.render is not false: the engine also draws its "
               "own face on top - set face.render=false when you rig your own eyes")
    if face_off and not own_eyes:
        r.warn("face.render=false but no part has rig eyeL/eyeR: the character has no eyes "
               "(no blink / gaze) - rig your own eyes or drop render:false")
    if face_off and own_eyes and not ({"smile", "mouth", "open", "mouthOpen"} & set(ctx.rig_seen)):
        r.note("no part has rig mouth/open: with face.render=false the character has no "
               "mouth, so data-talk / say= show no lip-sync")
    unused = def_ids - ctx.used_ids
    if unused:
        r.warn("defs never referenced: %s" % ", ".join(sorted(unused)))
    if def_ids and not engine_renders_defs():
        r.note("defs: %d gradient(s) are kept for forward compatibility; this "
               "storyboard-engine.js does not render character defs, so parts show their "
               "url(#id) fallback colors" % len(def_ids))
    return d


def _scan_text(raw, d):
    """The text the raw safety scan checks: the definition minus its meta fields
    (author/license/description/... and _-prefixed keys are never rendered, so
    "Works online=yes" in a description is harmless), or the whole file when it
    is not a JSON object."""
    if not isinstance(d, dict):
        return raw
    kept = {k: v for k, v in d.items() if k not in META_KEYS and not str(k).startswith("_")}
    # json.dumps escapes quotes as \" - the patterns below don't depend on them
    return json.dumps(kept, ensure_ascii=False)


def validate(path, r):
    raw = Path(path).read_text(encoding="utf-8-sig")
    try:
        d = json.loads(raw)
    except Exception as ex:
        d, bad_json = None, ex
    else:
        bad_json = None
    # raw safety scan (the engine would also reject these in the SVG-rig path)
    scan = _scan_text(raw, d)
    low = scan.lower()
    for bad in RAW_BAD:
        if bad in low:
            r.err("file contains '%s' (not allowed in a character definition)" % bad)
    mh = RAW_HANDLER.search(scan)
    if mh:
        r.err("file contains an event handler '%s' (not allowed)" % mh.group(0))
    me = RAW_EXT_URL.search(scan)
    if me:
        end = scan.find(")", me.start())
        ref = scan[me.start():(end + 1 if 0 < end < me.start() + 80 else me.start() + 40)]
        r.err("file contains an external reference %s (only url(#id) is allowed)" % ref)
    if bad_json is not None:
        r.err("invalid JSON: %s" % bad_json); return None
    return validate_obj(d, r)


def main(argv=None):
    for s in (sys.stdout, sys.stderr):
        try:   # never crash on a cp1252 console
            s.reconfigure(errors="replace")
        except Exception:
            pass
    argv = sys.argv[1:] if argv is None else [str(a) for a in argv]
    strict = "--strict" in argv
    args = [a for a in argv if not a.startswith("-")]
    if not args or "-h" in argv or "--help" in argv:
        print("usage: python validate_character.py <file.json | dir> [...] [--strict]")
        sys.exit(2)
    targets = []
    for a in args:
        p = Path(a)
        if p.is_dir():
            targets += sorted(p.glob("*.json"))
        else:
            targets.append(p)
    if not targets:
        print("[ERROR] no .json files found")
        sys.exit(1)
    bad = 0
    for t in targets:
        r = Report()
        try:
            validate(t, r)
        except Exception as ex:
            r.err("could not read: %s" % ex)
        status = "[ERROR]" if r.errs else ("[WARN]" if r.warns else "[ok]")
        print("%s %s" % (status, t))
        for m in r.errs:
            print("   ERROR: " + m)
        for m in r.warns:
            print("   warn : " + m)
        for m in r.notes:
            print("   note : " + m)
        if r.errs or (strict and r.warns):
            bad += 1
    print()
    print("Checked %d file(s); %d with %s." % (len(targets), bad,
                                                "errors or warnings" if strict else "errors"))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
