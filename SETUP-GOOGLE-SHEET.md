# How to connect the website to your Google Sheet

This guide is very simple. Take your time. It needs about 10 minutes.
You only do this **one time**.

**What happens in the end:**
- When someone sends the join form, a new row appears in your Google Sheet and you get an email.
- When they paste their payment transaction ID, the script **checks the Solana blockchain by itself**.
  If the right amount of USDT really arrived in your wallet, the row becomes **Paid**. You get an email.

---

## Already set up the sheet before? Do only these 4 things

1. Copy the new `google-apps-script.gs` into Apps Script (see **Step 3**). Save.
2. Run **setupAutoCheck** once and click **Allow** (see **Step 7**).
3. Deploy a **new version** with the **same web address** (see **Updating the script**, near the end).
4. Do a test payment (see **Step 8**).

Your old rows stay as they are. New columns are added at the end by themselves:
**Check Result**, **Received USDT** and **Check Time**, and two **hidden** columns,
**Join Time (UTC ms)** and **TxID Time (UTC ms)**.

The hidden columns hold the exact moment as a plain number, so the time zone of your sheet can never confuse the
"sent after joining" check. Please do not delete them. (Old rows without these numbers still work: their Pakistan time text is read as Pakistan time.)

---

## Before you start

You need:
- A Google account (Gmail)
- The website folder `gym-website` on your computer

---

## Step 1: Make a new Google Sheet

1. Open your browser and go to **https://sheets.google.com**
2. Click the big **+ (Blank spreadsheet)** button.
3. At the top left, click "Untitled spreadsheet" and change the name to **Pulse Forge Members**.

You do not need to make any tabs or headings. The script does that for you.

---

## Step 2: Open the Apps Script editor

1. In your new sheet, click the menu **Extensions**.
2. Click **Apps Script**.
3. A new tab opens. It shows a file named `Code.gs` with a little code.

> Important: open Apps Script **from inside the sheet** (like above). Do not go to script.google.com directly.

---

## Step 3: Paste the script

1. On your computer, open the file **`google-apps-script.gs`** (in the website folder). You can open it with Notepad.
2. Press **Ctrl + A** (select all), then **Ctrl + C** (copy).
3. Go back to the Apps Script tab and click inside the code box.
4. Press **Ctrl + A** (this selects the old code), then **Ctrl + V** (this replaces it with ours).
5. Click the **Save** button (little disk icon) or press **Ctrl + S**.

---

## Step 4: Give permission (run it once)

1. At the top, find the drop-down list that shows a function name. Choose **setupSheets**.
2. Click **Run**.
3. A box says **"Authorization required"**. Click **Review permissions**.
4. Choose your Google account.
5. You may see **"Google hasn't verified this app"**. This is normal, because you made the script yourself.
   - Click **Advanced**.
   - Click **Go to (your project name) (unsafe)**.
   - Click **Allow**. (It asks to use your sheet, send email to you, connect to an external service
     and run while you are away. All are needed: the "external service" is the Solana blockchain,
     and "run while you are away" is the 5-minute payment check.)
6. Go back to your Google Sheet. At the bottom you should see a tab called **Members** with a heading row.

---

## Step 5: Make it a web app (the "post box")

1. In the Apps Script tab, click the blue **Deploy** button (top right).
2. Click **New deployment**.
3. Click the little **gear icon** next to "Select type" and choose **Web app**.
4. Fill in like this:
   - **Description:** `Pulse Forge members`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
5. Click **Deploy**.
6. Copy the **Web app URL**. It looks like this:
   `https://script.google.com/macros/s/AKfycb.........../exec`

> Why "Anyone"? Visitors of your website are not logged in to Google. "Anyone" only lets them **send** a form. They can **not** see your sheet. Your sheet stays private.

---

## Step 6: Put the web address in the website

1. In the website folder, open **`js/config.js`** with Notepad (or VS Code).
2. Find this line:
   ```js
   const SHEET_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE";
   ```
3. Replace the text between the quotes with your web app URL.
4. Save the file.

---

## Step 7: Turn on the automatic payment check (run it once)

Sometimes the blockchain needs a little time. The script then checks the payment again **every 5 minutes**.
You turn this on one time:

