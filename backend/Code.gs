const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID';
const DRIVE_FOLDER_ID = 'YOUR_DRIVE_FOLDER_ID';

function createJsonOutput(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doOptions() {
  return createJsonOutput({ status: 'ok' });
}

function doGet(e) {
  try {
    const sheets = SpreadsheetApp.openById(SPREADSHEET_ID);
    const pins = readPins(sheets);
    const configPassword = readConfigPassword(sheets);

    return createJsonOutput({ status: 'success', pins, configPassword });
  } catch (error) {
    return createJsonOutput({ status: 'error', message: error.message });
  }
}

function doPost(e) {
  try {
    const payload = parseRequest(e);
    if (!payload || !payload.action) {
      throw new Error('Missing action or request payload');
    }

    const sheets = SpreadsheetApp.openById(SPREADSHEET_ID);
    if (payload.action === 'verifyAdmin') {
      const valid = payload.password === readConfigPassword(sheets);
      return createJsonOutput({ status: 'success', valid });
    }

    if (payload.action === 'create' || payload.action === 'update') {
      const pin = payload.pin || {};
      if (pin.imageBase64) {
        pin.imageUrl = saveImageBase64(pin.imageBase64);
      }
      const result = upsertPin(sheets, pin);
      return createJsonOutput({ status: 'success', pin: result });
    }

    throw new Error(`Unsupported action: ${payload.action}`);
  } catch (error) {
    return createJsonOutput({ status: 'error', message: error.message });
  }
}

function parseRequest(e) {
  if (e.postData && e.postData.type === 'application/json' && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  return null;
}

function readConfigPassword(sheets) {
  const configSheet = sheets.getSheetByName('Config');
  if (!configSheet) {
    throw new Error('Config sheet not found');
  }
  return configSheet.getRange('A1').getValue().toString().trim();
}

function readPins(sheets) {
  const pinsSheet = sheets.getSheetByName('Pins');
  if (!pinsSheet) {
    throw new Error('Pins sheet not found');
  }

  const values = pinsSheet.getDataRange().getValues();
  const rows = values.slice(1).filter((row) => row.some((cell) => cell !== ''));

  return rows.map((row) => ({
    id: row[0]?.toString() || '',
    latitude: Number(row[5]) || 0,
    longitude: Number(row[6]) || 0,
    placeName: row[1] || '',
    city: row[2] || '',
    country: row[3] || '',
    continent: row[4] || '',
    date: row[7] || '',
    time: row[8] || '',
    description: row[10] || '',
    companions: row[11] || '',
    imageUrl: row[9] || '',
    tripId: row[12] || '',
    sequenceOrder: Number(row[13]) || 0
  }));
}

function upsertPin(sheets, pin) {
  const pinsSheet = sheets.getSheetByName('Pins');
  if (!pinsSheet) {
    throw new Error('Pins sheet not found');
  }

  const id = pin.id?.toString() || `pin_${Date.now()}`;
  const values = pinsSheet.getDataRange().getValues();
  const headers = values[0] || [];
  const dataRows = values.slice(1);
  const rowIndex = dataRows.findIndex((row) => row[0]?.toString() === id);
  const rowValues = [
    id,
    pin.latitude || 0,
    pin.longitude || 0,
    pin.placeName || '',
    pin.country || '',
    pin.continent || '',
    pin.date || '',
    pin.time || '',
    pin.description || '',
    pin.companions || '',
    pin.imageUrl || '',
    pin.tripId || '',
    pin.sequenceOrder || 0
  ];

  if (rowIndex >= 0) {
    pinsSheet.getRange(rowIndex + 2, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    pinsSheet.appendRow(rowValues);
  }

  return {
    id,
    latitude: Number(rowValues[1]) || 0,
    longitude: Number(rowValues[2]) || 0,
    placeName: rowValues[3],
    country: rowValues[4],
    continent: rowValues[5],
    date: rowValues[6],
    time: rowValues[7],
    description: rowValues[8],
    companions: rowValues[9],
    imageUrl: rowValues[10],
    tripId: rowValues[11],
    sequenceOrder: Number(rowValues[12]) || 0
  };
}

function saveImageBase64(base64String) {
  const parts = base64String.match(/^data:(image\/[^;]+);base64,(.*)$/);
  let mimeType = 'image/jpeg';
  let encoded = base64String;

  if (parts) {
    mimeType = parts[1];
    encoded = parts[2];
  }

  const extension = mimeType.split('/')[1] || 'jpg';
  const decoded = Utilities.base64Decode(encoded);
  const blob = Utilities.newBlob(decoded, mimeType, `atlas-${Date.now()}.${extension}`);
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}
