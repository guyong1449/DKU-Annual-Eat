# DKU Annual Eat 浏览器插件

[简体中文](#language-chinese) · [English](#language-english)

<a name="language-chinese"></a>

## 简体中文

下载[浏览器插件安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-extension.zip)，完整解压到一个准备长期保留的文件夹。Google Chrome 用户打开 `chrome://extensions`，Microsoft Edge 用户打开 `edge://extensions`，开启“开发者模式”，再点击“加载已解压的扩展程序”，选择包含 `manifest.json` 的文件夹。这个版本通过手动加载安装，目前没有上架扩展商店。

安装完成后，点击工具栏里的 DKU Annual Eat 图标，选择日期范围，再点击“采集新数据”。工具会打开或复用校园卡标签页。你在学校页面完成统一身份认证和多因素身份验证后，插件会继续读取记录。采集期间请保留校园卡标签页，不要刷新；工具页可以关闭，之后再点击插件图标就能查看结果。

报告保存在当前浏览器中。你可以在报告里导出卡片、长图或离线网页，也可以在浏览器的打印窗口中保存为 `.pdf` 文件。旧应用的 `.json` 原始数据文件可以通过“导入旧版 JSON”继续使用，不需要重新采集。

插件只在校园卡域名内读取记录，学校登录仍由学校页面完成，消费记录不会上传到项目服务器。窗口金额按明确的收款窗口编号归集，学校返回名称保留在明细中；Eat TI 的原始规则不变。

浏览器插件更新前，先导出原始数据文件作为备份，再把新文件放回原安装目录，在扩展管理页点击“重新加载”。请保留这个目录。卸载插件、清除插件数据或改用另一个浏览器后，原来的报告不会自动跟过去，可以用备份文件重新导入。

---

<a name="language-english"></a>

## English

Download the [browser extension package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.3.0-beta.1/DKU-Annual-Eat-1.3.0-beta.1-extension.zip) and extract it into a folder you plan to keep. In Google Chrome, open `chrome://extensions`; in Microsoft Edge, open `edge://extensions`. Enable Developer mode, select Load unpacked, and choose the folder containing `manifest.json`. This version is installed manually and is not listed in an extension store.

Click DKU Annual Eat in the browser toolbar, choose a date range, and select Collect new data. The extension opens or reuses a campus card tab. Complete the school single sign-on and multi-factor authentication there, and collection will continue. Keep that tab open without refreshing it. You can close the tool page and click the extension icon later to check the result.

Reports stay in the current browser. Open a report to export a card, a long image or a standalone web page, or save a `.pdf` file from the browser print dialog. The Import old JSON button accepts original `.json` data files from the local application, so you can keep using records you have already collected.

The extension reads records only within the campus card domain. School sign-in stays on school pages, and transactions are not uploaded to a project server. Financial reports group explicit counter codes while keeping source names in the details. Eat TI keeps its original rules.

Before updating the extension, export your original data as a backup. Replace the files in the same installation folder and click Reload on the browser extension management page. Keep that folder in place. Reports do not automatically follow you if you uninstall the extension, clear its data or switch browsers, but you can import your backup again.