1. Go to the Apps Script tab.
2. In the drop-down list at the top (where you chose `setupSheets` before), choose **setupAutoCheck**.
3. Click **Run**.
4. If Google asks for permission again, click **Review permissions** > your account > **Advanced** > **Go to ... (unsafe)** > **Allow**.
5. At the bottom you see the "Execution log". It should say: **"Done! The automatic payment check runs every 5 minutes..."**

To see that it is on: click the **clock icon (Triggers)** on the left. You should see `recheckAwaitingPayments`, "Time-based", every 5 minutes.

> You can run setupAutoCheck again any time. It never makes two timers.

---

## Step 8: Test it

1. Open **`index.html`** in your browser, then go to **Membership**.
2. Fill in the form with test details (a made-up phone number like `0300-1234567` is fine) and press **Send form**.
3. Check your Google Sheet. A new row should appear with a Member ID like **PF-1001** and Status **Pending**.
4. Check your Gmail. You should have an email: "New member PF-1001".
5. On the payment screen you will see the amount. While `TEST_MODE` is `true`, the amount is always **1.00 USDT**.
6. Send **1.00 USDT on the Solana network** to the wallet address.

   > **Important: send the test payment from a normal wallet app such as Phantom or Trust Wallet. Do not send it from Binance (or another exchange).**
   > Exchanges often show their own "internal" ID instead of the real blockchain transaction ID, so the check cannot find it.

7. In your wallet app, open the payment and copy the **transaction ID** (Phantom: tap the payment > "View on Solscan" > copy the long ID at the top. You can also paste the whole Solscan link.)
8. Paste it in the box on the website and press **Submit**. You see "Checking the blockchain..." and then one of:
   - **Payment confirmed** (with a little celebration). The row now says **Paid**. You get an email.
   - **Still waiting for the blockchain.** The row says **Awaiting check**. Wait 5 to 10 minutes; it becomes **Paid** by itself. (After 2 hours without an answer it becomes **Needs manual check**.)
   - **Payment problem: [reason].** The row says **Rejected** and the reason is in **Check Result**.
9. Try pasting the **same** transaction ID for a second test member. It must say **Already used**. That is correct.

> If you only want to look at the payment screen before the sheet is ready, open `membership.html?demo=1`. It pretends the form was sent and does **not** save anything.

---

## How payments work (please read)

1. The member sends the join form. Your sheet gets a row with Status **Pending**.
2. The member sends USDT from their own crypto app, on the **Solana** network, to the wallet address in `js/config.js`.
3. The member pastes the **transaction ID (TxID)** on the website. The row shows the TxID and Status **Awaiting check**.
4. **The script looks up the TxID on the Solana blockchain.** It marks the row **Paid** only if ALL of these are true:
   - the transaction exists and it succeeded
   - the token is **USDT**, and it went into **your wallet**
   - your wallet received **at least the amount** in the "USDT Amount" column (up to 0.01 USDT short is OK)
   - the payment was made **after** the member joined (so an old payment cannot be used again)
   - the TxID is **not already used** in another row
5. What each Status means:

| Status | Meaning | What you do |
|---|---|---|
| **Pending** | Joined, no TxID yet | Nothing, wait for the member |
| **Awaiting check** | Not on the blockchain yet. Checked again every 5 minutes | Nothing, wait |
| **Paid** | Money really arrived. Column "Received USDT" shows how much | Welcome the member! |
| **Rejected** | Something is wrong. The reason is in **Check Result** (for example "Amount too low", "Wrong wallet", "Not USDT", "Already used", "Sent before joining", "Transaction failed", "Not a valid transaction ID") | The member was asked to contact you on WhatsApp. Talk to them |
| **Needs manual check** | Still not found after **2 hours**, or the check could not decide | Check it yourself on **https://solscan.io** (link in the email), then set Paid or Rejected |

You get an email for every **Paid**, **Rejected** and **Needs manual check**. If an email ever fails, the sheet is still updated.
You can always change the Status by hand with the drop-down.

**Good to know**
- The QR code holds only the wallet address, not the amount. Members must type the exact amount shown on the screen.
- The wallet address in `js/config.js` and `google-apps-script.gs` is public. That is fine, it is only a place to **receive** money. Never put a secret phrase or private key anywhere in this website.
- If you ever change your wallet, change it in **both** files: `js/config.js` (WALLET_ADDRESS) and `google-apps-script.gs` (WALLET_ADDRESS).

