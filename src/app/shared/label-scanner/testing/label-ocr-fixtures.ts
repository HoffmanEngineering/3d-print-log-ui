// Generated from the spool label feasibility test (26 real label photos, cropped to the label as a
// guide box would, OCR'd with Tesseract.js). Each text is that OCR output; `expected` is what a
// person reads on the label. Regenerate rather than hand-edit.
import type { LabelFields } from '../label-fields';

export interface LabelOcrFixture {
  name: string;
  text: string;
  expected: LabelFields;
}

export const LABEL_OCR_FIXTURES: LabelOcrFixture[] = [
  {
    name: '20261027_010644555',
    text: 'PLA Marble Marble\n\n1. 75mm\n\nALTE UTTAR\n\n19406184\n\nPrint Temp 220-2401 100-4\n\nPrint Temp 210-2201 4-1\n\n00mm/s\n\n0mm)\n\nBed t\n\n(54.1\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 210,
      hotendMaxC: 240,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010653528',
    text: '',
    expected: {
      materialType: 'PLA',
      hotendMinC: 190,
      hotendMaxC: 230,
    },
  },
  {
    name: '20261027_010702916',
    text: 'PLA42 0)\n\nSilver\n\npL\n\nAHHH rg pg\n\n023409\n\n4A\n\nPrint Temp 195-2057 5\n\n0-100mm/s\n\nnnt Temp 205-220\n\n100-300mm/s\n\nLY ¢\n\n1000\n',
    expected: {
      materialType: 'PLA+',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 195,
      hotendMaxC: 220,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010706567',
    text: 'PLA+20\n\nSilver\n\n21 15mm\n\n\\\\\n\nMTINADE LI\n\n02540924A\n\nPrint Temp: 1985-200 50 -100mm/s\n\nPrint Temp 205-220 100-300mm/s\n\n\\\\%\n\n1000\n',
    expected: {
      materialType: 'PLA+',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 195,
      hotendMaxC: 220,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010710711',
    text: '.\n\ngh Some PLA Mure Brick Rea 1 75m\n\n[Hil Imi\n\n01641013A\n\nPrint Temp 190-210T 30- 150mm/s\n\nPrint Temp:230-260T 300-600mm\n\nPrinl Temp.210-230T 150-300mm/s\n\n/\n\nVv,\n\nBed temp: 50-60T\n\n4\n\n1000g\n\n0.9\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 260,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010714685',
    text: 'gh Soaed PLA Worle Bick Pe of\n\n75mm\n\nHmmm\n\n01641014\n\nPrint Temp 190-2107\n\n90-150mm/s\n\nPrint Temp.210-230\n\nC 150-300mmy/s\n\n-\n\nPrint Tem\n\nP-230-2607 300-600mmys\n\ned\n\ntemp 50-60\n\n—\n\n~~\n\n0\n\n£7 a\n\n1000g\n\n~~ ~\n\n| NG\n\nCn\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 260,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010720218',
    text: 'ff\n\n/77\n\nBe 4\n\nYY\n\n800g\n\n77,\n\n600g\n\n(/\n\n"77, /\n\n400g\n\n17,\n\n200g\n\nPLA\n\nFull Spectrum\n\nPrint Temp:\n\n190-230c\n\nBed Temp:\n\n@ 25-65¢\n\nFo Ty\n\nPa\n\n9 se\n\now\n',
    expected: {
      materialType: 'PLA',
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 230,
      bedMinC: 25,
      bedMaxC: 65,
    },
  },
  {
    name: '20261027_010724757',
    text: 'am\n',
    expected: {},
  },
  {
    name: '20261027_010730095',
    text: 'FEATURES\n\nOVERTURE"...\n\n—\n\nSilk Shining Surface\n\nNet Weight: 1 kg\n\n“Bubble Free ~~ 4\n\ni\n\n\\ 3D.PRINTER\n\nLength: 332 m (320 m)\n\nAY\n\nTangle Fri\n\nSlt\n\nFILAMENT\n\nPLA\n\nNozzle Temp: 200 - 220 °C\n\nBlog Free. i\n\n\\\n\n\\\n\nbed\n\nBed Temp:50 - 60 °C\n\n80\n\nCompatible\n\n3D\n\n‘4\n\n1 PN SN.\n\n|\n\na\n\ndy\n\no-\n\nBa SN JAN\n\nA\n\ni Printing Speed:30 - 70 mm/s\n\n280m\n\n600g\n\nPrt\n\nility + 0\n\n0gmm J\n\n210m\n\nYP\n\nmms J |\n\nFlowrate;1 00-110 %,\n\n7\n\n4004\n\n\\ 0 |\n\n~\n\n140m\n\n200g\n\nw\n\nNe\n\n70m\n\npan-b\n\n\\7/,\n\nA\n\nv\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 200,
      hotendMaxC: 220,
      bedMinC: 50,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_010735360',
    text: '77\n\n» 2\n\nEE ——\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 180,
      hotendMaxC: 210,
    },
  },
  {
    name: '20261027_010740765',
    text: 'ELEGOO\n\nPLA 1.75mm 1kg\n\nPrinting Temp:190°C-230°C\n\ncolour:Sea Green &) %\n\n1-2604-0403\n\nJ\n\nA a tae Qe\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 230,
    },
  },
  {
    name: '20261027_010750949',
    text: '~~\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 230,
    },
  },
  {
    name: '20261027_010759327',
    text: 'he\n\nPrinte\n\nr Fila\n\n“PLA\n\nMent\n\nPrinting T\n\ni\n\n¥en\n\nC louy WwW\n\n*Mp:20¢°\n\nhite\n\nC 230°\n\n1 75mm\n\n1-230q\n\nkg\n\n“)\n\n0914\n',
    expected: {
      materialType: 'PLA',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 200,
      hotendMaxC: 230,
    },
  },
  {
    name: '20261027_010807085',
    text: '',
    expected: {
      materialType: 'PLA',
      diameterMm: 1.75,
      hotendMinC: 190,
      hotendMaxC: 230,
      bedMinC: 25,
      bedMaxC: 65,
    },
  },
  {
    name: '20261027_010816819',
    text: 'WOOD\n\nMim\n\n00d gi 75mm\n\ni\n\nJ il dln 4-1\n\n1040614\n\nJUTE\n\nHe iggy Wn\n',
    expected: {
      materialType: 'WOOD',
      diameterMm: 1.75,
      hotendMinC: 205,
      hotendMaxC: 235,
    },
  },
  {
    name: '20261027_010921118',
    text: 'LA\n\noC\n\n649 55-65\n\n9 190\n\n230°C\n\nrnt Et\n\npry bef\n\nore EACH X\n\n\\\\\n',
    expected: {
      materialType: 'PLA',
      hotendMinC: 190,
      hotendMaxC: 230,
      bedMinC: 55,
      bedMaxC: 65,
    },
  },
  {
    name: '20261027_010958303',
    text: '4\n\nJBN\n\nTPU Silk Byr und\n\nY  91.75mm\n\nHI\n\ni\n\n135110A\n\nvin\n\nal]\n\nA%A\n\nA\n\n~~\n\nwqA\n\nemp\n\n&\n\nvv\n\nJIMA\n\nJIN VLURsy|\n\n“Ly\n\n0 ne\n\nIU £{U=/\n\nM8 A\n\n471\n\n02mm\n\nvi\n',
    expected: {
      materialType: 'TPU',
      diameterMm: 1.75,
      hotendMinC: 210,
      hotendMaxC: 240,
    },
  },
  {
    name: '20261027_011007403',
    text: '',
    expected: {
      materialType: 'PETG',
    },
  },
  {
    name: '20261027_011021997',
    text: 'FIBER\n\nON\n\n\\ym K\n\n(0);\n\nAQ\n',
    expected: {},
  },
  {
    name: '20261027_011028645',
    text: 'Weight\n\n500g\n\nPrinting s\n\nColor\n\nBlack\n\nop to 300mmy/s\n\nPrinting\n\nTemp\n\nDiameter\n\n250-300\n\nFC\n\n1.75mm\n\nLH)\n\nBatch\n\nLa\n\nBed Te\n\nmp :\n\nA75090\n\number\n\nlm\n\nA\n\n40-50°\n\n90363\n\n|S\n\nSKU\n\n[=]\n\ni\n\nFG07001\n\nTDS §& Printing Profiles\n',
    expected: {
      materialType: 'PA612-CF15',
      weightG: 500,
      diameterMm: 1.75,
      hotendMinC: 250,
      hotendMaxC: 300,
      bedMinC: 40,
      bedMaxC: 50,
    },
  },
  {
    name: '20261027_011039866',
    text: '7\n\nFEATURES\n\nOVERTURE’\n\nSETTINGS\n\nBubble Free\n\nClog Free\n\n3D PRINTER\n\nNozzle Temp:\n\nTangle Free\n\n230-250°C\n\nPETG\n\nFILAMENT\n\nBed Temp:\n\nCompatible with\n\n80-90°C\n\nMost 3D Printers\n\n98% Probability + 0.02 mm\n\nNet Weight:1 kg\n\n99% Probability + 0.03 mm\n\n0\n\nLength:322m (20m)\n\n210m\n\n200g\n\n140m\n\n\\\n\n70m\n\nA\n\nA\n\nA\n',
    expected: {
      materialType: 'PETG',
      weightG: 1000,
      hotendMinC: 230,
      hotendMaxC: 250,
      bedMinC: 80,
      bedMaxC: 90,
    },
  },
  {
    name: '20261027_011051156',
    text: 'CREALITY\n\nHY PER SERIES\n\n© 3\n\nPRINTER FILAMENT © j§\n',
    expected: {},
  },
  {
    name: '20261027_011058809',
    text: 'Hyper PLA-CF Black\n\nDiameter\n\n~ 1.75mm\n\nN\n\nNet Weight\n\n1kg/2.2lb\n\nPrinting Speed\n\n30-350mm/s\n\nPrinting Temperature\n\n200-230C\n\n"Bed Temperature\n\n25-60C\n\nFan\n\nON\n',
    expected: {
      materialType: 'PLA-CF',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 200,
      hotendMaxC: 230,
      bedMinC: 25,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_011112182',
    text: 'fd\n\nFEATURES\n\nOVE RTU TUR E® ier\n\n210-230 °C\n\n© ®\n\n~\n\nER\n\nEXECLLENT\n\nDUROMETER\n\n25-60°C\n\nFLEXIBILITY\n\n95A\n\nTPU\n\n20 - 40 mm/s\n\nfe FAN\n\nOn\n\n28!\n\n©\n\nVIBRANT\n\nCOLORS\n\nEASY TO PRINT\n\n2101\n\n332m (+ 20m)\n',
    expected: {
      materialType: 'TPU 95A',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 210,
      hotendMaxC: 230,
      bedMinC: 25,
      bedMaxC: 60,
    },
  },
  {
    name: '20261027_011120788',
    text: 'TPU Silk Buyr\n\ngundy  @1 75mm\n\nHm\n\nHI\n\n135110A\n\nPrint Tem\n\n10\n\nby\n\nNI\n\n.UZ0444027\n\n44\n\nOT 40 {0mmis\n\nTA Prt Temp 20\n\nn il\n\n01 1 Ul mm Q\n',
    expected: {
      materialType: 'TPU',
      diameterMm: 1.75,
      hotendMinC: 210,
      hotendMaxC: 240,
    },
  },
  {
    name: '20261027_011132445',
    text: 'PETG\n\nBlack\n\n@1.75mm\n\niit J\n\n026407104\n\nPrint Temp:230-240°C 50 -100mm/s\n\nPrint Temp:240-260°C 100-200mm/s\n\nBed tem\n\n60-70C\n\n1000g\n\n13\n',
    expected: {
      materialType: 'PETG',
      weightG: 1000,
      diameterMm: 1.75,
      hotendMinC: 230,
      hotendMaxC: 260,
      bedMinC: 60,
      bedMaxC: 70,
    },
  },
];
