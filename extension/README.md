# PrivyVision Chromium Browser Extension (Manifest V3)
**SIH26171: On-device Visual Perception for Lightweight Browser Agents**

---

## 🚀 Quick Install (Load Unpacked)

1. Open your Chromium-based browser:
   - **Google Chrome**: navigate to `chrome://extensions/`
   - **Microsoft Edge**: navigate to `edge://extensions/`
   - **Brave**: navigate to `brave://extensions/`
2. In the top-right corner, enable **Developer mode**.
3. Click the **Load unpacked** button.
4. Select the directory:
   ```
   C:\Users\HP\OneDrive\Desktop\ISRO\extension
   ```
5. **PrivyVision** will appear in your browser extension toolbar! Pin it for quick access.

---

## 🛠️ Features Included

1. **Minimum Permissions (Manifest V3)**:
   - `activeTab`: inspects the currently open tab only when requested.
   - `scripting`: injects the lightweight local perception content script.
   - `storage`: records client-side telemetry (latencies, grounded counts, redactions).
   - Zero background data exfiltration or invasive permissions.

2. **Local Perception Engine (`contentScript.js`)**:
   - Detects buttons, inputs, links, checkboxes, dropdowns, images, and dialogs.
   - Computes viewport bounding boxes `(x, y, w, h)`.
   - Extracts OCR text and accessible labels.

3. **9-Category Local Privacy Firewall**:
   - Detects Email, Phone, Password, Government IDs (Aadhaar, PAN, SSN), Bank/Card numbers, DOB, Address, API Keys, and Faces.
   - Masked with semantic tokens before any network call.

4. **Local Action Executor**:
   - Dispatches synthetic browser events (`click`, `fill`, `check`) locally inside the active page.

5. **In-Page Visual Bounding Box Overlays**:
   - Toggle on high-contrast overlays directly on any website across the internet!

6. **Controlled Simulator vs. Live Extension**:
   - **Live Extension**: Works on any live website across the internet.
   - **React Dashboard (`http://localhost:5173`)**: Full studio environment with the interactive SpaceOps portal, testing suite, and leak scanner gate.
