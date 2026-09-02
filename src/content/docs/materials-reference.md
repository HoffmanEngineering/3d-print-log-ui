---
slug: materials-reference
title: Material Field Reference | 3D Print Log Docs
description: Every field on a 3D Print Log material — weights, adjustments, temperatures, purchase details, color and finish — and what each one changes.
navLabel: Material fields
group: reference
order: 10
mode: reference
updated: 2026-09-02
related:
  - materials
  - prints
movedAnchors:
  materials:
    - add-general
    - add-weights
    - add-adjustments
    - adjust-from-measured-weight
    - add-temperatures
    - add-purchase
    - loaded_filament
    - color-appearance
---

## Material Field Reference

---

Every field on the material form, and every column in the material list,
with what each one changes. For the procedures that use these fields — adding,
editing, photographing and labeling a roll — see
[Materials](/docs/materials#add).

---

### General Section {#add-general}

Give the roll of material a **Name** used to identify the roll. If you have
multiple rolls of the same brand/color, it may be helpful to give the roll a
name with a number (example: Hatchbox Black 1).

The **Material Type** is for storing the type of material, such as PLA,
SuperFlex Resin, etc. You can select one of the pre-populated material types to
automatically fill the **Material Density**, or you can add any other material
just by typing into the field. The **Material Density** is entered in Grams Per
Cubic Centimeter, and used when calculating weights.

The Color section has a **Color Picker** that lets you select the color which is
displayed. The **Color Name** lets you enter the manufacturer's name. The
**Brand** field is for recording the materials's manufacturer. The **Diameter**
is for the diameter of the filament in millimeters. The **Notes** section lets
you record any additional notes/description/etc for the material.

### Weights Section {#add-weights}

The Weights section lets you record the initial weight of the rolls, as well as
any Weight Adjustments needed.

- **Initial Total Weight (g)** - The total weight of the roll in grams, including the weight of the material and the spool. Find by putting the entire spool on a scale.
- **Initial Nominal Weight (g)** - The nominal, or expected, weight of just the material in grams. For instance, a 1kg roll of material would have a nominal weight of 1,000 grams.
- **Spool Weight (g)** - The weight of the empty spool.

### Material Adjustments {#add-adjustments}

<div fxLayout="row" fxLayout.lt-lg="column">
    <div fxFlex="grow">
      <p>
        Adjustments represent non-print usage of material. Adjustment weights
        are added when calculating the remaining material on a roll, so negative
        amounts represent the removal of material from the container. Examples
        of adjustments would be:
      </p>
      <ul>
        <li>
          Estimating material used when adding a partially-used roll to 3D Print
          Log.
        </li>
        <li>Tracking material lost when switching colors on a printer.</li>
      </ul>
    </div>
    <div fxFlex>
      <img
        class="fade-in"
        [ngStyle.lt-md]="{
          display: 'block',
          'max-width': '90%',
          'margin-left': 'auto',
          'margin-right': 'auto',
        }"
        alt="Example of Material Adjustments on the Material Edit Screen"
        src="./assets/docs-filaments-adjustment-example_f4b56af8f6a098.png"
      />
    </div>
  </div>

### Adjust from Measured Weight {#adjust-from-measured-weight}

Instead of working out an adjustment by hand, you can let 3D Print Log calculate
it from a scale reading. In the **Adjustments** section, choose **Adjust from
measured weight** to open the calculator.

The calculator uses the spool weight (either the value you entered, or the
difference between the initial total and nominal weights) together with the
currently tracked remaining amount. Enter the current total weight of the spool
as measured on a scale, and it shows how much filament you actually have left
and the adjustment needed to match it. Confirming adds that adjustment to the
list, ready to review before you save.

The calculator is available once the material has been saved, has a known
remaining amount, and has a spool weight. Save any pending edits first — the
button is disabled while there are unsaved changes so the calculation uses
up-to-date numbers.

### Temperatures {#add-temperatures}

Record the recommended temperature and range in Celsius for this material.

### Purchase Details {#add-purchase}

Record the **Purchase Date**, **Location**, and **Price** for future reference,
and ease of reordering. The **Location** can be used to store a URL to the
online retailer, or the name of the store purchased from.
---

### Color &amp; Appearance {#color-appearance}

#### Color Patterns

3D Print Log supports four color pattern types:

- **Solid** — A single uniform color. This is the default for most filaments.
- **Multi-Color** — Two or more colors across the cross-section of the filament strand. Common in bi-color and tri-color coextruded filaments. The colors appear as stripes when wound on the spool.
- **Gradient** — The filament transitions smoothly from one color to another along its length as you print. Sometimes called "ombre" or "transition" filament.
- **Rainbow** — Multiple colors blending smoothly along the length of the filament. Common in "silk rainbow," "galaxy," and multi-color gradient filaments. You can enter custom color stops or choose a preset palette.

#### Finish Type

The finish type describes the surface quality of the filament:

- **Standard** — Normal PLA/PETG/ABS finish. Default for all filaments.
- **Silk / Glossy** — High-gloss, smooth finish. Common in silk PLA filaments.
- **Matte / Satin** — Flat, low-sheen finish. Common in matte PLA and satin filaments.

#### Material Effects

Effects describe special additives or properties mixed into the filament.
Multiple effects can be combined.

- **Sparkle** — Metallic glitter or flake particles mixed into the filament.
- **Glow-in-Dark** — Phosphorescent — absorbs ambient light and glows in the dark.
- **Translucent** — The filament is partially or fully see-through.
- **Carbon Fiber** — Chopped carbon fiber strands mixed in for added stiffness.
- **Wood Fill** — Wood particles mixed in, giving a wood-like texture and appearance to prints.
- **Metal Fill** — Metal powder (copper, bronze, iron, etc.) mixed in, giving a metallic weight and finish to prints.
- **Fluorescent** — Glows brightly under UV/blacklight. Common in neon-colored filaments.
- **Glass Fiber** — Chopped glass fiber mixed in for added stiffness and dimensional stability.

#### Setting Up a Rainbow or Gradient Filament

1. Open the filament and click **Edit**.
2. Under **Color Pattern**, select **Gradient** or **Rainbow**.
3. For Rainbow, optionally pick a preset (Classic, Ocean, Sunset, etc.) to pre-fill the color stops.
4. Use the **+ Add color** button to add more stops (up to 8). Use the remove button to delete a stop.
5. The live preview spool updates as you adjust colors.
6. Save the filament.

---

### The Material List Table

- **Favorite Star** - Displays whether the material is a "favorite".
- **Color Box** - Displays the selected color of the filament.
- **Name** - The Display Name of the Material.
- **Brand** - The Brand of material.
- **Color** - The name of the Color of the material.
- **Remaining (g)** - The weight of material remaining.
---

### Loaded Material {#loaded_filament}

Printers can have one or more materials considered "loaded", meaning they are
currently in use by that printer. A material can only be "loaded" by one printer
at a time, so loading a material into a new printer will automatically unload it
from the old printer. See the [Printer Documentation](/docs/printers) for more
information on managing loaded materials.
