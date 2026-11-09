# DKU Annual Eat

[简体中文](README.md#language-chinese) · [English](#language-english)

<a name="language-english"></a>

## English

**A whole year of meals, one story worth sharing.**

DKU Annual Eat turns campus card transactions into a playful spending report. Eat TI adds dining characters matched to your habits.

### Highlights

- **Spending report** includes monthly trends, favorite dining counters, meal times, spending breakdowns, and fun facts, with custom date ranges and Chinese-English switching.
- **Eat TI characters** offer up to six matches from 25 dining characters, each with its own illustration.
- **Collection and sharing** supports Chinese and English campus card pages. Export reports as cards, long images, or HTML pages, or print them as PDF files.

### Setup and usage

#### 1. Download the package for your computer

Choose the ZIP archive for your computer under Assets on the [v1.2.0-beta.1 release page](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.2.0-beta.1).

| Platform | Download |
| --- | --- |
| 64-bit Windows computer | `DKU-Annual-Eat-1.2.0-beta.1-win-x64.zip` |
| Mac with Apple silicon | `DKU-Annual-Eat-1.2.0-beta.1-mac-arm64.zip` |
| Mac with an Intel processor | `DKU-Annual-Eat-1.2.0-beta.1-mac-x64.zip` |

#### 2. Extract and launch

Extract the entire ZIP archive into a folder, keeping all its files together. On Windows, double-click `启动.cmd`. On Mac, double-click `启动.command`.

The package includes the Node.js runtime, so you do not need to install Node.js or run `npm install`. Windows uses Google Chrome or Microsoft Edge. On Mac, you can also select Safari in the tool page. Safari is selected automatically when Chrome and Edge are unavailable. Mac requires macOS 13.5 or later.

If macOS displays a security warning on first launch, try opening `启动.command`, then go to System Settings → Privacy & Security, find the blocked file, and select Open Anyway. If the same warning appears for `runtime/node`, follow the same steps and launch the tool again. Mac packages include `使用说明.txt` instructions and the `安全性设置方法.png` illustrated guide. [Official Apple instructions](https://support.apple.com/102445)

#### 3. Sign in and collect campus card records

In the tool page that opens, choose a year or custom date range and select Collect new data.

Complete the school's single sign-on (SSO) and multi-factor authentication (MFA) in the dedicated browser window. Once you have signed in, the tool automatically collects transactions from the selected period.

For Safari, first show features for web developers in Safari Settings → Advanced, then enable Allow JavaScript from Apple Events in Developer settings. On first collection, allow the launching app shown in the macOS prompt to control Safari, usually Terminal. Manage this consent in System Settings → Privacy & Security → Automation.

Complete school sign-in and MFA in the Safari window opened by the tool, keeping its original single tab open during collection. Safari support is experimental. Permission prompts, school sign-in, and image exports still need verification on a physical Mac.

#### 4. View, export, and reopen your report

After collection, open the report to explore your spending statistics and Eat TI characters. You can switch between Chinese and English, adjust date filters, or export images and HTML pages.

To view a saved report later, open `查看报告.html` directly, even while offline. Run the launcher again when you want to collect new records.

**When updating**, click Exit tool in the old version and back up the `private/` folder. Extract the new ZIP into a separate folder, copy your old `private/` into it, and launch the new version.

The project concept draws on SJTU Annual Eat, with colors inspired by DKU Beamer and DKU Note. The code is MIT-licensed.

[SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat) · [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) · [DKU Note](https://github.com/EricZQu/DKU-Note-Template) · [MIT License](LICENSE)
