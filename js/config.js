/* ------------------------------------------------------------------
   Pulse Forge Fitness - settings
   This is the ONLY file you need to edit after the Google Sheet setup.
   See SETUP-GOOGLE-SHEET.md for the steps.
------------------------------------------------------------------- */

// Your USDT (Solana network) receiving address. This is public by design.
const WALLET_ADDRESS = "27dk1KWq6wEPDBk8y7Ugw2XDf8AnKJipe7jSPrHGBaQy";

// Used only when the live price (CoinGecko) cannot be loaded.
// PKR for 1 USDT.
const FALLBACK_RATE_PKR = 278;

// true  = every payment asks for exactly 1.00 USDT (for testing).
// false = the real amount is asked. Change to false when you are ready to go live.
const TEST_MODE = true;

// Paste your Google Apps Script "Web app" address between the quotes.
// It looks like: https://script.google.com/macros/s/AKfycb.../exec
const SHEET_URL = "https://script.google.com/macros/s/AKfycbxtaowATwxiPTDhmrEaiDX1Qc58ihILmLgSoEgKGRMsxkwKRMdzB1FzszX5JxZGraJI/exec";

// Prices (Pakistani rupees)
const ADMISSION_FEE_PKR = 2000;   // one time
const MONTHLY_FEE_PKR = 5000;     // per month

// Shown on the website
const PHONE_TEXT = "0300 0000000";
