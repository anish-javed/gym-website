/**
 * Pulse Forge Fitness - Google Apps Script (receives the website forms)
 *
 * How it works:
 *  - The website sends two kinds of messages to this script's web address (a "POST" request):
 *      action = "join"  -> a new member filled the join form
 *      action = "txid"  -> the member pasted the transaction ID of their USDT payment
 *  - Everything is saved in the tab "Members" of your Google Sheet.
 *    If the tab is empty, the header row is created automatically.
 *  - "join": makes a unique member ID like PF-1042, saves one new row with Status "Pending"
 *    and sends the member ID back to the website.
 *  - "txid": finds the row by member ID, saves the transaction ID and sets Status "Awaiting check".
 *    A transaction ID that is already used in another row is refused.
 *  - After a row is saved, an email alert goes to the script owner (your own Google account,
 *    found automatically - no email address is written in this file).
 *    If the email fails, the row is still saved.
 *
 * Steps to install are in SETUP-GOOGLE-SHEET.md.
 * IMPORTANT: create this script from INSIDE your Google Sheet:
 *            Extensions > Apps Script.
 */

var TIME_ZONE = 'Asia/Karachi';      // Pakistan time
var TAB_NAME = 'Members';

var ADMISSION_FEE = 2000;            // PKR, one time (the script re-calculates the total itself)
var MONTHLY_FEE = 5000;              // PKR per month
var FIRST_ID_NUMBER = 1001;          // first member becomes PF-1001

var MAX_LENGTH = 200;                // longest text we accept in one cell

// The columns of the "Members" tab, in order.
var HEADERS = [
  'Member ID',                       // A
  'Timestamp (Pakistan time)',       // B
  'Full Name',                       // C
  'Phone',                           // D
  'Gender',                          // E
  'Preferred Trainer',               // F
  'Months',                          // G
  'Start Date',                      // H
  'Total PKR',                       // I
  'USDT Amount',                     // J
  'Test Mode',                       // K
  'Rate Used (PKR per USDT)',        // L
  'Consent',                         // M
  'Status',                          // N
  'Transaction ID',                  // O
  'TxID Time (Pakistan time)'        // P
];
var COL = {
  ID: 1, TIME: 2, NAME: 3, PHONE: 4, GENDER: 5, TRAINER: 6, MONTHS: 7, START: 8, TOTAL: 9,
  USDT: 10, TEST: 11, RATE: 12, CONSENT: 13, STATUS: 14, TXID: 15, TXTIME: 16
};

var STATUS_PENDING = 'Pending';
var STATUS_AWAITING = 'Awaiting check';
var STATUS_LIST = ['Pending', 'Awaiting check', 'Paid', 'Rejected'];   // dropdown in the Status column

