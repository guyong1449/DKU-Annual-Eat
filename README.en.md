[简体中文](README.md) · **English**

# DKU Annual Eat 🍚

**A whole year of meals, one story worth sharing.**

Your campus card may know your dining habits better than you do. Which counter do you visit most? What was your biggest purchase? And what kind of diner have you become this year?

DKU Annual Eat turns your Duke Kunshan University campus card transactions into a playful spending report. **Eat TI** adds dining characters matched to your habits.

[**Download the latest version**](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

## What's in the report?

- **Spending report:** Monthly trends, favorite dining counters, meal times, individual purchase amounts, and unexpected fun facts.
- **Eat TI characters:** Discover up to six characters from a collection of 25, matched to your actual dining habits.
- **Save and share:** View reports by year, month, or custom date range. Export cards, long images, or HTML web pages, and print reports as PDF files. Saved reports are available offline.

## How to install and use it

**Step 1: Download and extract.** Get the ZIP archive for your computer from the [Releases page](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest), then extract the entire archive.

| Computer | ZIP filename suffix | File to double-click |
| --- | --- | --- |
| 64-bit Windows computer | `win-x64.zip` | `启动.cmd` |
| Mac with Apple silicon | `mac-arm64.zip` | `启动.command` |
| Mac with an Intel processor | `mac-x64.zip` | `启动.command` |

**Step 2: Launch the tool.** The download already includes the Node.js runtime, so you do not need to install Node.js or run `npm install`. You must have **Google Chrome or Microsoft Edge** installed.

**Step 3: Collect data and open your report.** Choose a date range in the tool, click **Collect new data**, and complete the school's single sign-on (SSO) and multi-factor authentication (MFA) in the dedicated browser window. Open your report after collection finishes.

<details>
<summary><strong>Mac security warning on first launch?</strong></summary>

Mac computers require **macOS 13.5 or later**.

Download and fully extract the archive from this project's Releases page, then open `启动.command`. If macOS displays a security warning, go to **System Settings → Privacy & Security** and choose **Open Anyway** for the file. If the same warning appears for `runtime/node`, follow the same steps and launch the tool again.

[Official Apple instructions](https://support.apple.com/102445)

</details>

## Your spending records stay in your hands

Your campus card records are collected and analyzed on your computer. Your records, reports, and browser session are saved in the `private/` folder. Keep your `private/` folder when sharing the program, and review transaction details when exporting an HTML report.

**Updating to a new version:** Click **Exit tool** in the old version and back up the `private/` folder. Extract the new archive into a **separate folder**, copy the old `private/` folder into the new version, and then launch the new version.

---

The project concept draws on [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat), with visual colors inspired by [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) and [DKU Note](https://github.com/EricZQu/DKU-Note-Template). The code is released under the [MIT License](LICENSE).
