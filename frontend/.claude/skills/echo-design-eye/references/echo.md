# Echo: the calibration reference

Echo's own style, written as a foundation the way Design Eye writes one. Read it once a session before writing: it sets the voice, the altitude and the depth. Notice throughout: materials are named as nouns, every observation carries its why, the rules hold on screens nobody drew, the constraints are rejection rules, and the closing carries a decision procedure.

Two things differ from a foundation you'll write. Its values are exact, because they are Echo's own theme; a style read from a board quotes sampled values and marks estimates with `~`. And it carries no figures, because it ships as text: a foundation you write carries its plates. Echo's style also keeps the library's one-word name; a style you name takes two words.

One more thing to keep apart: Echo's own *look* and Echo's *grammar*. Echo's look is molded plastic under one key light, and some rules below are that look, not the grammar: the light and its angle, elevation drawn as light, no borders, seams and wells, the glow. Each is marked *(Echo's look)*. A style read from a board may do the opposite (a drawn style outlines every part, in ink, with no light at all) and still wear Echo's grammar.

---

## Title block

**DESIGN LANGUAGE / SPECIFICATION / v1 — Echo**

> A device molded in one plastic and lit by one key light: caps that travel when pressed, screens that glow, one lit accent. A component-level design language, written to be placement-agnostic, so it holds on screens no reference showed.

SOURCE: Echo's components and its principles · ANALYSIS: Echo UI · STATUS: Locked: the grammar every other style wears

ASSETS: none. This reference ships as text; its values are the theme's own.

---

## PART I / OBSERVATION — What the device is made of

The first pass is descriptive: the materials, named at component level and stripped of any one arrangement.

