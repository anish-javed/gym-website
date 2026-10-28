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
 *    Then it looks the transaction up on the Solana blockchain (automatic payment check):
 *      Paid               -> the right amount of USDT really arrived in the gym wallet
 *      Rejected           -> something is wrong; the reason is written in "Check Result"
 *      Awaiting check     -> not on the blockchain yet; checked again every 5 minutes
 *      Needs manual check -> still not found after 2 hours; please check it yourself
 *    A transaction ID that is already used in another row is rejected ("Already used").
 *    A text that is not a real transaction ID is rejected at once ("Not a valid transaction ID").
 *  - Times: the readable times in the sheet are Pakistan time (text). For the checks, the script
 *    uses two hidden number columns (the exact moment in milliseconds since 1970, UTC), so time
 *    zones can never cause a wrong "Sent before joining".
 *  - After a row is saved, an email alert goes to the script owner (your own Google account,
 *    found automatically - no email address is written in this file).
 *    If the email fails, the row is still saved.
 *
 * Run setupAutoCheck() once from the editor to turn on the 5-minute re-check.
 * The blockchain address (RPC) can be changed in Project Settings > Script Properties > RPC_URL,
 * so a private key/link never has to be written in this public file.
 *
 * Steps to install are in SETUP-GOOGLE-SHEET.md.
 * IMPORTANT: create this script from INSIDE your Google Sheet:
 *            Extensions > Apps Script.
 */

var TIME_ZONE = 'Asia/Karachi';      // Pakistan time (UTC+05:00, no summer time)
var PAKISTAN_OFFSET_MS = 5 * 3600 * 1000;
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
  'TxID Time (Pakistan time)',       // P
  'Check Result',                    // Q
  'Received USDT',                   // R
  'Check Time (Pakistan time)',      // S
  'Join Time (UTC ms)',              // T (hidden) exact join moment, used for the checks
  'TxID Time (UTC ms)'               // U (hidden) exact moment the TxID was sent, used for the give-up time
];
var COL = {
  ID: 1, TIME: 2, NAME: 3, PHONE: 4, GENDER: 5, TRAINER: 6, MONTHS: 7, START: 8, TOTAL: 9,
  USDT: 10, TEST: 11, RATE: 12, CONSENT: 13, STATUS: 14, TXID: 15, TXTIME: 16,
  RESULT: 17, RECEIVED: 18, CHECKTIME: 19, JOINMS: 20, TXMS: 21
};

var STATUS_PENDING = 'Pending';
var STATUS_AWAITING = 'Awaiting check';
var STATUS_PAID = 'Paid';
var STATUS_REJECTED = 'Rejected';
var STATUS_MANUAL = 'Needs manual check';
var STATUS_LIST = ['Pending', 'Awaiting check', 'Paid', 'Rejected', 'Needs manual check'];   // dropdown in the Status column

/* ---------- Payment check settings ---------- */
// Your wallet (the one in js/config.js) and the official USDT token on Solana.
var WALLET_ADDRESS = '27dk1KWq6wEPDBk8y7Ugw2XDf8AnKJipe7jSPrHGBaQy';
var USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
// Free public Solana address. To use another provider, add RPC_URL in Script Properties instead.
var DEFAULT_RPC_URL = 'https://api.mainnet-beta.solana.com';
var TOLERANCE_USDT = 0.01;           // a payment may be up to 0.01 USDT short
var TIME_GRACE_SECONDS = 60;         // blockchain clocks can be a few seconds off
var GIVE_UP_HOURS = 2;               // after this, "Needs manual check"
var MAX_RUN_MS = 4 * 60 * 1000;      // a 5-minute re-check run stops after 4 minutes

/** Receives the data sent by the website. */
function doPost(e) {
  try {
    var p = (e && e.parameter) ? e.parameter : {};

    // Spam robots fill the hidden "company_website" field. Pretend all is well, save nothing.
    if (p.company_website) return reply({ result: 'success', memberId: 'PF-0000' });

    // If two people press Send at the same moment, they wait in line (no mixed-up rows).
    // The payment check locks the sheet only while writing, so a slow blockchain never blocks others.
    if (p.action === 'join') return withLock(function () { return handleJoin(p); });
    if (p.action === 'txid') return handleTxid(p);
    return reply({ result: 'error', message: 'Unknown action.' });
  } catch (err) {
    return reply({ result: 'error', message: 'Something went wrong. Please try again.' });
  }
}

