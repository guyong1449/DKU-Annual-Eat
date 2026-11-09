[简体中文](README.md) · **English**

# DKU Annual Eat 🍚

**A whole year of meals, one story worth sharing.**

Your campus card remembers your favorite dining counter, your usual meal times, and the purchases you almost forgot. DKU Annual Eat turns those swipes into a playful spending report—plus a few **Eat TI** dining characters that feel suspiciously familiar.

[**Download the latest release →**](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

## 🍜 What's inside?

- **Your spending story:** Monthly trends, favorite counters, meal-time and spending breakdowns, and unexpected Fun Facts.
- **Eat TI characters:** Discover up to six matches from 25 dining personalities, based on your actual campus card activity.
- **Made to revisit and share:** Switch between years, months, or custom dates. Export a card, a long image, or a self-contained HTML report; you can also print to PDF. Saved reports work offline.

## 🚀 Get started in three steps

**1. Download and fully extract** the ZIP for your computer from [Releases](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest).

| Platform | ZIP filename ends with | Double-click |
| --- | --- | --- |
| Windows x64 | `win-x64.zip` | `启动.cmd` |
| Mac · Apple silicon | `mac-arm64.zip` | `启动.command` |
| Mac · Intel | `mac-x64.zip` | `启动.command` |

**2. Launch the tool.** Node.js is bundled—**no separate Node.js setup or `npm install` needed**. You do need **Chrome or Edge** installed.

**3. Collect your memories.** Pick a date range in the tool, select **Collect new data**, and complete your school **SSO / MFA** sign-in in the dedicated browser window. Open your report when collection finishes.

<details>
<summary><strong>First launch blocked on Mac?</strong></summary>

Requires **macOS 13.5+**. The Mac packages are not Apple-signed or notarized, and native Mac launch and school sign-in have not yet been verified.

After confirming the ZIP comes from this project's Releases and matches its `.sha256` checksum, try opening `启动.command`. Then go to **System Settings → Privacy & Security** and choose **Open Anyway** for the blocked file. If `runtime/node` is blocked separately, approve it the same way and relaunch.

[Apple's official instructions](https://support.apple.com/102445)

</details>

## 🔒 Your data stays yours

Collection and analysis run locally; your transactions aren't sent to third-party analytics services. The `private/` folder holds your records, reports, and browser session—**never include it when sharing the program**. Exported HTML can also contain transaction details, so check before sharing.

**Updating?** Click **Exit tool** in the old version and back up `private/`. Extract the new ZIP into a **new folder**, copy your old `private/` into it, then launch the new version.

---

Project concept based on [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat), with colors inspired by [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) and [DKU Note](https://github.com/EricZQu/DKU-Note-Template). An unofficial personal project, released under the [MIT License](LICENSE).