### 1 · Chassis plastic
— A matte, dark body (#232130) that every part is mounted in: pages, panels, the ground.
— It is the one surface that is neither raised nor recessed, so it reads as the object you're holding rather than as a background.
— Tinted toward the accent's hue rather than neutral grey, so the one lit colour looks lit from inside the same plastic.

### 2 · Caps
— Raised molded plastic (#393748), a step lighter than the body, with a lit top rim (#514f62) and a shaded underside (#171525).
— Caps are the only things you press: buttons, keys, tabs, segments. Their shape tells the hand before a label does.
— A cap travels: down in 90ms with a slight overshoot, back when it's let go. The travel is the acknowledgement.

### 3 · Wells
— Recesses cut into the chassis (#0c0917), shaded at the top and lit at the bottom lip: the light falls into them.
— A well holds a value or takes one: a field, a track, the bed a switch's cap sits in. You put something into it; you never press it.
— Depth comes in steps, not degrees: a shallow well for a field, a deep bezel for a large screen, a groove for a track.

### 4 · Screen glass
— Dark glass (#090713) set in a well, with a lit readout in the screen face, glowing in the accent.
— Screens report: readouts, tags, stats, logs. Besides LEDs they are the only things that emit light, which is why the device is dark: a glow needs a dark room.
— A screen can be reflective instead: paper glass printed in ink, like a pocket calculator's. It never glows.

### 5 · Glass slabs
— Translucent slabs that float above the device: dialogs, sheets, popovers, toasts.
— Glass is for what arrives and leaves, and it's the only material not mounted in the chassis. A popup blooms out of what opened it.

### 6 · The lit accent
— One saturated colour (#8b6fe8), spent on two jobs: the one lit cap (the primary action, the current page, the selected segment, a molded gradient from #7258c5 to #503c8e with ivory text) and something emitting light (LEDs, LCD digits, meter cells, a 2px "you are here" rail).
— No outer glows on controls. Light comes from screens and LEDs, never from buttons.

### 7 · Seams
— One separator: a dark groove (#070511) over a faint lit lip, the seam where two molded parts meet.
— Parts are told apart by seams and wells, never by boxes and borders.

### 8 · Ink and type
— Ivory ink (#EFEBFA), never pure white, and a dim ink (#aba8b6) that still holds AA on every ground it sits on.
— The machine label: 10px bold capitals tracked 0.2em, a legend printed on the body over a control.
— Readouts in the screen face, numbers and short tags; sentences in a plain grotesque at 14px.

**Distillation.** One plastic, one light, five materials with one job each, and one lit colour. The character comes from light agreeing with itself (every highlight at the same angle) and from each material telling the hand what it's for before a word does. Not from colour.

---

## PART II / SYSTEM — The rules underneath

The second pass is prescriptive: what to do on a screen the reference never drew.

### 01 · Spatial logic: a faceplate, three depths

There is one key light, at 145° (the upper left), and every highlight, shadow and bevel agrees with it. That agreement is most of what makes a flat screen read as an object.

The defining move is that every part takes exactly one of three depths:
— **Raised**: catches light on its top edge and casts a shadow below. Things you touch.
— **Recessed**: shaded at the top, lit at the bottom lip. Things you put something into.
— **Flush**: sits on the chassis and does neither. Labels, text, the body itself.

A screen is laid out like a faceplate: panels mounted on the body, labels printed over the controls they name, the one lit cap where the eye should land.

### 02 · Elevation as a ladder of light

Elevation is a recipe, not a judgement call: pick the depth, take its shadow.

| LAYER | ROLE | LIGHT | RECIPE |
|---|---|---|---|
| Recessed, deep | a large screen's bezel, a keypad's window | shaded top, lit lip, deepest | `--echo-shadow-well-deep` |
| Recessed | fields, trays, a cap's bed | shaded top, lit lip | `--echo-shadow-well` |
| Screen | glass set in a well | the glass's own sheen | `--echo-shadow-well-screen` |
| Groove | tracks for progress and levels | a channel cut into the body | `--echo-shadow-groove` |
| Flush | the chassis | none | — |
| Raised, low | badges, counts, low keys | lit top edge, a short shadow | `--echo-shadow-chip`, `--echo-shadow-key` |
| Raised | a cap at rest | lit rim, shadow below | `--echo-shadow-cap` |
| Raised, lit | the one lit cap | the cap's light, in the accent | `--echo-shadow-cap-lit` |
| Panel | a panel resting on the body | resting, then lifted under the pointer | `--echo-shadow-panel`, `--echo-shadow-lifted` |
| Floating | tooltip, popover, toast, modal, lowest to highest | glass, higher each step | `--echo-shadow-tooltip` … `--echo-shadow-modal` |

— Elevation is light, never a border. Nothing is outlined to be told apart. *(Echo's look: on a drawn device elevation is an ink edge, and every part is outlined.)*
— Finish (0 matte, 1 glossy) scales every recipe at once: how brightly edges shine and how deep shadows fall.

### 03 · The surface primitive

All of Echo's depth is one primitive: a highlight on the edge that faces the light and a shade on the edge that doesn't. Raised puts the light on top; recessed swaps them; flush has neither. A new part never gets a new shadow: it takes the depth it is, and that depth's recipe.

### 04 · Colour: one hue, spent twice

The palette is authored from three seeds: the accent, the chassis, the paper. Every neutral is a step of the chassis: caps lighter, wells and seams darker. The accent is the only saturated value, and it is spent on exactly two things: the cap that's on, and light.

State is carried by luminance, shape and words, never by hue: an error and a notice differ by their LED's shape and their tag ("ERROR", "INFO"), not by red and blue. A colour per item says which one, never how it is. The theme holds AA for every role on every ground it can sit on, so no seed makes text unreadable.

AUTHORED VALUES, dark to light:

| VALUE | ROLE |
|---|---|
| `#070511` | seam: the darkest hairline |
| `#090713` | screen glass |
| `#0C0917` | well: a recess |
| `#171525` | a cap's underside |
| `#232130` | chassis: the body |
| `#393748` | cap plastic |
| `#514F62` | a cap's lit rim |
| `#664EB3` | the lit cap |
| `#8B6FE8` | the accent: light |
| `#ABA8B6` | dim ink |
| `#EFEBFA` | ink |

### 05 · Typographic scale

Four faces by job, few sizes. The job decides the face; the size only orders what's in it.

- **MACHINE LABEL** — 10px, bold, capitals, tracked 0.2em. Reserved for the legend over a control and a section's name. Never a sentence.
- **HEADING** — the machine face, 16px, bold, tight. One per panel.
- **BODY** — 14px (13px small), 1.55 leading. Secondary text drops to the dim ink, not to a smaller size.
- **READOUT** — the screen face, on a screen only: numbers and short tags.

Deliberately absent: display type the size of the screen.

### 06 · Motion budget

Motion is physics: a part does what a real part would, and nothing it wouldn't.

— Controls acknowledge fast: a press in 90ms, a tick in 120ms, a swap in 160ms.
— Things arrive and leave with more time: a chip pops in over 400ms, a takeover floods in over 700ms.
— Anything the hand can redirect moves on a spring, from settled to thrown.
— Glass and light move smoothly; pixels move in steps. A readout never eases like a sheet of glass.
— Under reduced motion, movement collapses to a fade or stops, and isn't brought back "just this once".

### 07 · Sound

Sound is feedback, never information: short synthesized clicks and chirps, quieter than you'd expect, muted until the person turns them on. A sound confirms what the screen already shows.

### 08 · Constraints

Each line is a rejection rule: an element that violates one is not in the system.

01. One key light, at 145°. No second light, and no shadow that disagrees with it. *(Echo's look: a drawn device has no light.)*
02. One material per job. A cap is pressed, a well is filled, a screen reports, glass arrives and leaves.
03. One accent, two jobs: the lit cap and emitted light. No second shade of it, no pastel of it.
04. No state in hue. No success green, no danger red.
05. No borders for separation. Seams and wells only. *(Echo's look: a drawn device separates by its ink line.)*
06. No glow on a control. Light comes from screens and LEDs. *(On a drawn device nothing glows.)*
07. One "you are here": a 2px lit rail.
08. Every duration is a token. Nothing moves for decoration.
09. Sound never says what the screen doesn't.
10. When accessibility and the look disagree, accessibility wins: AA contrast, a visible focus ring, no target under 24×24px.

---

## PART III / FIT PROFILE

TEMPERAMENT — position on each axis, 1–5, one clause of evidence each:
| AXIS | 1 ←→ 5 | POS | EVIDENCE |
|---|---|---|---|
| Warmth | clinical ←→ human | 4 | a cool palette on an object you touch: keys that travel, clicks you hear, ivory ink instead of white |
| Volume | whisper ←→ shout | 3 | one lit accent and a clear hierarchy; everything else is the body's plastic |
| Density | sparse ←→ dense | 3 | panels with room between them, a few controls at a time, at 44px |
| Formality | playful ←→ severe | 2 | springs that overshoot and a device you want to press, on an orderly faceplate |
| Era | heritage ←→ futuristic | 3 | hardware from no particular year: molded keys and LCD glass, set in a plain grotesque |
| Craft | raw ←→ engineered | 5 | every value is a token: one light angle, one shadow recipe per depth, one duration scale |
| Ornament | austere ←→ decorative | 3 | one signature flourish: the glow of a lit screen and a 2px rail |

SIGNALS — a thing you could pick up; quality you can hear.
SERVES — tools people come back to every day and like to touch: audio and music, dashboards and instruments, developer tools, settings, anything with a readout.
STRAINS — pages where long text is the product; brands that live in daylight (they want a light style, on Echo's light device); photography-led marketing.
COSTS — discipline more than budget: one accent spent twice, every part finished in every state, and the engineering of travel, springs and sound.
ADJACENT — instrument panels, consumer electronics, hardware product photography. Never flat components from another library on the same surface: the eye reads two devices, and the flat one looks broken.

---

## PART IV / ECHO

Echo's own style is the grammar, so every rule above is either the grammar or a setting, and nothing is refused. Its `style.json`:

```json
{
  "version": 1,
  "name": "echo",
  "title": "Echo",
  "essence": "A device molded in one plastic and lit by one key light: caps that travel when pressed, screens that glow, one lit accent.",
  "fingerprint": {
    "warmth": 4,
    "volume": 3,
    "density": 3,
    "formality": 2,
    "era": 3,
    "craft": 5,
    "ornament": 3
  },
  "seed": {
    "accent": "#8B6FE8",
    "chassis": "#232130",
    "paper": "#EFEBFA",
    "finish": 0.5,
    "radius": 0.5,
    "density": "default"
  },
  "rules": [
    "The primary action is the one lit cap; everything else is the body's plastic.",
    "Screens are dark glass with lit readouts, and numbers on them are in the screen face.",
    "A label over a control is a machine label: small, spaced capitals.",
    "Parts are set apart by seams and wells, not boxes and borders."
  ],
  "motion": {
    "character": "Springs with weight: caps travel, panels bloom out of what opened them, readouts roll.",
    "inferred": false
  },
  "sound": {
    "voice": "Dry clicks and soft taps, muted until the person turns sound on.",
    "inferred": false
  }
}
```

Every other style lands somewhere between. Where the common wishes go:

| The style wants | Lands as | In `style.json` |
|---|---|---|
| pill-shaped buttons | a setting | `"pills": true`, whatever the corners of the boxes |
| hard, square corners | a setting | `"radius": 0` |
| uncoated paper, no shine | a setting | `"finish": 0` |
| a spreadsheet's density | a setting | `"density": "compact"` |
| a serif for reading | a setting | `"fontSans"`: body text, whatever its genre |
| one display sentence per section | a rule | `"One display sentence per band."` |
| colour only where something changed | a rule | `"Colour only for state."` |
| red for errors, green for success | a refusal | instead: the LED's shape and a word on its tag |
| outlined, hollow parts in one ink (a spec sheet, a wireframe, an outlined pill on a hard edge) | a setting | `"render": "drawn"`: the parts are drawn instead of molded, and still travel when pressed |
| flat surfaces with no depth at all, nothing that looks pressable | a refusal | instead: `render` drawn, where depth is an ink edge, or finish 0 on a molded device; a part you press always looks pressable |
| a second accent | a refusal | instead: a Scope gives an item its own accent, for which one, never how it is |
| a glow on hover | a refusal | instead: the cap lifts; light comes from screens |
| a light body | a setting | a pale `chassis` makes Echo's light device: light plastic, and screens of paper glass printed in ink |

---

## CLOSING — Echo

When a part appears that the spec doesn't cover, ask what it would be made of on the device. Something you press is a cap; something you put a value into is a well; something that reports is a screen; something that arrives and leaves is glass. Light it from the upper left, give it the accent only if it's on or emitting light, and let it move the way that material would. Everything else follows from that one question.