/** Runs fn while holding the script lock (one change to the sheet at a time). */
function withLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return fn();
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
  var joinedAt = new Date();
  var timestamp = pakistanNow(joinedAt);

  var row = [];
  for (var c = 0; c < HEADERS.length; c++) row.push('');
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
  row[COL.JOINMS - 1] = joinedAt.getTime();      // the exact moment, a plain number (no time zone)

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

  // Step 1 (sheet locked): find the row, run the simple checks, save the TxID as "Awaiting check".
  var prep = withLock(function () { return saveSubmittedTxid(memberId, txid, phone); });
  if (prep.error) return reply({ result: 'error', message: prep.error });
  if (prep.outcome) {                       // already used in another row: rejected straight away
    notifyOwner(prep.member, txid, prep.outcome, true);
    return outcomeReply(prep.outcome);
  }

  // Step 2 (sheet NOT locked): ask the blockchain. This can take a few seconds.
  var outcome = checkPayment(txid, prep.member.expectedUsdt, prep.member.joinMs);

  // Step 3 (sheet locked again): save the result and email the owner.
  var saved = saveOutcome(memberId, txid, outcome, true);
  return outcomeReply(saved || outcome);
}

/**
 * Saves a newly submitted transaction ID on the member's row.
 * Returns { error } for a problem the member can fix, { member, outcome } when the TxID
 * is already used in another row (row is set to Rejected), or { member } when the check can start.
 */
function saveSubmittedTxid(memberId, txid, phone) {
  var sheet = getSheet();
  var found = findMember(sheet, memberId);
  if (!found) return { error: 'We could not find that member ID.' };
  var row = found.row;

  // Extra check so nobody can attach a payment to somebody else's ID: the phone must match.
  if (digits(row[COL.PHONE - 1]).slice(-10) !== digits(phone).slice(-10)) {
    return { error: 'We could not match this member ID. Please call us.' };
  }

  if (String(row[COL.STATUS - 1]) === STATUS_PAID) return { error: 'This membership is already confirmed. Thank you!' };

  var member = memberInfo(row);
  var now = new Date();
  var timestamp = pakistanNow(now);

  // A transaction ID can be used only once. Do not copy it into this row (the other row keeps it).
  var usedBy = usedInOtherRow(found.values, found.index, txid);
  if (usedBy) {
    writeCells(sheet, found.sheetRow, [
      [COL.STATUS, STATUS_REJECTED],
      [COL.RESULT, 'Already used (same TxID as ' + usedBy + ')'],
      [COL.RECEIVED, ''],
      [COL.CHECKTIME, timestamp]
    ]);
    SpreadsheetApp.flush();
    return { member: member, outcome: { state: 'rejected', reason: 'Already used' } };
  }

  // A new TxID starts a new 2-hour waiting time. The same TxID again just checks again.
  var cells = [
    [COL.STATUS, STATUS_AWAITING],
    [COL.RESULT, 'Checking the blockchain...'],
    [COL.CHECKTIME, timestamp]
  ];
  if (String(row[COL.TXID - 1]) !== txid) {
    cells.push([COL.TXID, txid], [COL.TXTIME, timestamp], [COL.TXMS, now.getTime()], [COL.RECEIVED, '']);
  }
  writeCells(sheet, found.sheetRow, cells);
  SpreadsheetApp.flush();     // saved
  return { member: member };
}

/** The website's answer: status is "paid", "rejected", "waiting" or "manual". */
function outcomeReply(o) {
  return reply({
    result: 'success',
    status: o.state,
    reason: o.reason || '',
    received: (o.received === undefined || o.received === null) ? '' : o.received
  });
}

/* ------------------------------------------------------------------ */
/* AUTOMATIC PAYMENT CHECK (Solana blockchain)                         */
/* ------------------------------------------------------------------ */

