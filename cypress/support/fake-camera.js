/**
 * Puts a QR code in front of the app's camera.
 *
 * There is no way to hold a printed label up to a headless browser, and the
 * scanner is not a seam we can stub from a spec — `QrScannerService` reaches
 * for `html5-qrcode`, which reaches for `navigator.mediaDevices`. So we replace
 * the camera itself: a canvas with the QR drawn on it, published as a
 * MediaStream. Everything above that — camera enumeration, the video element,
 * the real decoder, `parseFilamentUrl` — runs exactly as it does in production.
 *
 * Call from `cy.visit`'s `onBeforeLoad`, before the app boots:
 *
 *   cy.visit('/prints/new/edit', {
 *     onBeforeLoad: (win) => installFakeCamera(win, qrDataUrl),
 *   });
 *
 * @param win the application window
 * @param qrDataUrl a PNG data URL of the QR code, from `QRCode.toDataURL`
 */
export function installFakeCamera(win, qrDataUrl) {
  const canvas = win.document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');

  const image = new win.Image();
  image.src = qrDataUrl;

  // html5-qrcode decodes a `qrbox`-sized crop from the middle of the frame, and
  // how big that crop is in source pixels depends on how the browser laid the
  // video out inside the dialog. Rather than guess one size that lands inside
  // it, sweep the QR from small to large: within a second or so some frame puts
  // the whole code, quiet zone included, inside the crop.
  let size = 140;
  const drawFrame = () => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    size = size >= 360 ? 140 : size + 20;
    ctx.drawImage(
      image,
      (canvas.width - size) / 2,
      (canvas.height - size) / 2,
      size,
      size
    );
  };
  drawFrame();
  win.setInterval(drawFrame, 100);

  const fakeCamera = {
    deviceId: 'e2e-fake-camera',
    kind: 'videoinput',
    label: 'E2E Fake Back Camera',
    groupId: 'e2e-fake-camera-group',
  };

  Object.defineProperty(win.navigator, 'mediaDevices', {
    configurable: true,
    value: {
      // A fresh stream per call on purpose: `Html5Qrcode.getCameras()` opens a
      // stream just to unlock device labels and then stops its tracks. Handing
      // out one shared stream would leave the scanner with a dead track.
      getUserMedia: () => Promise.resolve(canvas.captureStream(10)),
      enumerateDevices: () => Promise.resolve([fakeCamera]),
      getSupportedConstraints: () => ({}),
      addEventListener: () => {},
      removeEventListener: () => {},
    },
  });
}
