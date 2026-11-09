[简体中文](README.md) · **English**

# DKU Annual Eat 🍚

**A whole year of meals, one story worth sharing.**

Your campus card may know your dining habits better than you do. Which counter do you visit most? What was your biggest purchase? And what kind of diner have you become this year?

DKU Annual Eat turns your Duke Kunshan University campus card transactions into a playful spending report. **Eat TI** adds dining characters matched to your habits.

[**Download the latest version**](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

## Report contents

- **Spending report:** Monthly trends, favorite dining counters, meal times, individual purchase amounts, and unexpected fun facts.
- **Eat TI characters:** Discover up to six characters from a collection of 25, matched to your actual dining habits.
- **Save and share:** View reports by year, month, or custom date range. Export cards, long images, or HTML web pages, and print reports as PDF files. Saved reports are available offline.

## Installation and usage

**Step 1: Download and extract.** Get the ZIP archive for your computer from the [Releases page](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest), then extract the entire archive.

| Computer | ZIP filename suffix | File to double-click |
| --- | --- | --- |
| 64-bit Windows computer | `win-x64.zip` | `启动.cmd` |
| Mac with Apple silicon | `mac-arm64.zip` | `启动.command` |
| Mac with an Intel processor | `mac-x64.zip` | `启动.command` |

**Step 2: Launch the tool.** The download already includes the Node.js runtime, so you do not need to install Node.js or run `npm install`. Windows uses **Google Chrome or Microsoft Edge**. The Mac `1.2.0-beta.1` beta also offers Safari.

**Step 3: Collect data and open your report.** Choose a date range in the tool, click **Collect new data**, and complete the school's single sign-on (SSO) and multi-factor authentication (MFA) in the dedicated browser window. Open your report after collection finishes.

<details>
<summary><strong>Mac security warning on first launch?</strong></summary>

Mac computers require **macOS 13.5 or later**.

Download and fully extract the archive from this project's Releases page, then open `启动.command`. If macOS displays a security warning, go to **System Settings → Privacy & Security** and choose **Open Anyway** for the file. If the same warning appears for `runtime/node`, follow the same steps and launch the tool again.

[Official Apple instructions](https://support.apple.com/102445)

</details>

<details>
<summary><strong>Collecting with Safari</strong></summary>

Safari collection is available starting with the [v1.2.0-beta.1 beta](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.2.0-beta.1). Choose a browser in the Mac tool page. Safari is selected automatically when Chrome and Edge are unavailable.

1. In Safari Settings → Advanced, show features for web developers. Then enable Allow JavaScript from Apple Events in Developer settings.
2. Start collection and allow the launching app shown in the macOS prompt to control Safari, usually Terminal. Manage this consent in System Settings → Privacy & Security → Automation.
3. Complete school SSO and MFA in the new Safari window. Keep its original single tab open during collection.

The tool uses the built-in macOS AppleScript/JXA interface and checks the tool-created window and campus domain before collecting records. Each Mac package includes bilingual instructions and the `安全性设置方法.png` illustrated guide. Safari permission prompts, school sign-in, and image exports still need verification on a physical Mac.

</details>

## Data and updates

Your campus card records are collected and analyzed on your computer. Your records, reports, and dedicated Chrome / Edge session are saved in the `private/` folder. Safari manages its own sign-in state. Share only the program files, and keep `private/` on your own computer. Exported HTML reports include transaction details, so choose what to share.

**Updating to a new version:** Click **Exit tool** in the old version and back up the `private/` folder. Extract the new archive into a **separate folder**, copy the old `private/` folder into the new version, and then launch the new version.

---

The project concept draws on [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat), with visual colors inspired by [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) and [DKU Note](https://github.com/EricZQu/DKU-Note-Template). The code is released under the [MIT License](LICENSE).
