# DKU Annual Eat

把昆山杜克大学的校园卡流水整理成一份能看懂的消费报告，看看钱花在哪、什么时候最常去食堂，以及账单里藏着哪些习惯。Eat TI 会再从这些记录里，给你匹配几个趣味干饭角色。

Turn your Duke Kunshan University campus card history into a spending report. See where you eat, when you visit, and the habits that show up in your receipts. Eat TI adds a few dining characters matched to those habits.

## 下载与启动 · Download and launch

在 Releases 下载对应的 ZIP。包内自带 Node.js，无需另外安装运行环境或执行 `npm install`，电脑需要安装 Chrome 或 Edge。[下载发布包](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

Download the ZIP for your computer from Releases. Node.js is included, so no separate runtime installation or `npm install` is needed. Chrome or Edge must be installed. [Download a release](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

| 系统 / Platform | 文件名后缀 / Package suffix | 启动文件 / Launcher |
| --- | --- | --- |
| Windows x64 | `win-x64.zip` | `启动.cmd` |
| macOS Apple 芯片 / Apple silicon | `mac-arm64.zip` | `启动.command` |
| macOS Intel | `mac-x64.zip` | `启动.command` |

macOS 需要 13.5 或更新版本。Mac 包经过跨平台打包和完整性检查，尚未完成 Mac 真机启动、学校登录验收，也未做 Apple 签名或公证。

macOS requires version 13.5 or later. The Mac packages are cross-built and checked for archive integrity. Native Mac launch and school sign-in have not been verified. The packages are unsigned and unnotarized.

1. **完整解压 ZIP**，保留文件夹里的全部文件，再双击上表中的启动文件。

   **Extract the entire ZIP**, keep the folder intact, and double-click the launcher listed above.

2. 工具页默认选择 2026 年。选好统计范围，点击「采集新数据」。也可以选择本月、最近 30 天或自定义起止日期。

   The tool starts with 2026 selected. Choose a date range and click “Collect new data.” This month, the last 30 days, and custom dates are also available.

3. 在自动打开的专用浏览器窗口中，正常完成学校 SSO 登录和 MFA。程序会等待登录，然后自动读取流水。

   Complete school SSO and MFA in the dedicated browser window that opens. The tool waits for sign-in, then reads your transaction history automatically.

4. 采集结束后打开报告。页头可切换中英文，也可以在已采集的范围内切换年份、月份或自定义日期。

   Open the report when collection finishes. Switch between Chinese and English in the header, or filter the collected records by year, month, or custom dates.

学校登录始终在学校页面完成。工具不接收你的账号密码。学校会话过期时，下一次采集需要重新登录。

School sign-in stays on the school’s own page. The tool does not receive your username or password. If the school session expires, sign in again for the next collection.

### Mac 首次打开 · First launch on Mac

若系统拦截启动，确认文件来自本项目 Releases 且 ZIP 校验值匹配后，按以下步骤操作。

If macOS blocks the launch, confirm that the ZIP came from this project’s Releases and matches its checksum, then follow these steps.

1. 先双击一次 `启动.command`，让系统显示提示。

   Try opening `启动.command` once to trigger the notice.

2. 打开「系统设置」→「隐私与安全性」，向下滚动至「安全性」，找到刚被阻止的文件，点「仍要打开」。

   Open System Settings → Privacy & Security, scroll to Security, find the blocked file, and click Open Anyway.

3. 在随后提示中点「打开」，完成系统要求的验证，再双击 `启动.command`。若随后单独拦截 `runtime/node`，对该文件重复批准后重新启动。

   Click Open, complete any authentication requested, then run `启动.command` again. If `runtime/node` is blocked separately, approve that file the same way and relaunch.

系统会保存该文件的打开许可。Mac 包内的 `使用说明.txt` 也附有这套步骤。[Apple 官方说明](https://support.apple.com/zh-cn/102445)

macOS saves an exception for that file. These steps are also included in `使用说明.txt` inside each Mac ZIP. [Apple instructions](https://support.apple.com/102445)

## 报告里有什么 · Inside the reports

- **消费报告**包含月度走势、窗口分布、餐段与单笔金额分布，以及单笔最高、连续消费天数等 Fun Facts。

  **The spending report** includes monthly trends, dining counters, meal times, transaction amounts, and Fun Facts such as your largest purchase and longest spending streak.

- **Eat TI** 从 25 种角色中匹配最多 6 个。至少需要 6 笔餐饮扣款和 3 个消费日，结果才会出现。

  **Eat TI** matches up to six of 25 characters. It needs at least six dining purchases across three spending days.

- **错峰干饭侠保留上午加餐**。10:00–10:59、13:01–16:59 和 18:31 起的刷卡合并统计，合计次数在各餐段中最多时符合该角色条件，并列也算。最终展示仍受最多 6 个角色的排序限制。

  **The Off Peak Diner includes morning bites**. Swipes at 10:00–10:59, 13:01–16:59, and 18:31 onward are counted together. The character qualifies when this combined count leads the meal groups, including ties. The final selection is still limited to six characters.

## 导出与离线查看 · Export and offline viewing

消费报告可导出卡片或长图，也能保存 HTML、打印为 PDF。卡片以图表和 Fun Facts 为主，长图保留更完整的内容。

Export the spending report as a card or long image, save it as HTML, or print it to PDF. Cards focus on charts and Fun Facts. Long images keep more of the report.

Eat TI 的卡片只保留人格档案，长图包含统计、Fun Facts 和人格档案。网页和两种图片导出共用 25 张独立透明插画。

Eat TI cards contain the character profiles. Long images include statistics, Fun Facts, and profiles. The web report and both image exports share the same 25 individual transparent illustrations.

下次查看时，直接打开 `查看报告.html`。退出工具或重启电脑后，已保存的报告仍可离线查看。重新采集数据时再运行启动文件。

For later visits, open `查看报告.html` directly. Saved reports remain available offline after closing the tool or restarting your computer. Run the launcher again when you want fresh data.

## 数据与统计口径 · Data and calculations

采集和统计在本机进行，流水不发送给第三方分析服务。`private/` 保存流水、报告和专用浏览器会话。分享程序时请去掉这个文件夹。导出的 HTML 自带所需资源，也包含消费明细，分享前请检查内容。

Collection and analysis run locally. Transaction history is not sent to a third-party analytics service. The `private/` folder holds your records, reports, and dedicated browser session. Leave it out when sharing the program. Exported HTML includes its resources and transaction details, so review it before sharing.

更新时，先在旧工具中点击「退出工具」，备份旧版的 `private/`。把新版 ZIP 完整解压到新文件夹，将旧版 `private/` 复制到新版目录中，再启动新版。

To update, click “Exit tool” in the old version and back up its `private/` folder. Extract the new ZIP into a separate folder, copy the old `private/` into the new program folder, then launch the new version.

净消费按成功扣款减去符合条件的退款、消费冲正及折扣返还计算，充值和校园打印不参与统计。同一商户、同一天、5 分钟内的等额扣款与非折扣返还会一对一匹配，作为疑似全额退款排除。商户按原始流水中的窗口名称匹配。原始明细保留，匹配排除的记录会标注原因。

Net spending is successful charges minus eligible refunds, reversals, and discount refunds. Top-ups and campus printing are excluded. Equal charges and non-discount returns at the same merchant, on the same day, within five minutes are paired one-to-one and excluded as a likely full refund. Merchants are matched by the counter name in the source records. The original records are retained, with an explanation on matched exclusions.

报表只覆盖已采集的数据。要查看某段时间的完整统计，需要先采集覆盖该时间段的流水。

Reports cover only the records already collected. Collect the full date range before using it for a complete period summary.

## 遇到问题 · Troubleshooting

- 一直等待登录时，检查专用浏览器中的学校页面，完成 SSO 和 MFA。登录等待超过 10 分钟会结束本次采集，可以重新发起。

  If collection is waiting for sign-in, check the school page in the dedicated browser and complete SSO and MFA. The sign-in wait ends after ten minutes, after which you can start again.

- 关闭专用浏览器后，重新运行启动文件。若旧的工具页提示连接失效，刷新页面。

  If you close the dedicated browser, run the launcher again. Refresh an old tool page if it reports that the connection has expired.

- 启动问题查看 `private/launcher.log`，采集或报告问题查看 `private/app.log`。反馈时只提供相关错误，先删去个人信息。

  Check `private/launcher.log` for launch problems and `private/app.log` for collection or report problems. When reporting an issue, share the relevant error after removing personal information.

## 从源码运行 · Development

需要 Node.js 22+ 和 Chrome 或 Edge。没有 npm 依赖，无需运行 `npm install`。构建 Mac 包另外需要 Python 3.9+，使用标准库。

Requires Node.js 22+ and Chrome or Edge. There are no npm dependencies, so `npm install` is unnecessary. Building Mac packages also requires Python 3.9+, using its standard library.

```sh
npm start
npm test
npm run build
npm run package:win
npm run package:mac
```

修改 `src/` 后重新构建或重启工具。发布包输出到 `release/`，按文件清单打包，不包含 `private/`。本版变更见 [v1.1.0 更新说明](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.1.0)。

After editing `src/`, rebuild or restart the tool. Packages are written to `release/` using an explicit file list that excludes `private/`. See the [v1.1.0 release notes](https://github.com/guyong1449/DKU-Annual-Eat/releases/tag/v1.1.0) for this version’s changes.

角色单图位于 `src/assets/characters/`。更换原始合图后，可运行 `python scripts/split-eatti-characters.py` 重新拆图，这一步需要 Pillow、NumPy 和 SciPy。

Character images live in `src/assets/characters/`. After replacing the source atlas, run `python scripts/split-eatti-characters.py` to regenerate them. This development step requires Pillow, NumPy, and SciPy.

## 来源与许可 · Credits and license

项目结构参考 SJTU Annual Eat，配色参考 DKU Beamer 和 Note 模板。代码采用 MIT 许可。这是个人非官方项目。

The project structure draws on SJTU Annual Eat, with colors informed by the DKU Beamer and Note templates. Code is MIT-licensed. This is an unofficial personal project.

[SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat) · [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) · [DKU Note Template](https://github.com/EricZQu/DKU-Note-Template) · [MIT License](LICENSE)