/**
 * Looks the transaction up on the blockchain and decides.
 * expectedUsdt: the amount the member was asked to pay. joinMs: when they joined (milliseconds).
 * Returns { state: 'paid' | 'rejected' | 'waiting' | 'manual', reason, received }.
 */
function checkPayment(txid, expectedUsdt, joinMs) {
  var tx;
  try {
    tx = rpcCall('getTransaction', [txid, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }]);
  } catch (err) {
    // Solana says the text is not a valid transaction ID ("Invalid param ..."): no need to wait.
    if (err.rpcCode === -32602 || /invalid param/i.test(String(err.message))) {
      return { state: 'rejected', reason: 'Not a valid transaction ID', received: 0 };
    }
    return { state: 'waiting', reason: 'Could not reach the blockchain (' + oneLine(err.message) + ')' };
  }

  // Not on the blockchain yet (or not confirmed yet). Try again later.
  if (!tx || !tx.meta || !tx.blockTime) return { state: 'waiting', reason: 'Not found yet' };

  // The transaction must have succeeded.
  if (tx.meta.err !== null && tx.meta.err !== undefined) return { state: 'rejected', reason: 'Transaction failed', received: 0 };

  // How much USDT arrived in the gym wallet (raw units: 1 USDT = 1,000,000).
  var changes = tokenChanges(tx.meta);
  var receivedRaw = 0;
  changes.forEach(function (c) {
    if (c.owner === WALLET_ADDRESS && c.mint === USDT_MINT) receivedRaw += c.raw;
  });
  var received = Number((receivedRaw / 1e6).toFixed(6));

  if (receivedRaw <= 0) {
    var otherTokenToUs = changes.some(function (c) { return c.owner === WALLET_ADDRESS && c.mint !== USDT_MINT && c.raw > 0; });
    var usdtToSomeoneElse = changes.some(function (c) { return c.mint === USDT_MINT && c.raw > 0; });
    if (otherTokenToUs) return { state: 'rejected', reason: 'Not USDT', received: 0 };
    if (usdtToSomeoneElse) return { state: 'rejected', reason: 'Wrong wallet', received: 0 };
    return { state: 'rejected', reason: 'Not USDT', received: 0 };
  }

  var expectedRaw = Math.round(Number(expectedUsdt) * 1e6);
  if (!(expectedRaw > 0)) return { state: 'manual', reason: 'Expected USDT amount is missing in the sheet', received: received };
  if (receivedRaw + Math.round(TOLERANCE_USDT * 1e6) < expectedRaw) {
    return {
      state: 'rejected',
      reason: 'Amount too low (received ' + received + ' USDT, expected ' + (expectedRaw / 1e6).toFixed(2) + ' USDT)',
      received: received
    };
  }

  // The payment must be made after joining (stops someone reusing an old payment).
  if (!isFinite(joinMs)) return { state: 'manual', reason: 'Join time in the sheet could not be read', received: received };
  if (tx.blockTime * 1000 < joinMs - TIME_GRACE_SECONDS * 1000) {
    return { state: 'rejected', reason: 'Sent before joining', received: received };
  }

  return { state: 'paid', reason: 'Payment confirmed', received: received };
}

/**
 * Token balance changes in a transaction, from meta.preTokenBalances and meta.postTokenBalances.
 * Returns [{ owner, mint, raw }] where raw = after - before (in the token's smallest unit).
 */
function tokenChanges(meta) {
  var byIndex = {};
  function add(list, sign) {
    (list || []).forEach(function (b) {
      var key = String(b.accountIndex);
      var item = byIndex[key] || (byIndex[key] = { owner: b.owner || '', mint: b.mint || '', raw: 0 });
      if (!item.owner && b.owner) item.owner = b.owner;
      var amount = Number(b.uiTokenAmount && b.uiTokenAmount.amount);
      if (isFinite(amount)) item.raw += sign * amount;
    });
  }
  add(meta.preTokenBalances, -1);
  add(meta.postTokenBalances, 1);
  return Object.keys(byIndex).map(function (k) { return byIndex[k]; });
}

