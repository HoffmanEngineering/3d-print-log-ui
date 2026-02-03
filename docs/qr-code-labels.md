# QR Code Label Printing for Filament Spools

## Overview

This feature allows users to generate and print QR code labels for their filament spools. Users can print a label, stick it on the spool, and later scan it with any phone camera or QR scanner app to quickly navigate to that filament's detail page in the app.

## Feature Scope

### Phase 1 (Implemented)

- QR code label generation with configurable layout options
- Print via browser print dialog (opens in new window)
- "Print QR Label" action from filament list row menu
- "Print Labels" bulk action from filament list toolbar
- "Print QR Label" button on filament detail page
- Deep link URL format: `https://{origin}/materials/{filamentId}`

### Phase 2 (Implemented)

- In-app camera-based QR scanner for filament selection
- Scan QR code from filament search modal to auto-select filament
- Camera selection for devices with multiple cameras
- Graceful error handling for camera permissions

### Phase 3 (Future)

- PNG/PDF export
- Saved label presets/templates
- Custom label sizes for dedicated label printers

## QR Code Content

Each QR code encodes a deep link URL: `https://{window.location.origin}/materials/{filamentId}`

This works with any phone camera or QR scanner app out of the box. The `/materials/:id` route loads the filament detail page. Additionally, the in-app QR scanner can be used to quickly select a filament when editing prints or printers.

## User Interface

### Entry Points

1. **Filament List - Row Menu**

   - Click the "more" button (⋮) on any filament row
   - Select "Print QR Label"
   - Opens dialog with single label

2. **Filament List - Toolbar**

   - Click "Print Labels" button in the toolbar
   - Opens dialog with labels for all filaments on the current page

3. **Filament Detail Page**
   - Click "Print QR Label" button (next to Submit)
   - Only visible for saved filaments (not new)
   - Opens dialog with single label

### QR Scanner (Filament Selection)

When selecting a filament (e.g., on the Edit Print or Edit Printer pages), users can scan a QR code label instead of searching manually:

1. Click to select a filament (opens FilamentSearchModal)
2. Click the QR scanner icon button in the dialog header
3. Grant camera permission when prompted
4. Point camera at a filament QR code label
5. Filament is automatically looked up and selected

**Scanner Features:**

- Camera selector dropdown (when multiple cameras available)
- Prefers back/environment camera by default
- Error handling for permission denied, no camera, camera in use
- "Try Again" button to retry after errors or invalid scans

### Label Dialog Settings

| Setting    | Options              | Default | Description                      |
| ---------- | -------------------- | ------- | -------------------------------- |
| Paper Size | A4, Letter, A5       | A4      | Physical paper dimensions        |
| Columns    | 1-4                  | 2       | Number of label columns per page |
| Rows       | 3-10                 | 5       | Number of label rows per page    |
| Label Size | Small, Medium, Large | Medium  | Individual label dimensions      |

**Label Size Dimensions:**

- Small: 50mm × 25mm
- Medium: 70mm × 30mm
- Large: 90mm × 35mm

### Label Content

Each label displays:

- QR code (left side)
- Filament name (bold)
- Brand (if available)
- Material type
- Color swatch + color name
- Nozzle temperature (if available)

## Technical Implementation

### Dependencies

```json
{
  "dependencies": {
    "qrcode": "^1.5.4",
    "html5-qrcode": "^2.3.8"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

- **qrcode**: Generates QR codes as SVG/PNG for label printing
- **html5-qrcode**: Camera-based QR code scanning library (~60KB, no native dependencies)

### Files

```
src/app/core/services/
├── qr-code.service.ts              # QR code generation service
├── qr-code.service.spec.ts         # Unit tests
├── qr-scanner.service.ts           # QR code scanning service
└── qr-scanner.service.spec.ts      # Unit tests

src/app/shared/qr-label-dialog/
├── qr-label-dialog.component.ts      # Label printing dialog
├── qr-label-dialog.component.html    # Template
├── qr-label-dialog.component.scss    # Styles
└── qr-label-dialog.component.spec.ts # Unit tests

src/app/shared/qr-scanner/
├── qr-scanner.component.ts           # Camera scanner component
├── qr-scanner.component.html         # Template
├── qr-scanner.component.scss         # Styles
└── qr-scanner.component.spec.ts      # Unit tests

src/app/shared/filament-search-modal/
├── filament-search-modal.component.ts   # Modified to support scanner view
├── filament-search-modal.component.html # Added scanner toggle
└── filament-search-modal.component.scss # Added scanner styles
```

### QrCodeService

```typescript
// Generate QR code as SVG string
generateSvg(data: string, options?: QrCodeOptions): Promise<string>

// Generate QR code as data URL (base64 PNG)
generateDataUrl(data: string, options?: QrCodeOptions): Promise<string>

// Generate deep link URL for a filament
generateFilamentUrl(filamentId: string): string
```

### QrScannerService

```typescript
interface QrScanResult {
  success: boolean;
  filamentId?: string;
  rawText: string;
  error?: string;
}

// Start scanning with camera
startScanning(elementId: string, onSuccess: (result: QrScanResult) => void, cameraId?: string): Promise<void>

// Stop current scanning session
stopScanning(): Promise<void>

