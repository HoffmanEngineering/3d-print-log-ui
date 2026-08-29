---
slug: materials
title: Filaments & Materials | 3D Print Log Docs
description: Manage your filament and material inventory in 3D Print Log — track brands, colors, types, cost, and remaining weight across all your spools.
navLabel: Materials
group: features
order: 30
mode: reference
updated: 2026-08-29
related: [prints]
aliases: [filaments]
---

## Materials

---

3D Print Log helps you keep track of what materials and colors you have, and how
much material is left on the roll/spool/bottle/etc. Print with confidence
knowing you won't run out of material mid-print. Navigate to the
[Materials](/materials) section to manage all your materials.

A **Material** is an individual product, such as a single roll of filament or
bottle of resin.

### Materials List {#list}

The Materials List shows you all of your materials. Use the **Search** input at
the top to filter the list by the materials's **Name**, **Brand** or **Color**
fields. Use the **Include Inactive** checkbox to include **Empty or Inactive**
rolls of materials. Use the **Show Favorites Only** checkbox to only show
**Favorite** materials. Use the **Show Loaded Materials Only** checkbox to only
show materials currently loaded in a printer. The table is sorted by **Material
Remaining** by default, but you can click on any of the table headers to order
by Name, Brand, or Color.

#### The Material List Table

- **Favorite Star** - Displays whether the material is a "favorite".
- **Color Box** - Displays the selected color of the filament.
- **Name** - The Display Name of the Material.
- **Brand** - The Brand of material.
- **Color** - The name of the Color of the material.
- **Remaining (g)** - The weight of material remaining.

#### Favorite Material

A material can be marked as "favorite" by clicking the <mat-icon
inline>star_border</mat-icon> icon. This will allow the material to appear when
the **Show Favorites Only** filter is applied.

---

### How Remaining Material is Calculated {#remaining}

The Remaining Material is calculated by the Materials's **[Initial Nominal
Weight]**-**[sum of Material used in Prints]**+**[sum of any Adjustments]**.

**Initial Nominal Weight** is entered when Adding/Editing a material, and is the
nominal, or expected, weight of the material on the roll or bottle. So a 1kg
roll of filament would have an Initial Nominal Weight of 1000 grams.

**Material Used in Prints** are the weights entered in the Material Section when
Adding/Editing a print. See [Prints Documentation](/docs/prints) for more
details on how to add material usage. When calculating Remaining Material, a
print's **Actual Material Used** will be used if available, otherwise it'll use
the **Estimated Material Used**.

Usage recorded as a length or a volume counts exactly the same. 3D Print Log
converts it to a weight using the material's density and diameter, so it does
not matter which measurement you enter on a print &mdash; the roll counts down
by the same amount either way.

**Material Adjustments** are entered when Adding/Editing a material, and
represent non-print usage of material. Useful for documenting the wasted
materials when changing colors, or adjusting a material's weight when adding a
partially used roll to 3D Print Log. See the **Adjustments** section below for
more information.

#### Tracking What's Left on a Material {#remaining-panel}

Open any saved material and you'll see a **Remaining** card beside the form. A
bar shows how full the roll is at a glance, with the reading beneath it &mdash;
for example _412 g of 1,000 g left_. Under that, where 3D Print Log has enough
information to work them out, you'll also see the remaining **Length** in meters
and **Volume** in milliliters, along with how much material has been **Used** in
total and how many **Prints** it went into.

Length and Volume are the remaining weight converted using the material's
density and diameter, so all three readings always describe the same roll.
Materials measured in a container rather than on a spool &mdash; resins and
powders &mdash; have no diameter, so they show a Volume but no Length.

If the card says **Not tracked**, the material has no Initial Nominal Weight
yet, so there is nothing to count down from. Use the **Set nominal weight**
button on the card to jump straight to the field, enter the weight of a full
roll, and save.

If the card shows a warning that the material is **over-used**, more material
has been logged against it than the roll was ever supposed to hold. That usually
means a print recorded more usage than it really consumed, or the Initial
Nominal Weight is too low. Check the prints listed on the card, correct
whichever one is wrong, or add an Adjustment to bring the roll back in line with
what you actually have.

While you're editing, the card previews your unsaved changes. Add an adjustment
or change the nominal weight and it shows both figures &mdash; the current
amount and what it will become _after saving_. Nothing is committed until you
save. When a change is too complex to preview reliably, such as editing the
material's density or diameter, the card simply says the figure updates after
saving rather than showing you a number it cannot stand behind.

#### Prints That Used This Material {#remaining-prints}

Below the Remaining card is a list of the most recent prints that used this
material, newest first, each showing how much it consumed. Usage marked with an
asterisk is an estimate rather than a measured amount. Click any print to open
it. If the material has been used more times than the list shows, a **View all**
link opens the full print list already filtered to this material.

---

### Add a new roll of Material {#add}

From the Material list, click on the <button mat-raised-button
color="accent">Add New Material</button> button.

#### General Section {#add-general}

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

#### Weights Section {#add-weights}

The Weights section lets you record the initial weight of the rolls, as well as
any Weight Adjustments needed.

