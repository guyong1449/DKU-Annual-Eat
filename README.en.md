# DKU Annual Eat

[简体中文](README.md#language-chinese) · [English](#language-english)

<a name="language-english"></a>

## English

DKU Annual Eat turns Duke Kunshan University campus card transactions into a spending report. You can see how your spending changes by month, which counters you visit most, and which Eat TI dining characters fit your habits. Reports work in Chinese and English, let you choose a year, month or custom date range, and can be exported as images, standalone web pages or printable documents.

[The current preview release is v1.3.0-beta.1](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.3.0-beta.1). It includes a browser extension and a local application, both using the same spending calculations and Eat TI rules. The browser extension is a good place to start. If you prefer launching a program by double-clicking a file, use the local application.

### Use the browser extension

Download the [browser extension package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-extension.zip) and extract it into a folder you plan to keep. In Google Chrome, open `chrome://extensions`; in Microsoft Edge, open `edge://extensions`. Enable Developer mode, select Load unpacked, and choose the folder containing `manifest.json`. This version is installed manually and is not listed in an extension store.

Click DKU Annual Eat in the browser toolbar, choose a date range, and select Collect new data. The extension opens or reuses a campus card tab. Complete the school single sign-on and multi-factor authentication there, and collection will continue. Keep that tab open without refreshing it. You can close the tool page and click the extension icon later to check the result.

Reports stay in the current browser. Open a report to export a card, a long image or a standalone web page, or save a `.pdf` file from the browser print dialog. The Import old JSON button accepts original `.json` data files from the local application, so you can keep using records you have already collected. See the [extension guide](https://github.com/guyong1449/DKU-Annual-Eat/blob/main/docs/extension.md) for the full instructions.

### Use the local application

For Windows, download the [Windows package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-win-x64.zip). For an Apple computer, choose the [Apple silicon package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-mac-arm64.zip) or the [Intel package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-mac-x64.zip). Extract the entire archive, then double-click `启动.cmd` on Windows or `启动.command` on an Apple computer. The runtime is included, so you do not need to install Node.js separately.

Choose a date range in the tool page and start collection, then sign in on the school page opened by the tool. Windows uses Google Chrome or Microsoft Edge. Apple computers require macOS 13.5 or later and can also use Safari. Safari requires its developer features and Allow JavaScript from Apple Events setting, along with permission for the launching application to control the browser. Safari support remains experimental. System permission prompts, school sign-in and image exports have not yet been verified on a physical Apple computer.

If macOS blocks a file on first launch, follow the included `使用说明.txt` instructions and `安全性设置方法.png` image to allow that file in System Settings → Privacy & Security. The [Apple instructions](https://support.apple.com/102445) explain this process. Once a report has been saved, open `查看报告.html` to read it offline. Run the launcher when you want new transactions.

### Read, keep and update your reports

Financial reports group explicit collection-counter codes found in campus card names, such as `1F-2`. A counter may change its operator or menu over time, so its total describes spending at that collection point rather than on a particular dish. Names returned by the school remain in counter details and transaction records. Eat TI keeps its original inputs and rules. See the [campus card data notes](https://github.com/guyong1449/DKU-Annual-Eat/blob/main/docs/campus-card-data.md) for the evidence and limits behind this interpretation.

This release separates month labels from year labels on monthly charts and reorganizes the printed report. Previously exported pages and documents do not change automatically. Reopen the report and export it again to use the new layout.

Before updating the extension, export your original data as a backup. Replace the files in the same installation folder and click Reload on the browser extension management page. Keep that folder in place. Reports do not automatically follow you if you uninstall the extension, clear its data or switch browsers, but you can import your backup again.

To update the local application, exit the old tool and back up its `private/` folder. Extract the new version into a separate folder, then copy `private/` into it. Transactions and reports stay on your computer and are not uploaded to a project server. Exported web pages and original data files can also be kept as backups.

The project idea draws on [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat), with colors inspired by [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) and [DKU Note](https://github.com/EricZQu/DKU-Note-Template). The code is released under the [MIT License](LICENSE).
