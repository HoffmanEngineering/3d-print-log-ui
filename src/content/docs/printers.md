---
slug: printers
title: Managing Printers | 3D Print Log Docs
description: Add and manage your 3D printers in 3D Print Log. Track each machine, its prints, and its maintenance history in one place.
navLabel: Printers
group: features
order: 40
mode: how-to
updated: 2026-09-02
related: [prints]
---

## Printers

---

Navigate to the [Printers](/printers) section to manage your list of 3D
printers.

### Printers List

By default, the list shows the **active** printers. Use the **Search** input at
the top to search the **Name, Make, Model, and description** fields. Clicking
the **Include Inactive** checkbox will add inactive printers to the search
results.

---

### Add a new 3D Printer

From the 3D Printer list, click on the <button mat-raised-button
color="accent">Add New Printer</button> button.

Give the printer a **Name**, select the **Printer Type** such as FDM, SLA, etc.
Then add a **Make**, and a **Model**. Optionally add a description (which can
help when searching).

Different printer types have different options. For example, FDM printers will
have a filament diameter and nozzle diameter, while DLP resin printers will have
screen resolutions. Fill out any additional fields as needed.

When ready, click <button mat-raised-button color="primary">Submit</button> to
save your new 3D Printer.

---

### Edit an existing 3D Printer

Click on any row in the list to view and edit an existing 3D Printer.

After making changes, click <button mat-raised-button
color="primary">Submit</button> to update that 3D printer.

---

### Loaded Material {#loaded_filament}

Printers can have one or more filament rolls considered "loaded", meaning they
are currently in use by that printer. When adding a new print, the selected
printer's "Loaded Material" will automatically populate in the print's Material
Usage section.

#### Managing Loaded Material

**Automatic Load** - The first time a New Print is saved, that print's Material
Usage will be considered the currently loaded filament for the selected printer.

**Manual Load** - In a printer's **Edit Page**, you can manually load and unload
filament. Simply click **Load Material** to select a new filament, or click
**Unload** to remove a currently loaded filament.

**Automatic Unload** - A roll can only be currently loaded by one Printer at a
time, so if a roll is added to a new printer, it's automatically unloaded from
the old printer.

**Quick Unload** - On the Printer List, click the **...** menu and select the
**Unload Material** button to remove that printer's currently loaded filament.

---

### Delete a Printer {#delete_printer}

To delete a printer, click the **...** menu and select the **Delete** button.
This will display a confirmation dialog, and once accepted the printer and all
associated maintenance entries will be permanently deleted. Only printers with
no prints can be deleted. Either delete the prints first, or change the printer
on the prints to another printer. Otherwise, you can mark the printer as
**inactive** instead.

---

### Average Wattage {#printer-wattage}

Each printer has an optional **Average Wattage (W)** field used to calculate
electricity cost. If left blank, the default wattage from [Settings](/settings)
is used instead.

To find your printer's wattage, check the label on your power supply or your
printer's specifications page. For the most accurate value, use a smart plug or
energy monitor during a typical print.

---
