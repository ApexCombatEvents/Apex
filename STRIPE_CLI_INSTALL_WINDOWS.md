# Installing Stripe CLI on Windows

## Quick Installation Steps

### Option 1: Direct Download (Easiest)

1. **On the GitHub releases page you're viewing:**
   - Scroll down to the "Assets" section
   - Look for a file named: `stripe_1.34.0_windows_x86_64.zip` (or similar)
   - Click to download it

2. **Extract the ZIP file:**
   - Extract to a folder (e.g., `C:\stripe-cli\`)
   - You'll find `stripe.exe` inside

3. **Add to PATH (so you can use `stripe` command anywhere):**
   - Press `Win + X` and select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   - Under "User variables", find "Path" and click "Edit"
   - Click "New" and add the folder path where you extracted stripe.exe (e.g., `C:\stripe-cli\`)
   - Click "OK" on all dialogs

4. **Verify installation:**
   - Open a new PowerShell or Command Prompt
   - Run: `stripe --version`
   - You should see the version number

### Option 2: Using Scoop (Package Manager)

If you have Scoop installed:

```powershell
scoop install stripe
```

### Option 3: Using Chocolatey (Package Manager)

If you have Chocolatey installed:

```powershell
choco install stripe-cli
```

---

## After Installation

1. **Login to Stripe:**
   ```bash
   stripe login
   ```
   This will open your browser to authenticate.

2. **Test it works:**
   ```bash
   stripe --version
   ```

3. **Start webhook forwarding:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

---

## Troubleshooting

**If `stripe` command not found:**
- Make sure you added the folder to PATH
- Close and reopen your terminal
- Try using the full path: `C:\stripe-cli\stripe.exe --version`

**If download fails:**
- Try a different browser
- Check your antivirus isn't blocking it
- Download from: https://github.com/stripe/stripe-cli/releases/latest