// Parse scanned URL to extract filament ID
parseFilamentUrl(scannedText: string): QrScanResult

// Get list of available cameras
getCameras(): Promise<CameraDevice[]>
```

**URL Parsing:**

- Expected format: `https://{origin}/materials/{filamentId}`
- Extracts GUID from pathname using regex: `/^\/materials\/([a-f0-9-]+)$/i`
- Returns error for non-matching URLs

### QrScannerComponent

Standalone component that provides camera viewfinder for QR scanning.

**Signals:**

- `scanning`: Whether actively scanning
- `initializing`: Whether camera is being set up
- `error`: Current error message (if any)
- `cameras`: List of available cameras
- `selectedCamera`: Currently selected camera ID

**Output:**

- `scanned`: Emits `QrScanResult` when QR code is detected

**Features:**

- Uses `afterNextRender` for DOM-dependent initialization
- Prefers back/rear/environment camera when available
- Handles common camera errors with user-friendly messages
- Uses `ViewEncapsulation.None` for html5-qrcode styling compatibility

### QrLabelDialogComponent

**Input (via MAT_DIALOG_DATA):**

```typescript
interface QrLabelDialogData {
  filaments: FilamentSummary[];
}
```

**Print Mechanism:**

- Opens a new browser window with standalone HTML
- Contains all styles embedded inline
- Uses `page-break-after: always` for multi-page support
- Triggers `window.print()` in the new window
- Closes window after print dialog

## Print Output

### Page Layout

- Pages are sized to match selected paper size
- 10mm padding around page edges
- 3mm gap between labels
- Labels are centered horizontally in their grid cells
- Labels stack from top (not vertically centered)

### Page Breaks

- Automatic pagination based on columns × rows
- Each logical page forces a page break
- No blank pages between content pages

### Browser Compatibility

- Requires popup windows to be allowed
- Uses standard CSS print media features
- Tested with Chrome print preview

### FilamentSearchModalComponent Integration

The filament search modal was extended to support QR scanning as an alternative to list-based selection.

**New Signals:**

- `viewMode`: `'list' | 'scanner'` - toggles between search list and scanner
- `scanError`: Error message from failed scan/lookup
- `loading`: Whether filament lookup is in progress

**New Methods:**

- `toggleViewMode()`: Switch between list and scanner views
- `retryScan()`: Clear error and remount scanner
- `handleQrScanned(result)`: Process scan result, fetch filament, close dialog

**Scan Flow:**

1. User scans QR code → `QrScannerComponent` emits result
2. `handleQrScanned` validates result and extracts filament ID
3. Calls `FilamentService.getFilamentDetail(id)` to fetch full details
4. Maps `FilamentDetail` to `FilamentSummary` format
5. Closes dialog with filament (same as manual selection)

**Error Handling:**

- Invalid QR code: "This QR code is not a 3D Print Log filament label"
- Filament not found (404): "Filament not found. It may have been deleted."
- Network error: "Unable to look up filament. Please check your connection."

## Usage Examples

### Label Printing

```typescript
// Open dialog for single filament
this.dialog.open(QrLabelDialogComponent, {
  data: { filaments: [filament] } as QrLabelDialogData,
  width: '600px',
});

// Open dialog for multiple filaments
this.dialog.open(QrLabelDialogComponent, {
  data: { filaments: this.filaments } as QrLabelDialogData,
  width: '800px',
});
```

### QR Scanning (via FilamentSearchModal)

```typescript
// The scanner is automatically available in FilamentSearchModalComponent
// No additional setup needed - just open the modal as usual
const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
  data: {
    otherFilamentOption: OTHER_FILAMENT_OPTION,
    filterByMaterialCategory: 'FDM',
  },
  height: '80vh',
  width: '80vw',
});

// User can toggle to scanner view using the icon button in the header
dialogRef.afterClosed().subscribe((filament) => {
  // filament is returned regardless of selection method (list or scan)
});
```

## Testing

### Unit Tests

**Label Printing:**

- `QrCodeService`: SVG generation, data URL generation, URL formatting
- `QrLabelDialogComponent`: Initialization, pagination, settings changes

**QR Scanning:**

- `QrScannerService`: URL parsing (valid/invalid URLs, different origins, edge cases)
- `QrScannerComponent`: Camera initialization, camera selection, error handling, scan events

### Manual Testing Checklist

**Label Printing:**

- [ ] Open dialog from filament list row menu
- [ ] Open dialog from filament list toolbar (bulk)
- [ ] Open dialog from filament detail page
- [ ] Change paper size and verify preview updates
- [ ] Change columns/rows and verify pagination
- [ ] Change label size and verify label dimensions
- [ ] Print and verify output matches preview
- [ ] Print multiple pages and verify page breaks

**QR Scanning:**

- [ ] Open filament search modal (from Edit Print or Edit Printer)
- [ ] Click QR scanner icon to switch to scanner view
- [ ] Grant camera permission when prompted
- [ ] Verify camera preview displays correctly
- [ ] Switch cameras using dropdown (if multiple cameras)
- [ ] Scan valid filament QR code and verify filament is selected
- [ ] Scan invalid QR code and verify error message
- [ ] Click "Try Again" and verify scanner restarts
- [ ] Deny camera permission and verify error message
- [ ] Click list icon to return to search list view
