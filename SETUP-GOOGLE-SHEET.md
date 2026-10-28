# How to connect the website to your Google Sheet

This guide is very simple. Take your time. It needs about 10 minutes.
You only do this **one time**.

**What happens in the end:**
- When someone sends the join form, a new row appears in your Google Sheet and you get an email.
- When they paste their payment transaction ID, the same row is updated and you get another email.

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
   - Click **Allow**. (It asks to use your sheet and to send email to you. Both are needed.)
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

## Step 7: Test it

1. Open **`index.html`** in your browser, then go to **Membership**.
2. Fill in the form with test details (a made-up phone number like `0300-1234567` is fine) and press **Send form**.
3. Check your Google Sheet. A new row should appear with Member ID **PF-1001** and Status **Pending**.
4. Check your Gmail. You should have an email: "New member PF-1001".
5. On the payment screen you will see the amount. While `TEST_MODE` is `true`, the amount is always **1.00 USDT**.
6. (Optional) Paste a real Solana transaction ID in the box and press **Submit**. The row changes to **Awaiting check**, and you get a second email.
7. Try pasting the **same** transaction ID for a second test member. It must be refused. That is correct.

> If you only want to look at the payment screen before the sheet is ready, open `membership.html?demo=1`. It pretends the form was sent and does **not** save anything.

---

## How payments work (please read)

1. The member sends the join form. Your sheet gets a row with Status **Pending**.
2. The member sends USDT from their own crypto app, on the **Solana** network, to the wallet address in `js/config.js`.
3. The member pastes the **transaction ID (TxID)** on the website. Your sheet shows the TxID and Status **Awaiting check**.
4. **You check the payment yourself.** The website cannot see the blockchain.
   - Copy the TxID from the sheet.
   - Open **https://solscan.io** and paste it in the search box (or use the link in the email).
   - Check that: it says **Success**, the token is **USDT**, the receiver is **your wallet**, and the amount matches the **USDT Amount** column.
5. If everything is right, change the Status cell to **Paid** (use the drop-down). If not, choose **Rejected**.

**Good to know**
- The QR code holds only the wallet address, not the amount. Members must type the exact amount shown on the screen.
- Anyone can send money to a wallet. Always check the amount and the token before you mark **Paid**.
- The wallet address in `js/config.js` is public. That is fine, it is only a place to **receive** money. Never put a secret phrase or private key anywhere in this website.

---

## Going live (turn off test mode)

1. Open **`js/config.js`**.
2. Change `const TEST_MODE = true;` to `const TEST_MODE = false;`
3. Save. Now the real amount is asked (total in rupees divided by the live USDT price, rounded up to 2 decimals).
4. The live price comes from CoinGecko. If it cannot be loaded, the website uses `FALLBACK_RATE_PKR` (278). Update that number sometimes so it stays close to the real price.

---

## If you change the script later

After you change anything in `google-apps-script.gs`, you must **deploy again**, or the website keeps using the old version:

1. In Apps Script click **Deploy** > **Manage deployments**.
2. Click the **pencil (edit)** icon.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

The web app URL stays the same.

---

## Something not working?

| Problem | What to try |
|---|---|
| The form says "not connected yet" | `SHEET_URL` in `js/config.js` is still the placeholder. Paste your web app URL. |
| "Sorry, we could not send your form" | Check the URL ends with `/exec`. Check Step 5 says **Who has access: Anyone**. Deploy again as a **New version**. |
| No row appears in the sheet | Make sure you made the script from **Extensions > Apps Script inside the sheet** (Step 2). |
| No email arrives | Look in Spam. The row is still saved even when the email fails. Run `setupSheets` again and allow access. |
| "This transaction ID was already used" | Another row already has that TxID. Check the ID, or look in the sheet. |
| The QR code does not show | The QR library comes from the internet. Check your connection. The wallet address and Copy button still work. |

---

## Safety notes

- This is a **demo website**. Test with small amounts first.
- Your **email address is not written anywhere** in the website files. The script finds your account by itself, so it is safe to put the files on GitHub.
- The web app URL is not secret, but do not share your Google Sheet link.
