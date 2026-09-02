---
slug: materials
title: Filaments & Materials | 3D Print Log Docs
description: Manage your filament and material inventory in 3D Print Log — track brands, colors, types, cost, and remaining weight across all your spools.
navLabel: Materials
group: features
order: 30
mode: how-to
updated: 2026-09-02
related: [materials-reference, prints]
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

The columns in this table, and every field behind them, are described in
[Material fields](/docs/materials-reference#add-general).

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
for example *412 g of 1,000 g left*. Under that, where 3D Print Log has enough
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
amount and what it will become *after saving*. Nothing is committed until you
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

Every field on this form is described in
[Material fields](/docs/materials-reference#add-general) — the general details,
[weights](/docs/materials-reference#add-weights),
[adjustments](/docs/materials-reference#add-adjustments),
[temperatures](/docs/materials-reference#add-temperatures) and
[purchase details](/docs/materials-reference#add-purchase).

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

### More about materials

Every field on a material, the columns in the material list,
[color and appearance](/docs/materials-reference#color-appearance) and what it
means for a material to be [loaded into a printer](/docs/materials-reference#loaded_filament) are covered in
[Material fields](/docs/materials-reference#add-general).