/** Receives the data sent by the website. */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // If two people press Send at the same moment, wait in line (no mixed-up rows).
    lock.waitLock(20000);

    var p = (e && e.parameter) ? e.parameter : {};

    // Spam robots fill the hidden "company_website" field. Pretend all is well, save nothing.
    if (p.company_website) return reply({ result: 'success', memberId: 'PF-0000' });

    if (p.action === 'join') return handleJoin(p);
    if (p.action === 'txid') return handleTxid(p);
    return reply({ result: 'error', message: 'Unknown action.' });
  } catch (err) {
    return reply({ result: 'error', message: 'Something went wrong. Please try again.' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Lets you test the web address by opening it in a browser. */
function doGet() {
  return reply({ result: 'ok', message: 'Pulse Forge Fitness form receiver is working.' });
}

/**
 * OPTIONAL: run this once from the editor (select "setupSheets" > Run).
 * It creates the "Members" tab with its header row and asks you to allow access.
 */
function setupSheets() {
  getSheet();
}

/* ------------------------------------------------------------------ */
/* JOIN                                                                */
/* ------------------------------------------------------------------ */

function handleJoin(p) {
  var name = clean(p.fullName).replace(/\s+/g, ' ');
  var phone = clean(p.phone);
  var gender = clean(p.gender);
  var trainer = clean(p.trainerPref);
  var months = Number(p.months);
  var startDate = clean(p.startDate);
  var usdt = Number(p.usdtAmount);
  var rate = Number(p.rateUsed);
  var testMode = (String(p.testMode).toLowerCase() === 'yes') ? 'Yes' : 'No';

  if (name.length < 3) return reply({ result: 'error', message: 'Please enter your full name.' });
  if (!/^03\d{2}-\d{7}$/.test(phone)) return reply({ result: 'error', message: 'Please enter a phone number like 0300-1234567.' });
  if (gender !== 'Female' && gender !== 'Male') return reply({ result: 'error', message: 'Please choose Female or Male.' });
  if (trainer !== 'Female' && trainer !== 'Male') return reply({ result: 'error', message: 'Please choose a trainer preference.' });
  if ([1, 3, 6, 12].indexOf(months) < 0) return reply({ result: 'error', message: 'Please choose 1, 3, 6 or 12 months.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return reply({ result: 'error', message: 'Please choose a start date.' });
  if (!(usdt > 0 && usdt < 100000)) return reply({ result: 'error', message: 'The USDT amount is not valid.' });
  if (String(p.consent) !== 'yes') return reply({ result: 'error', message: 'Please tick the consent box.' });

  // The total is worked out here, so nobody can change the price from the browser.
  var totalPkr = ADMISSION_FEE + months * MONTHLY_FEE;

  var sheet = getSheet();
  var memberId = nextMemberId(sheet);
  var timestamp = pakistanNow();

  var row = [];
  row[COL.ID - 1] = memberId;
  row[COL.TIME - 1] = timestamp;
  row[COL.NAME - 1] = name;
  row[COL.PHONE - 1] = phone;
  row[COL.GENDER - 1] = gender;
  row[COL.TRAINER - 1] = trainer;
  row[COL.MONTHS - 1] = months;
  row[COL.START - 1] = startDate;
  row[COL.TOTAL - 1] = totalPkr;
  row[COL.USDT - 1] = usdt.toFixed(2);
  row[COL.TEST - 1] = testMode;
  row[COL.RATE - 1] = rate > 0 ? rate : '';
  row[COL.CONSENT - 1] = 'Yes';
  row[COL.STATUS - 1] = STATUS_PENDING;
  row[COL.TXID - 1] = '';
  row[COL.TXTIME - 1] = '';

  sheet.appendRow(row);
  SpreadsheetApp.flush();     // the row is saved from here on

  // If the email fails, the row stays saved and the member still gets their ID.
  try {
    sendOwnerEmail(
      'New member ' + memberId + ': ' + oneLine(name),
      'A new member filled the join form.\n\n' +
      'Member ID: ' + memberId + '\n' +
      'Time (Pakistan): ' + timestamp + '\n' +
      'Name: ' + name + '\n' +
      'Phone: ' + phone + '\n' +
      'Gender: ' + gender + '\n' +
      'Preferred trainer: ' + trainer + '\n' +
      'Months: ' + months + '\n' +
      'Start date: ' + startDate + '\n' +
      'Total: Rs ' + totalPkr + '\n' +
      'USDT to receive: ' + usdt.toFixed(2) + (testMode === 'Yes' ? ' (TEST MODE)' : '') + '\n' +
      'Status: ' + STATUS_PENDING + '\n\n' +
      'Open the Google Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    );
  } catch (mailErr) {
    console.error('Email alert failed: ' + mailErr);
  }

  return reply({ result: 'success', memberId: memberId });
}

/* ------------------------------------------------------------------ */
/* TRANSACTION ID                                                      */
/* ------------------------------------------------------------------ */

function handleTxid(p) {
  var memberId = clean(p.memberId);
  var txid = clean(p.txid);
  var phone = clean(p.phone);

  if (!/^PF-\d{3,}$/.test(memberId)) return reply({ result: 'error', message: 'The member ID is not valid.' });
  // A Solana transaction ID is a long "base58" text (about 87-88 characters).
  if (!/^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(txid)) {
    return reply({ result: 'error', message: 'That does not look like a Solana transaction ID. Please copy it again.' });
  }

  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return reply({ result: 'error', message: 'We could not find that member ID.' });

  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rowIndex = -1;
  var i;
  for (i = 0; i < values.length; i++) {
    if (String(values[i][COL.ID - 1]) === memberId) { rowIndex = i; break; }
  }
  if (rowIndex < 0) return reply({ result: 'error', message: 'We could not find that member ID.' });

  var row = values[rowIndex];

  // Extra check so nobody can attach a payment to somebody else's ID: the phone must match.
  if (digits(row[COL.PHONE - 1]).slice(-10) !== digits(phone).slice(-10)) {
    return reply({ result: 'error', message: 'We could not match this member ID. Please call us.' });
  }

  // A transaction ID can be used only once.
  for (i = 0; i < values.length; i++) {
    if (i !== rowIndex && String(values[i][COL.TXID - 1]) === txid) {
      return reply({ result: 'error', message: 'This transaction ID was already used. Please check it, or call us for help.' });
    }
  }

  var status = String(row[COL.STATUS - 1]);
  if (status === 'Paid') return reply({ result: 'error', message: 'This membership is already confirmed. Thank you!' });

  var sheetRow = rowIndex + 2;
  var timestamp = pakistanNow();
  sheet.getRange(sheetRow, COL.TXID).setValue(txid);
  sheet.getRange(sheetRow, COL.STATUS).setValue(STATUS_AWAITING);
  sheet.getRange(sheetRow, COL.TXTIME).setValue(timestamp);
  SpreadsheetApp.flush();     // saved

  try {
    sendOwnerEmail(
      'Transaction ID submitted: ' + memberId,
      'A member sent their transaction ID. Please check the payment.\n\n' +
      'Member ID: ' + memberId + '\n' +
      'Name: ' + oneLine(row[COL.NAME - 1]) + '\n' +
      'Phone: ' + oneLine(row[COL.PHONE - 1]) + '\n' +
      'Expected USDT: ' + row[COL.USDT - 1] + (String(row[COL.TEST - 1]) === 'Yes' ? ' (TEST MODE)' : '') + '\n' +
      'Time (Pakistan): ' + timestamp + '\n\n' +
      'Transaction ID:\n' + txid + '\n\n' +
      'Check it here: https://solscan.io/tx/' + txid + '\n\n' +
      'Status is now "' + STATUS_AWAITING + '". After you confirm the money arrived, change it to "Paid" in the sheet.\n' +
      'Open the Google Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    );
  } catch (mailErr) {
    console.error('Email alert failed: ' + mailErr);
  }

  return reply({ result: 'success' });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Finds the "Members" tab (creates it if missing) and adds the header row if the tab is empty. */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0B0C0D').setFontColor('#C8FF1F');
    sheet.setFrozenRows(1);
    // Keep these columns as plain text so phone numbers, dates and transaction IDs are never changed.
    [COL.TIME, COL.PHONE, COL.START, COL.TXID, COL.TXTIME].forEach(function (c) {
      sheet.getRange(2, c, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    // Status dropdown, so you can change it to "Paid" with one click.
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_LIST, true).setAllowInvalid(true).build();
    sheet.getRange(2, COL.STATUS, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
    sheet.autoResizeColumns(1, HEADERS.length);
  }
  return sheet;
}

/** PF-1001, PF-1002, ... The next number after the highest one already in the sheet. */
function nextMemberId(sheet) {
  var last = sheet.getLastRow();
  var highest = FIRST_ID_NUMBER - 1;
  if (last >= 2) {
    var ids = sheet.getRange(2, COL.ID, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var m = /^PF-(\d+)$/.exec(String(ids[i][0]));
      if (m && Number(m[1]) > highest) highest = Number(m[1]);
    }
  }
  return 'PF-' + (highest + 1);
}

/** Emails the script owner (your own Google account, found automatically). */
function sendOwnerEmail(subject, body) {
  var owner = Session.getEffectiveUser().getEmail();   // the account that owns the script
  if (!owner) return;
  MailApp.sendEmail(owner, subject, body);
}

function pakistanNow() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

function digits(value) {
  return String(value === undefined || value === null ? '' : value).replace(/\D/g, '');
}

/** Makes a value safe for an email subject: one line, trimmed, not too long. */
function oneLine(value) {
  return String(value === undefined || value === null ? '' : value).replace(/\s+/g, ' ').trim().substring(0, 80);
}

/** Makes a value safe to store: text only, trimmed, not too long, no spreadsheet formulas. */
function clean(value) {
  if (value === undefined || value === null) return '';
  var text = String(value).trim().substring(0, MAX_LENGTH);
  // A cell that starts with = + - @ could run as a formula. Add a ' so it stays plain text.
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

/** Sends a small JSON answer back to the website. */
function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
