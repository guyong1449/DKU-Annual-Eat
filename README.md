**简体中文** · [English](README.en.md)

# DKU Annual Eat 🍚

**把这一年的饭，吃成一份报告。**

你的校园卡可能比你更懂你的饭点。常去哪家窗口？哪顿饭最舍得花钱？这一年又吃出了什么人格？

DKU Annual Eat 把校园卡消费流水变成一份好看、好玩的消费报告，还有 **Eat TI · 饭格** 为你揭晓专属干饭角色。

[**下载最新版 →**](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

## 🍜 报告里有什么？

- **年度消费报告**：月度走势、常去窗口、用餐时段、金额分布，还有一些意想不到的 Fun Facts。
- **Eat TI · 饭格**：25 种干饭角色，根据你的真实消费习惯匹配最多 6 个。
- **随心查看和分享**：切换年份、月份或自定义日期；导出卡片、长图、HTML，也能打印为 PDF。保存的报告支持离线查看。

## 🚀 三步开始

**1. 下载并完整解压** [Releases](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest) 中适合你电脑的 ZIP。

| 电脑 | 下载对应文件 | 双击启动 |
| --- | --- | --- |
| Windows 64 位 | `win-x64.zip` | `启动.cmd` |
| Mac · Apple 芯片 | `mac-arm64.zip` | `启动.command` |
| Mac · Intel 芯片 | `mac-x64.zip` | `启动.command` |

**2. 启动工具。** 发布包已自带 Node.js，**不用安装 Node.js，也不用运行 `npm install`**；电脑需要安装 **Chrome 或 Edge**。

**3. 开始收集回忆。** 在工具页选择日期，点击「采集新数据」，在打开的专用浏览器中完成学校 **SSO / MFA** 登录。采集完成后，就可以打开报告了。

<details>
<summary><strong>Mac 第一次打开被系统拦截？</strong></summary>

Mac 需要 **macOS 13.5+**。目前 Mac 包尚未经过 Apple 签名与公证，也未完成 Mac 真机启动和学校登录验证。

确认 ZIP 来自本项目 Releases、校验值与对应的 `.sha256` 文件一致后，先尝试双击 `启动.command`，再前往「系统设置 → 隐私与安全性」找到拦截提示，选择「仍要打开」。如果随后单独拦截 `runtime/node`，同样批准后重新启动。

[Apple 官方操作说明](https://support.apple.com/zh-cn/102445)

</details>

## 🔒 你的流水，你保管

采集和统计在本机进行，不会将流水发送给第三方分析服务。数据、报告和浏览器登录会话保存在 `private/`，**分享程序时不要附上这个文件夹**；导出的 HTML 也可能包含消费明细，分享前记得检查。

**更新版本：** 先在旧版中点击「退出工具」，备份 `private/`。将新版 ZIP 解压到**新文件夹**，把旧版的 `private/` 复制过去，再启动新版。

---

基于 [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat) 的项目思路，视觉配色参考 [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) 与 [DKU Note](https://github.com/EricZQu/DKU-Note-Template)。个人非官方项目，代码采用 [MIT License](LICENSE)。