/**
 * Saves a check result on the member's row (only if the row is still waiting for this TxID)
 * and emails the owner on Paid, Rejected or Needs manual check.
 * fromWebsite = true: the member just submitted, so a "still waiting" email is also sent (once per submission).
 * Returns the saved outcome, or null if nothing was saved.
 */
function saveOutcome(memberId, txid, outcome, fromWebsite) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (busy) {
    return null;                  // sheet busy: the row stays "Awaiting check" and the 5-minute check tries again
  }
  var member, saved = null;
  try {
    var sheet = getSheet();
    var found = findMember(sheet, memberId);
    if (!found) return null;
    var row = found.row;
    // Someone may have changed the row in the meantime (for example you marked it Paid by hand).
    if (String(row[COL.TXID - 1]) !== txid || String(row[COL.STATUS - 1]) !== STATUS_AWAITING) return null;

    if (outcome.state === 'paid' && usedInOtherRow(found.values, found.index, txid)) {
      outcome = { state: 'rejected', reason: 'Already used', received: outcome.received };
    }

    var status = { paid: STATUS_PAID, rejected: STATUS_REJECTED, manual: STATUS_MANUAL, waiting: STATUS_AWAITING }[outcome.state];
    var result = outcome.state === 'waiting' ? outcome.reason + ' - checking again every 5 minutes' : outcome.reason;
    var cells = [[COL.STATUS, status], [COL.RESULT, result], [COL.CHECKTIME, pakistanNow()]];
    if (outcome.received !== undefined && outcome.received !== null) cells.push([COL.RECEIVED, outcome.received]);
    writeCells(sheet, found.sheetRow, cells);
    SpreadsheetApp.flush();       // the row is saved from here on
    member = memberInfo(row);
    saved = outcome;
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }

  // Email after the lock is released. If the email fails, the row is still updated.
  if (outcome.state !== 'waiting' || fromWebsite) notifyOwner(member, txid, outcome, fromWebsite);
  return saved;
}

/**
 * Re-checks every "Awaiting check" row. Runs every 5 minutes once you run setupAutoCheck().
 * After 2 hours without an answer, the row becomes "Needs manual check".
 */
function recheckAwaitingPayments() {
  var started = Date.now();
  var sheet = getSheet();
  var last = sheet.getLastRow();
  if (last < 2) return;
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var checked = 0;

  for (var i = 0; i < values.length; i++) {
    if (Date.now() - started > MAX_RUN_MS) break;     // the rest waits for the next run
    var row = values[i];
    if (String(row[COL.STATUS - 1]) !== STATUS_AWAITING) continue;
    var txid = String(row[COL.TXID - 1]).trim();
    if (!txid) continue;

    if (checked > 0) Utilities.sleep(500);            // be gentle with the free blockchain service
    checked++;

    var member = memberInfo(row);
    var outcome = checkPayment(txid, member.expectedUsdt, member.joinMs);
    if (outcome.state === 'waiting') {
      var since = readMoment(row[COL.TXMS - 1], row[COL.TXTIME - 1]);   // exact moment the TxID was sent
      if (!isFinite(since)) since = member.joinMs;
      if (isFinite(since) && Date.now() - since > GIVE_UP_HOURS * 3600 * 1000) {
        outcome = { state: 'manual', reason: 'Not confirmed after ' + GIVE_UP_HOURS + ' hours (last answer: ' + outcome.reason + ')' };
      }
    }
    saveOutcome(member.memberId, txid, outcome, false);
  }
}

/**
 * RUN THIS ONCE from the editor (select "setupAutoCheck" > Run).
 * It turns on the automatic re-check every 5 minutes, adds the new columns to your sheet,
 * and asks you to allow "connect to an external service" (the blockchain).
 * Running it again is safe: it never makes two timers.
 */
function setupAutoCheck() {
  getSheet();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'recheckAwaitingPayments') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('recheckAwaitingPayments').timeBased().everyMinutes(5).create();

  // Quick test that the blockchain can be reached.
  try {
    rpcCall('getSlot', []);
    console.log('Done! The automatic payment check runs every 5 minutes, and the blockchain answered.');
  } catch (err) {
    console.log('The timer is on, but the blockchain did not answer: ' + err.message +
      '. If this keeps happening, add RPC_URL in Script Properties (see SETUP-GOOGLE-SHEET.md).');
  }
}