- **Initial Total Weight (g)** - The total weight of the roll in grams, including the weight of the material and the spool. Find by putting the entire spool on a scale.
- **Initial Nominal Weight (g)** - The nominal, or expected, weight of just the material in grams. For instance, a 1kg roll of material would have a nominal weight of 1,000 grams.
- **Spool Weight (g)** - The weight of the empty spool.

#### Material Adjustments {#add-adjustments}

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

#### Adjust from Measured Weight {#adjust-from-measured-weight}

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

#### Temperatures {#add-temperatures}

Record the recommended temperature and range in Celsius for this material.

#### Purchase Details {#add-purchase}

Record the **Purchase Date**, **Location**, and **Price** for future reference,
and ease of reordering. The **Location** can be used to store a URL to the
online retailer, or the name of the store purchased from.

---

### Edit a Material {#edit}

Click on any row in the Material List to view and edit an existing 3D print.

After making changes, click <button mat-raised-button
color="primary">Submit</button> to update that material.

---

### Photos {#photos}

You can attach photos to a material to help you recognize the physical spool,
bottle, or roll on your shelf. Open a material from the [Materials
List](/materials), then use the **Photos** section at the top of the page. Click
**Add Photo** (or drag an image file onto the box) to choose one or more
pictures, then click <button mat-raised-button color="primary">Submit</button>
to save them along with the rest of your changes. In the mobile app, **Add
Photo** and the **+** tile let you take a new picture with your camera as well
as pick one from your gallery.

Once a material has more than one photo you can drag the thumbnails to change
their order, and click the star on a thumbnail to make it the **default** photo.
The default photo is the one shown beside the material in the Materials List, so
pick the picture that makes it easiest to spot.

Photos belong to one physical spool, so **copying a material does not copy its
photos**. The copy starts with no pictures, and you can add photos of the new
spool instead.

When you upload a picture, 3D Print Log saves a fresh copy of the image and does
not keep the original file's metadata &mdash; including any location information
your camera or phone recorded with the photo. Only the picture itself is stored.

---

### Delete a Material {#delete}

Materials that have not been used in any Prints can be deleted from the
[Materials List](/materials). Click the ... more menu on the row for the
material you want to delete. A warning that the material will be permanently
deleted will appear. When **Delete** is clicked, the material will be deleted.

If a material has been used in a Print, you cannot delete it. Instead, you can
**Inactive** a material by Editing, then unchecking the **Is Active** checkbox
in the **General** section. Inactive material will not be displayed.

---

### QR Code Labels {#qr-labels}

3D Print Log can generate printable QR code labels for your material spools.
Stick a label on your spool, then scan it with any phone camera or QR scanner
app to quickly navigate to that material's detail page.

#### Printing Labels {#qr-printing}

There are several ways to print QR code labels:

- **From the Materials List** - Click the <mat-icon inline>more_horiz</mat-icon> menu on any row and select **Print QR Label**.
- **Bulk Print from Toolbar** - Click the **Print Labels** button in the toolbar to print labels for all materials on the current page.
- **From Material Detail Page** - Click the **Print QR Label** button next to the Submit button when viewing a saved material.

#### Multi-Select for Bulk Printing {#qr-multi-select}

You can select specific materials to print labels for using the checkboxes in
the first column of the Materials List:

- **Select Individual Materials** - Click the checkbox next to each material you want to include.
- **Select All on Page** - Click the checkbox in the header row to select or deselect all materials on the current page.
- **Selections Persist** - Your selections are preserved when you search, filter, or paginate. This lets you select materials across different searches.
- **Print Selected** - When materials are selected, the toolbar shows **Print Labels (X)** where X is the number selected. Click to print labels for only the selected materials.
- **Clear Selection** - Click the **Clear** button next to the selection count to deselect all materials.

#### Label Settings {#qr-dialog}

When printing labels, a dialog appears where you can customize the layout:

- **Paper Size** - Choose A4, Letter, or A5 to match your printer paper.
- **Columns** - Number of labels per row (1-4).
- **Rows** - Number of labels per column (3-10).
- **Label Size** - Small (50×25mm), Medium (70×30mm), or Large (90×35mm).

Each label displays the QR code, material name, brand, material type, color
swatch with color name, and nozzle temperature (if set).

#### Scanning QR Codes {#qr-scanning}

When selecting a material (for example, when editing a Print or Printer), you
can scan a QR code label instead of searching manually:

1. Click to select a material to open the search dialog.
2. Click the <mat-icon inline>qr_code_scanner</mat-icon> icon in the dialog header to switch to scanner mode.
3. Grant camera permission when prompted by your browser.
4. Point your camera at a material's QR code label. The material will be automatically looked up and selected.
5. Use the camera dropdown to switch between cameras if your device has multiple cameras.
6. Click the <mat-icon inline>list</mat-icon> icon to return to the search list view.

---

### Loaded Material {#loaded_filament}

Printers can have one or more materials considered "loaded", meaning they are
currently in use by that printer. A material can only be "loaded" by one printer
at a time, so loading a material into a new printer will automatically unload it
from the old printer. See the [Printer Documentation](/docs/printers) for more
information on managing loaded materials.

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