---

## If the blockchain check is slow or keeps failing (RPC_URL)

The script talks to the blockchain through a free public address (`https://api.mainnet-beta.solana.com`).
It is sometimes busy. Then rows stay **Awaiting check** for a long time, and **Check Result** says "Could not reach the blockchain".

The fix: get a free address from a provider (for example **Helius**, **QuickNode** or **Alchemy**; make a free account and copy your "Solana mainnet RPC URL").
That address often contains a secret key, so **do not put it in the script file** (the file is public on GitHub). Put it in Script Properties instead:

1. In Apps Script, click the **gear icon (Project Settings)** on the left.
2. Scroll down to **Script Properties** and click **Add script property**.
3. **Property:** `RPC_URL`
4. **Value:** your provider's address (it starts with `https://`)
5. Click **Save script properties**.

That is all. No new deployment is needed. To go back to the free public address, delete the `RPC_URL` property.

---

## Going live (turn off test mode)

1. Open **`js/config.js`**.
2. Change `const TEST_MODE = true;` to `const TEST_MODE = false;`
3. Save. Now the real amount is asked (total in rupees divided by the live USDT price, rounded up to 2 decimals).
4. The live price comes from CoinGecko. If it cannot be loaded, the website uses `FALLBACK_RATE_PKR` (278). Update that number sometimes so it stays close to the real price.

---

## Updating the script (keep the same web address)

After you paste new code into Apps Script, the website still uses the **old** version until you deploy again.
Do it like this, so the web address in `js/config.js` does **not** change:

1. Paste the new code and press **Ctrl + S** (save).
2. Click **Deploy** > **Manage deployments** (NOT "New deployment").
3. On the left, your deployment is selected. Click the **pencil (edit)** icon at the top right.
4. Under **Version**, open the list and choose **New version**.
5. Click **Deploy**, then **Done**.

The web app URL stays exactly the same. You do not need to change `js/config.js`.

> If you click "New deployment" by mistake, you get a **new** URL. Then either paste that new URL into `js/config.js`, or go back and use "Manage deployments" as above.

---

## Something not working?

| Problem | What to try |
|---|---|
| The form says "not connected yet" | `SHEET_URL` in `js/config.js` is still the placeholder. Paste your web app URL. |
| "Sorry, we could not send your form" | Check the URL ends with `/exec`. Check Step 5 says **Who has access: Anyone**. Deploy again as a **New version**. |
| No row appears in the sheet | Make sure you made the script from **Extensions > Apps Script inside the sheet** (Step 2). |
| No email arrives | Look in Spam. The row is still saved even when the email fails. Run `setupSheets` again and allow access. |
| "Not a valid transaction ID" | The member pasted something that is not a real Solana transaction ID (for example a wallet address). They can copy the ID again and send it again. |
| "Sent before joining" for a payment made after joining | Update to the newest script (Step 3 and "Updating the script"). The newest script compares exact numbers, not time-zone text. |
| "Already used" | Another row already has that TxID. Check Result shows which member ID. |
| Rows stay "Awaiting check" for a long time | Look at **Check Result**. If it says "Could not reach the blockchain", add **RPC_URL** (see above). Also check the timer is on (clock icon > Triggers). |
| "Payment problem: Not USDT" or "Wrong wallet" | The money was sent as a different token, or to a different address. Look at the TxID on solscan.io. |
| A test payment from Binance is not found | Exchanges often give an internal ID. Send test payments from Phantom or Trust Wallet. |
| The website shows the old behaviour | You did not deploy a **new version**. See "Updating the script". |
| Error "You do not have permission to call UrlFetchApp" | Run **setupAutoCheck** once in the editor and click **Allow**, then deploy a new version. |
| The QR code does not show | The QR library comes from the internet. Check your connection. The wallet address and Copy button still work. |

---

## Safety notes

- This is a **demo website**. Test with small amounts first.
- Your **email address is not written anywhere** in the website files. The script finds your account by itself, so it is safe to put the files on GitHub.
- The web app URL is not secret, but do not share your Google Sheet link.