/** Sends one request to the Solana RPC. Tries once more if the service is busy. */
function rpcCall(method, params) {
  var options = {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    payload: JSON.stringify({ jsonrpc: '2.0', id: 1, method: method, params: params })
  };
  for (var attempt = 1; attempt <= 2; attempt++) {
    var res = UrlFetchApp.fetch(getRpcUrl(), options);
    var code = res.getResponseCode();
    if ((code === 429 || code >= 500) && attempt === 1) { Utilities.sleep(1500); continue; }
    var json = null;
    try { json = JSON.parse(res.getContentText()); } catch (ignore) {}
    if (json && json.error) {
      // Keep Solana's error code, so the caller can tell "invalid transaction ID" from "service busy".
      var rpcErr = new Error('RPC error ' + (json.error.message || json.error.code));
      rpcErr.rpcCode = json.error.code;
      throw rpcErr;
    }
    if (code !== 200 || !json) throw new Error('RPC answered ' + code);
    return json.result;
  }
}

/** The RPC address: Script Properties > RPC_URL if you added one, otherwise the free public one. */
function getRpcUrl() {
  var custom = PropertiesService.getScriptProperties().getProperty('RPC_URL');
  custom = custom ? String(custom).trim() : '';
  return /^https:\/\//.test(custom) ? custom : DEFAULT_RPC_URL;
}

/** Emails the owner about a check result. If the email fails, nothing else is affected. */
function notifyOwner(member, txid, outcome, fromWebsite) {
  if (!member) return;
  try {
    var subject, intro;
    if (outcome.state === 'paid') {
      subject = 'Payment confirmed: ' + member.memberId + ' (' + outcome.received + ' USDT)';
      intro = 'The blockchain check found the payment. Status is now "' + STATUS_PAID + '".';
    } else if (outcome.state === 'rejected') {
      subject = 'Payment rejected: ' + member.memberId + ' - ' + oneLine(outcome.reason);
      intro = 'The blockchain check found a problem. Status is now "' + STATUS_REJECTED + '". The member was asked to contact you.';
    } else if (outcome.state === 'manual') {
      subject = 'Needs manual check: ' + member.memberId;
      intro = 'The automatic check could not decide. Please check this payment yourself, then set the Status to Paid or Rejected.';
    } else if (fromWebsite) {
      subject = 'Transaction ID submitted: ' + member.memberId + ' (waiting for the blockchain)';
      intro = 'A member sent their transaction ID. It is not on the blockchain yet, so it will be checked again every 5 minutes.';
    } else {
      return;
    }
    sendOwnerEmail(subject,
      intro + '\n\n' +
      'Member ID: ' + member.memberId + '\n' +
      'Name: ' + oneLine(member.name) + '\n' +
      'Phone: ' + oneLine(member.phone) + '\n' +
      'Expected USDT: ' + member.expectedUsdt + (member.test ? ' (TEST MODE)' : '') + '\n' +
      'Received USDT: ' + (outcome.received === undefined || outcome.received === null ? '-' : outcome.received) + '\n' +
      'Check result: ' + oneLine(outcome.reason) + '\n' +
      'Time (Pakistan): ' + pakistanNow() + '\n\n' +
      'Transaction ID:\n' + txid + '\n\n' +
      'See it here: https://solscan.io/tx/' + txid + '\n' +
      'Open the Google Sheet: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
    );
  } catch (mailErr) {
    console.error('Email alert failed: ' + mailErr);
  }
}

/** Finds a member's row. Returns { values, index, row, sheetRow } or null. */
function findMember(sheet, memberId) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var values = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][COL.ID - 1]) === memberId) {
      return { values: values, index: i, row: values[i], sheetRow: i + 2 };
    }
  }
  return null;
}

