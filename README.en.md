# DKU Annual Eat

[简体中文](README.md#language-chinese) · [English](#language-english)

<a name="language-english"></a>

## English

DKU Annual Eat turns Duke Kunshan University campus card transactions into an annual report. Choose a year, month or custom date range to explore spending, counter rankings and dining habits, or open the Eat TI dining characters. Reports can be exported as cards, long images or printable documents. Records stay on your computer and are not uploaded to a project server.

[Download v1.4.0](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.4.0).

### Install the browser extension (recommended)

Download the [browser extension package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-extension.zip) and extract the entire archive into a folder you plan to keep. Do not open files directly inside the archive. Find `manifest.json` in the extracted files. If there is an outer folder, open it until you reach the folder containing that file.

In Google Chrome, enter `chrome://extensions` in the address bar. In Microsoft Edge, enter `edge://extensions`. Enable Developer mode, select Load unpacked, and choose the folder containing `manifest.json`. Select the extracted folder, not the archive. This release is installed manually and is not listed in an extension store.

Open the browser's extensions menu, find DKU Annual Eat, and pin it or choose to show it in the toolbar. Click its icon to open the tool, select a date range, and click Collect new data. Complete the school single sign-on and multi-factor authentication in the school page that opens. The extension will then continue collecting records. Keep the campus card tab open without refreshing it. You can close the tool page and click the extension icon later to view the result.

At the top of a report, switch between the annual spending report and the Eat TI dining characters. Use the report controls to change dates or export images. Offline page and original data exports are at the bottom of the page. To reuse data from the local application, select Import old JSON in the report library and choose your exported `.json` file.

### Use the local application

If you prefer a launcher, download the [Windows package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-win-x64.zip), [Apple silicon package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-mac-arm64.zip) or [Intel package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-mac-x64.zip). Extract the whole archive, then double-click `启动.cmd` on Windows or `启动.command` on an Apple computer. Choose dates in the tool and sign in on the school page when prompted. The runtime is included; no separate Node.js installation is needed.

Apple computers require macOS 13.5 or later. If the system blocks the first launch, follow the included `使用说明.txt` instructions and `安全性设置方法.png` image. Safari also requires developer features, Allow JavaScript from Apple Events, and permission for the launching application to control the browser. Safari support remains experimental. System permissions, school sign-in and image exports have not yet been verified on a physical Apple computer.

### Update and keep your data

Before updating the extension, export the original data as a backup. Replace the files in the same installation folder and click Reload on the extension management page. Keep that folder; uninstalling the extension, clearing its data or switching browsers requires importing your backup again. For the local application, copy the old `private/` folder into the new version to keep your records.

Counter names use the full names returned by the campus card system, while totals group explicit counter codes. Menus and operators can change, so historical totals cannot identify spending on a particular dish. Eat TI keeps its original records and rules.

The project idea draws on [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat), with colors inspired by [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) and [DKU Note](https://github.com/EricZQu/DKU-Note-Template). The code is released under the [MIT License](LICENSE).
