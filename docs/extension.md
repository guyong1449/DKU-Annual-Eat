# DKU Annual Eat 浏览器插件

[简体中文](#language-chinese) · [English](#language-english)

<a name="language-chinese"></a>

## 简体中文

先下载[浏览器插件安装包](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-extension.zip)，把整个压缩包解压到一个准备长期保留的文件夹。不要直接打开压缩包里的文件。解压后应能找到 `manifest.json`；如果外面还有一层文件夹，继续打开，找到包含这个文件的那一层。

Google Chrome 用户在地址栏输入 `chrome://extensions`，Microsoft Edge 用户输入 `edge://extensions`。打开页面上的“开发者模式”，点击“加载已解压的扩展程序”，选择刚才包含 `manifest.json` 的文件夹。选择的是解压后的目录，不是压缩包。这个版本需要手动加载，没有上架扩展商店。

安装完成后，点击浏览器右上角的扩展程序按钮，找到 DKU Annual Eat，将它固定或设为在工具栏显示。再点击它的图标打开工具页，选择日期范围，点击“采集新数据”。在随后打开的学校页面完成统一身份认证和多因素身份验证，插件就会继续读取记录。采集期间保留校园卡标签页，不要刷新；工具页可以关闭，之后再次点击插件图标即可查看结果。

打开报告后，顶部可以切换“年度消费报告”和“饭格彩蛋”，报告内可以调整日期并导出图片。离线网页和原始数据的导出按钮在页面最下面。已有本地应用数据的用户，可以在报告库点击“导入旧版 JSON”，选择之前导出的 `.json` 文件。


### 更新和保留数据

插件更新前先导出原始数据备份，再将新文件放回原安装目录，在扩展管理页点击“重新加载”。保留安装目录；卸载、清除插件数据或更换浏览器后，需要重新导入备份。

---

<a name="language-english"></a>

## English

Download the [browser extension package](https://github.com/guyong1449/DKU-Annual-Eat/releases/download/v1.4.0/DKU-Annual-Eat-1.4.0-extension.zip) and extract the entire archive into a folder you plan to keep. Do not open files directly inside the archive. Find `manifest.json` in the extracted files. If there is an outer folder, open it until you reach the folder containing that file.

In Google Chrome, enter `chrome://extensions` in the address bar. In Microsoft Edge, enter `edge://extensions`. Enable Developer mode, select Load unpacked, and choose the folder containing `manifest.json`. Select the extracted folder, not the archive. This release is installed manually and is not listed in an extension store.

Open the browser's extensions menu, find DKU Annual Eat, and pin it or choose to show it in the toolbar. Click its icon to open the tool, select a date range, and click Collect new data. Complete the school single sign-on and multi-factor authentication in the school page that opens. The extension will then continue collecting records. Keep the campus card tab open without refreshing it. You can close the tool page and click the extension icon later to view the result.

At the top of a report, switch between the annual spending report and the Eat TI dining characters. Use the report controls to change dates or export images. Offline page and original data exports are at the bottom of the page. To reuse data from the local application, select Import old JSON in the report library and choose your exported `.json` file.


### Update and keep your data

Before updating the extension, export the original data as a backup. Replace the files in the same installation folder and click Reload on the extension management page. Keep that folder; uninstalling the extension, clearing its data or switching browsers requires importing your backup again.