/** The member ID of another row that already has this TxID, or '' if none. */
function usedInOtherRow(values, index, txid) {
  for (var i = 0; i < values.length; i++) {
    if (i !== index && String(values[i][COL.TXID - 1]).trim() === txid) return String(values[i][COL.ID - 1]) || 'another row';
  }
  return '';
}

/** The details of a row that the check and the emails need. */
function memberInfo(row) {
  return {
    memberId: String(row[COL.ID - 1]),
    name: row[COL.NAME - 1],
    phone: row[COL.PHONE - 1],
    expectedUsdt: Number(row[COL.USDT - 1]),
    test: String(row[COL.TEST - 1]) === 'Yes',
    joinMs: readMoment(row[COL.JOINMS - 1], row[COL.TIME - 1])
  };
}

/** Writes several [column, value] pairs on one row. */
function writeCells(sheet, sheetRow, cells) {
  cells.forEach(function (c) { sheet.getRange(sheetRow, c[0]).setValue(c[1]); });
}

/**
 * The exact moment of an event, in milliseconds since 1970 (UTC).
 * Uses the hidden number column when it has a value. Older rows do not have one, so then
 * the Pakistan time text is read instead (see parsePakistanTime).
 */
function readMoment(msValue, pakistanText) {
  var ms = Number(msValue);
  if (msValue !== '' && msValue !== null && msValue !== undefined && isFinite(ms) && ms > 0) return ms;
  return parsePakistanTime(pakistanText);
}

/**
 * "2026-10-27 18:05:00" written in Pakistan time -> milliseconds since 1970 (UTC).
 * The text is always read as UTC+05:00, never in the computer's or the spreadsheet's time zone.
 */
function parsePakistanTime(value) {
  var text;
  if (value instanceof Date) {
    // Google Sheets turned the text into a real date, reading it in the spreadsheet's time zone.
    // Write that date back as the same text the sheet shows, then read that text as Pakistan time.
    text = Utilities.formatDate(value, SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  } else {
    text = String(value || '');
  }
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(text);
  if (!m) return NaN;
  // Date.UTC reads the numbers as UTC, so take away Pakistan's 5 hours to get the true moment.
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)) - PAKISTAN_OFFSET_MS;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/**
 * Finds the "Members" tab (creates it if missing) and adds the header row if the tab is empty.
 * An older sheet (made before the payment check) gets the new columns added automatically.
 */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(TAB_NAME) || ss.insertSheet(TAB_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#0B0C0D').setFontColor('#C8FF1F');
    sheet.setFrozenRows(1);
    // Keep these columns as plain text so phone numbers, dates and transaction IDs are never changed.
    [COL.TIME, COL.PHONE, COL.START, COL.TXID, COL.TXTIME, COL.CHECKTIME].forEach(function (c) {
      sheet.getRange(2, c, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    setStatusDropdown(sheet);
    sheet.getRange(2, COL.JOINMS, sheet.getMaxRows() - 1, 2).setNumberFormat('0');
    sheet.autoResizeColumns(1, HEADERS.length);
    sheet.hideColumns(COL.JOINMS, 2);       // the two exact-time columns stay hidden
  } else if (sheet.getLastColumn() < HEADERS.length) {
    var from = sheet.getLastColumn() + 1;
    sheet.getRange(1, from, 1, HEADERS.length - from + 1).setValues([HEADERS.slice(from - 1)])
      .setFontWeight('bold').setBackground('#0B0C0D').setFontColor('#C8FF1F');
    sheet.getRange(2, COL.CHECKTIME, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
    setStatusDropdown(sheet);     // adds "Needs manual check" to the list
    sheet.getRange(2, COL.JOINMS, sheet.getMaxRows() - 1, 2).setNumberFormat('0');
    sheet.autoResizeColumns(from, HEADERS.length - from + 1);
    sheet.hideColumns(COL.JOINMS, 2);       // the two exact-time columns stay hidden
  }
  return sheet;
}

/** Status dropdown, so you can change it to "Paid" with one click. */
function setStatusDropdown(sheet) {
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_LIST, true).setAllowInvalid(true).build();
  sheet.getRange(2, COL.STATUS, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
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

function pakistanNow(date) {
  return Utilities.formatDate(date || new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
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
