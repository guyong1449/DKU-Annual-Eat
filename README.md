**简体中文** · [English](README.en.md)

# DKU Annual Eat 🍚

**把这一年的饭，吃成一份报告。**

你的校园卡可能比你更了解自己的用餐习惯。最常去哪家窗口？哪一顿花钱最多？这一年，你又吃出了什么样的干饭人格？

DKU Annual Eat 把昆山杜克大学的校园卡消费记录整理成一份有趣的消费报告，再由 **Eat TI · 饭格** 为你匹配专属干饭角色。

[**下载最新版本**](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest)

## 报告里有什么？

- **消费报告**：每月消费走势、经常光顾的窗口、用餐时段、单笔消费金额，还有意想不到的趣味记录。
- **Eat TI · 饭格**：根据真实消费习惯，从 25 种干饭角色中匹配最多 6 种。
- **保存与分享**：按年份、月份或自定义日期查看报告，导出卡片、长图或 HTML 网页，也可以打印为 PDF 文件。保存后的报告可以离线查看。

## 如何安装和使用？

**第一步：下载并完整解压。** 从 [Releases 发布页面](https://github.com/guyong1449/DKU-Annual-Eat/releases/latest) 下载适合自己电脑的 ZIP 压缩包。

| 电脑类型 | 压缩包文件名后缀 | 双击打开的启动文件 |
| --- | --- | --- |
| 64 位 Windows 电脑 | `win-x64.zip` | `启动.cmd` |
| 配备 Apple 芯片的 Mac | `mac-arm64.zip` | `启动.command` |
| 配备 Intel 处理器的 Mac | `mac-x64.zip` | `启动.command` |

**第二步：启动工具。** 发布包已自带 Node.js 运行环境，无需另行安装 Node.js 或执行 `npm install`。电脑需要已安装 **Google Chrome 或 Microsoft Edge** 浏览器。

**第三步：采集数据并查看报告。** 在工具页面选择日期范围，点击「采集新数据」，然后在自动打开的专用浏览器中完成学校统一身份认证（SSO）和多因素身份验证（MFA）。采集完成后即可打开报告。

<details>
<summary><strong>Mac 首次启动时遇到系统安全提示？</strong></summary>

Mac 电脑需要运行 **macOS 13.5 或更新版本**。目前 Mac 发布包尚未经过 Apple 签名或公证，也尚未在 Mac 真机上完成启动和学校登录测试。

确认压缩包来自本项目的 Releases 发布页面，并且校验值与对应的 `.sha256` 文件一致后，先尝试双击 `启动.command`。如果系统阻止运行，请前往「系统设置 → 隐私与安全性」，找到对应提示并选择「仍要打开」。如果 `runtime/node` 也被单独拦截，请以相同方式批准，再重新启动。

[Apple 官方操作说明](https://support.apple.com/zh-cn/102445)

</details>

## 你的消费记录，由你保管

数据采集与统计都在本机完成，消费流水不会发送给第三方分析服务。个人数据、报告和浏览器登录会话保存在 `private/` 文件夹中，**分享程序时请勿包含这个文件夹**。导出的 HTML 网页也可能包含消费明细，分享前请先检查。

**更新到新版本：** 在旧版本中点击「退出工具」，备份 `private/` 文件夹。将新版本的压缩包完整解压到**新的文件夹**，再把旧版的 `private/` 复制到新版本目录中，最后启动新版本。

---

项目构思参考 [SJTU Annual Eat](https://github.com/Milvoid/SJTU-Annual-Eat)，视觉配色参考 [DKU Beamer](https://github.com/EricZQu/DKU-beamer-presentation) 和 [DKU Note](https://github.com/EricZQu/DKU-Note-Template)。这是个人开发的非官方项目，代码采用 [MIT 许可证](LICENSE)。
