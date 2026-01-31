# ZXS CloudMoon Proxy Tester

This is a local testing environment for the CloudMoon bypass proxy analyzed from the ZXS repository.

## 🚀 How to Start

### 1. Run a Local Server
Service Workers (required for the proxy) only work over **HTTPS** or **localhost**. To run this locally:

**Option A: Using Python (Recommended for fast tests)**
Open PowerShell in this folder and run:
```powershell
python -m http.server 8080
```
Then visit `http://localhost:8080`

**Option B: Using Node.js**
```bash
npx serve .
```

### 2. Manual Steps for Deployment
To use this "in the wild" (e.g., to bypass a school/work filter):
1. **Host it on a neutral domain**: Upload these files to **GitHub Pages**, **Vercel**, or **Netlify**.
2. **Find a Wisp Server**: The proxy relies on a "Wisp" backend to tunnel traffic. 
   - Current default: `wss://anura.pro/`
   - If it stops working, you can find other public Wisp servers or host your own using [Anura](https://github.com/MercuryWorkshop/anura-web).
3. **Use the Stealth Launch**:
   - Enter `https://cloudmoonapp.com` in the input box.
   - Click **Launch Stealth Instance**.
   - The site will load inside a proxied iframe that hides its origin from the network filter.

## 🛠️ Performance Tips
- Cloud gaming requires low latency. If it feels laggy, try a different Wisp server geographically closer to you.
- Use **Incognito mode** if you encounter cache issues with the Service Worker.
