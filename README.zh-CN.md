# 隐流二代 S：SignalRGB 原生插件

[English](README.md)

适用于 **联力 HydroShift II LCD-S（隐流二代 S）** 的社区实验插件。冷头外圈、屏幕和背光直接由 SignalRGB 原生 USB 插件控制，运行时不用桥接程序、额外服务或媒体导入器。

本项目不是联力或 SignalRGB 官方支持。目前只在一台 `1CBE:A034`、产品字符串 `lianli-H2S-1.7`、固件 `lianlih2s_0001_0027` 的设备上验证，软件为 Windows 版 SignalRGB 2.5.74。其他型号、代数和固件未经验证。

## 已实现及验证情况

- 24 灯珠冷头外圈跟随画布，或设置固定颜色。
- SignalRGB 设备亮度和独立外圈亮度控制。
- 亮度归零时清空旧动画，上传单帧全黑。
- 播放／暂停不再混播旧的亮色与黑色；实物测试者确认额外闪三下已消失。
- 480×480 LCD：原生主题、图片入口和屏幕硬件亮度。
- 原生 GIF 预览已确认播放，设备持续确认接收图像；实物 GIF 动画表现尚待确认。
- 只读水温与泵转速，另有内置水温／转速画面及布局、配色设置。

没有泵／风扇转速写入、固件更新或设备重置指令。

## 安装

也可参照 SignalRGB 的[自定义插件安装说明](https://docs.signalrgb.com/troubleshooting/advanced-troubleshooting/replacing-plugin/)。自定义插件会跨软件更新保留；将来改用相同设备的官方插件时，需要移走这份覆盖文件。

1. 下载 `HydroShift_II_S_Native.js`。
2. 放入 SignalRGB 自定义插件目录的子文件夹，通常为 `文档\WhirlwindFX\Plugins\H2S_Local\`。
3. 同一个 USB 只保留一份插件。之前使用过 `H2S_Native_Probe.js` 的，请先把旧文件移到插件目录以外，避免重复匹配。
4. 关闭 L-Connect 界面，并停止正在占用冷头的 L-Connect 服务，让 SignalRGB 独占 USB。
5. 完全退出后重新打开 SignalRGB，设备名称为 **Lian Li HydroShift II S (Experimental)**。
6. 在布局里把设备放到画布内；灯光来源选择 `Canvas` 跟随画布，或 `Forced` 固定颜色。

只需安装预编译的 `HydroShift_II_S_Native.js`，不要把构建脚本、未打包源码和开发用库文件一起放进 SignalRGB 插件目录。

## 设置图片／GIF

设备设置里启用屏幕控制，屏幕来源选择 `SignalRGB LCD`，然后进入设备的 **LCD** 页：

1. 选择支持背景的主题，例如自带的 SignalRGB Logo。
2. **Background Type** 选择 **`image`**。
3. 在 **Media File Path → 浏览** 中选择本地 PNG、JPEG 或 GIF。
4. 使用 Logo 主题时，把 **Display Item** 设为 **None**，避免标志挡住图片。

`media` 不是本地图片／GIF 入口。不支持背景的主题不会显示文件选择入口，例如 ASRock Galactica。

设备设置中的「屏幕硬件亮度」调节实际背光；LCD 页的图像亮度是另一项设置。屏幕上传默认 5 FPS，可调 1–15，高帧率尚未充分验证。

屏幕来源选 `Coolant + Pump` 时显示插件自带的水温／泵转速面板，可在设备设置页改布局和颜色；原生 LCD 预览不显示这个模式。

## 限制

- 外圈分段上传为设备循环动画，约有 1–2 秒延迟，无法保证逐帧同步。
- 暂停通过画布持续全黑判断，并没有直接订阅全局播放／暂停状态。全黑约持续 150ms 后会改为单帧；短黑脉冲仍保留在动画批次里，较长黑色段落的时序可能与画布不同。
- 屏幕与外圈共用 USB；通信失败时暂停相应上传，可禁用后启用设备或重启 SignalRGB 再试。
- 开机接管尚未验证。L-Connect 的自动启动服务仍可能占用 USB，即使界面没有打开。
- 退出或禁用时，用当前静态颜色替换外圈动画；休眠、禁用或亮度为零时使用黑色。
- 不绕过 SignalRGB 的主题或功能授权限制。

## 构建和测试

开发时需要 Node.js，插件运行时不需要。没有 npm 依赖：

```sh
npm run build
npm test
```

测试覆盖亮度归零、旧帧清理、滑块合并、画布暂停／恢复、批次边界暂停、短黑脉冲和退出处理。模拟测试不能代替 USB 与实物验证。

反馈请附型号、USB VID/PID、固件与 SignalRGB 版本，以及触发问题的具体操作。提交日志前去掉序列号、本机个人路径及私密图片。

## 第三方代码与署名

- **andyjusa / hydroshift2-rs（MIT）**：RGB／DES 协议参考与改写；Rust TinyUZ 编码器移植为 JavaScript。
- **sgtaziz / lian-li-linux（MIT）**：A034 屏幕、只读水温／转速和 USB 恢复协议参考。
- **housisong（sisong）/ TinyUZ（MIT）**：压缩格式；开发时使用官方 v1.1.1 工具做离线验证，运行时没有这个程序。
- **Jeff Mott、Evan Vosberg 等 / CryptoJS 4.2.0（MIT）**：实际打包的加密库。
- **Eugene Ware 等 / jpeg-js 0.4.4（BSD-3-Clause）**：实际打包的 JPEG 编码器；保留 Adobe Systems Incorporated 的版权许可与 Andreas Ritter 的移植署名。

项目不是全部从零原创。具体源文件、固定提交、改动和库文件校验值见 [NOTICE.md](NOTICE.md)，项目链接见[英文署名说明](README.md#credits-and-licenses)。完整许可既单独随包提供，也嵌入预编译插件，单独下载插件仍能保留版权与许可。
