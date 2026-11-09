# DKU Annual Eat

昆山杜克大学校园卡年度消费报告。采集需本地启动并完成一次学校登录；已保存的报告随时离线查看。

## 快速开始

**免安装包（推荐）**：下载对应平台的压缩包，**完整解压后**双击 `启动.cmd`（macOS 为 `启动.command`）。包内自带 Node.js，电脑需装有 Chrome 或 Edge（Safari 不支持自动采集）。

**从源码运行**：需要 Node.js 22+ 和 Chrome 或 Edge，同样双击 `启动.cmd`；没有 npm 依赖，无需 `npm install`。

macOS 包尚未完成真机验收与签名公证，首次打开可能受 Gatekeeper 限制，请参阅 [Apple 官方说明](https://support.apple.com/102445)，不要关闭安全检查。

## 第一次采集

1. 双击 `启动.cmd`，会自动打开工具页和一个独立的 Chrome 窗口（专用配置，不影响你的常用浏览器）。
2. 在工具页选择年份（2022 年起某一年，或「全部年份」），点击「采集新数据」。
3. 工具自动打开校园卡标签页。**在这个标签页里正常完成学校 SSO 登录和 MFA**——输入 DKU 账号密码、完成验证即可，程序会自动等待（最长 10 分钟）。
4. 登录成功、回到校园卡首页后，程序自动检测到并开始读取流水，不需要复制密码、Cookie 或设置任何书签。
5. 完成后自动打开报告。报告可随时切换年份和月份，无需重新采集。

之后的采集：学校会话仍有效时可能直接免登录；会话过期就重新登录一次。登录始终由学校页面完成，本工具不接收账号密码。

## 日常查看

- 双击 `查看报告.html` 打开离线报告库，可按 Ctrl+D 收藏；退出工具、重启电脑后仍能查看历史报告。
- 请保留项目目录及 `private/`（报告和数据都在里面，已被 Git 忽略，请勿分享或上传该目录）。
- 更新数据仍需双击 `启动.cmd`——浏览器书签不能启动本地程序。

## 说明

- 数据只在你的电脑上处理，不上传第三方；HTML 报告无外部资源，可离线打开或打印为 PDF。
- 统计口径：净消费 = 成功消费扣款 − 实际退款/冲正返还；同商户同日 5 分钟内等额返还按疑似全额退款排除；校园打印不计入；充值不参与统计。完整明细保留并标注排除原因。
- 报告顶部附「EatTI · 饭格彩蛋」：按消费习惯匹配 25 种趣味角色，最多展示 6 个，需要至少 6 笔餐饮扣款和 3 个消费日。文案提供整版中文 / 英文切换（工具栏按钮，选择会被记住）；顶部阵容卡悬停翻面即看角色档案，手机点一下也可以。
- 遇到问题先看 `private/app.log`：提示等待登录就在专用窗口完成登录；专用窗口被关了就重新双击启动。不要通过关闭安全设置或复制常用浏览器 Cookie 来恢复。

## 开发

```powershell
npm test              # 测试
npm start             # 本地启动
npm run build         # 构建采集界面
npm run package:win   # Windows 免安装包
npm run package:mac   # macOS 免安装包（arm64 / x64）
```

修改 `src/` 后重新构建或重启工具生效；产物在 `release/`，不含任何个人数据。

角色单图保存在 `src/assets/characters/`，网页和两种图片导出共用同一套透明 PNG。原始合图保留为美术源文件；更换原图后可运行 `python scripts/split-eatti-characters.py` 重新拆图（仅开发时需要 Pillow、NumPy、SciPy）。

## 来源

结构想源自 [Milvoid/SJTU-Annual-Eat](https://github.com/Milvoid/SJTU-Annual-Eat)（MIT）。配色参考 [DKU-beamer-presentation](https://github.com/EricZQu/DKU-beamer-presentation) 与 [DKU-Note-Template](https://github.com/EricZQu/DKU-Note-Template)。本工具为个人非官方项目，与学校认证系统无隶属关系。
