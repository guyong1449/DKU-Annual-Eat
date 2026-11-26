# DKU Annual Eat

[简体中文](#language-chinese) · [English](#language-english)

<a name="language-chinese"></a>

## 简体中文

DKU Annual Eat 把昆山杜克大学的校园卡消费记录整理成一份报告。你可以看看每个月花了多少钱、常去哪些窗口，也可以通过 Eat TI · 饭格看看自己的用餐习惯更像哪些角色。报告支持中英文切换，可以按年份、月份或自选日期查看，并导出图片、离线网页或打印文档。

[当前测试版是 v1.3.0-beta.1](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.3.0-beta.1)，提供浏览器插件和本地应用，两种方式使用相同的消费统计和饭格规则。第一次使用时，建议先试浏览器插件；如果你习惯双击一个启动文件，也可以下载本地应用。

### 使用浏览器插件

下载[浏览器插件安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-extension.zip)，完整解压到一个准备长期保留的文件夹。Google Chrome 用户打开 `chrome://extensions`，Microsoft Edge 用户打开 `edge://extensions`，开启“开发者模式”，再点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的文件夹。这个版本通过手动加载安装，目前没有上架扩展商店。

安装完成后，点击工具栏里的 DKU Annual Eat 图标，选择日期范围，再点击“采集新数据”。工具会打开或复用校园卡标签页。你在学校页面完成统一身份认证和多因素身份验证后，插件会继续读取记录。采集期间请保留校园卡标签页，不要刷新；工具页可以关闭，之后再点击插件图标就能查看结果。

报告保存在当前浏览器中。你可以在报告里导出卡片、长图或离线网页，也可以在浏览器的打印窗口中保存为 `.pdf` 文件。旧应用的 `.json` 原始数据文件可以通过“导入旧版 JSON”继续使用，不需要重新采集。详细步骤见[插件使用说明](https://github.com/guyong1449/DKU-Annual-Eat/blob/main/docs/extension.md)。

### 使用本地应用

Windows 电脑下载 [Windows 安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-win-x64.zip)。苹果电脑根据处理器选择 [Apple 芯片安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-mac-arm64.zip)或 [Intel 芯片安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-mac-x64.zip)。完整解压后，Windows 双击 `启动.cmd`，苹果电脑双击 `启动.command`。安装包已经包含运行环境，无需另外安装 Node.js。

在工具页面选择日期范围并开始采集，再到工具打开的学校页面完成登录。Windows 使用 Google Chrome 或 Microsoft Edge。苹果电脑需要 macOS 13.5 或更新版本，也可以选择 Safari。Safari 需要开启开发者功能和“允许来自 Apple Events 的 JavaScript”，并允许启动程序控制浏览器。Safari 接入仍是测试功能，苹果电脑上的系统授权、学校登录和图片导出还没有完成真机验收。

如果 macOS 首次启动时拦截了文件，可以按照包内的 `使用说明.txt` 和 `安全性设置方法.png` 操作，在“系统设置 → 隐私与安全性”中允许打开对应文件，也可以参考 [Apple 官方说明](https://support.apple.com/zh-cn/102445)。采集结束后，以后可以直接打开 `查看报告.html` 阅读已保存的报告，需要更新流水时再运行启动文件。

### 怎样理解和保留报告

消费报告按校园卡名称中明确的收款窗口编号归集金额，例如 `1F-2`。同一窗口可能换过经营内容，所以这个金额表示在该收款窗口的消费，不能直接解释成某种菜品的花费。学校返回的名称仍保留在窗口详情和逐笔记录中，Eat TI 继续使用原始记录和原有规则。更具体的说明见[校园卡数据口径](https://github.com/guyong1449/DKU-Annual-Eat/blob/main/docs/campus-card-data.md)。

这一版把月度图表的月份和年份分成了两行，并重新安排了打印报告的分页。已经另存的旧网页和打印文档不会自动改变，重新打开报告并再次导出，就会使用新版样式。

浏览器插件更新前，先导出原始数据文件作为备份，再把新文件放回原安装目录，在扩展管理页点击“重新加载”。请保留这个目录。卸载插件、清除插件数据或改用另一个浏览器后，原来的报告不会自动跟过去，可以用备份文件重新导入。

本地应用更新前，先退出旧工具并备份 `private/` 文件夹，把新版解压到新的文件夹，再将旧版的 `private/` 复制进去。消费记录和报告都保存在本机，不会上传到项目服务器。独立导出的网页和数据文件也可以留作备份。

项目构思参考 [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat)，配色参考 [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) 和 [DKU Note](https://github.com/EricZQu/DKU-Note-Template)。代码采用 [MIT 许可证](LICENSE)。

---

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
