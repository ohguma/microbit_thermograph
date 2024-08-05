// サーモグラフィー AMG8833 + NeoPixel x64
// @auhtor  ohguma
// @since   2019-06-27
// @version 2024-08-02 超音波センサ追加
// 
// https://www.switch-science.com/catalog/3395/
// 
// スイッチサイエンス版 同モジュール用ライブラリを参考にした。
// 0x68h=104(10)
// 0x1f 0x50=31 80
// 0x1f 0x45=31 75
// 0x1f 0x57=31 87
// 0x07 0x20= 7 32
// 0x1f 0x00=31  0
// 
// LEDテープはN状でなく、U状に接続し、テープ間の導線を短くする。
// LED　8x8=64個の計測値を表示する。
// ０-１-２-３-４-５-６-７┐
// ┌15-14-13-12-11-10-９-８┘
// └16-17-18-19-20-…(省)
// 
// 青：20度、赤：30度　（色相を変更）
// 31度以上は  白：35度　（再度を変更）
// 19度以下は　黒：10度　（輝度を変更）
// 
// Aボタンで左右反転。
// LED表示が◇：センサがLED側
// LED表示が×：センサが裏側
// 
// Bボタンで最後に測定した温度の最大・最小値を表示
function displayTemp () {
    serial.writeLine("saikou.<NUMK VAL=" + TEMP_MAX + ">do..saitei.<NUMK VAL=" + TEMP_MIN + ">do.")
    basic.clearScreen()
    basic.showString("MAX=" + TEMP_MAX + " MIN=" + TEMP_MIN)
}
function write8 (REG: number, DAT: number) {
    pins.i2cWriteNumber(
    AMG88_ADDR,
    REG,
    NumberFormat.UInt8BE,
    true
    )
    pins.i2cWriteNumber(
    AMG88_ADDR,
    DAT,
    NumberFormat.UInt8BE,
    false
    )
}
input.onButtonPressed(Button.A, function () {
    if (センサ向きがLED側 == 1) {
        センサ向きがLED側 = 0
    } else {
        センサ向きがLED側 = 1
    }
    displayDir2()
})
input.onButtonPressed(Button.B, function () {
    displayTemp()
    displayDir2()
})
function displayDir2 () {
    basic.clearScreen()
    if (センサ向きがLED側 == 1) {
        basic.showIcon(IconNames.Diamond)
    } else {
        basic.showIcon(IconNames.No)
    }
}
let LED色 = 0
let 基本輝度 = 0
let 輝度 = 0
let 彩度 = 0
let POS_LED = 0
let 色相 = 0
let VAL_TEMP = 0
let VAL_SENSOR = 0
let TEMP_MAX_SUB = 0
let TEMP_MIN_SUB = 0
let TEMP_MIN = 0
let TEMP_MAX = 0
let AMG88_ADDR = 0
let センサ向きがLED側 = 0
センサ向きがLED側 = 0
let LED_TAPE = neopixel.create(DigitalPin.P0, 64, NeoPixelMode.RGB)
LED_TAPE.show()
センサ向きがLED側 = 1
serial.redirect(
SerialPin.P1,
SerialPin.P15,
BaudRate.BaudRate9600
)
AMG88_ADDR = 104
write8(31, 80)
write8(31, 75)
write8(31, 87)
write8(7, 32)
write8(31, 0)
displayDir2()
let 近接開始時刻 = input.runningTime()
serial.writeLine("ma'ikurobi'xtuto sa-mogurafu.")
basic.forever(function () {
    if (sonar.ping(
    DigitalPin.P2,
    DigitalPin.P2,
    PingUnit.Centimeters
    ) > 15) {
        近接開始時刻 = input.runningTime()
    }
    if (input.runningTime() - 近接開始時刻 > 1000) {
        displayTemp()
    }
    basic.pause(100)
})
basic.forever(function () {
    TEMP_MIN_SUB = 512
    TEMP_MAX_SUB = -512
    pins.i2cWriteNumber(
    AMG88_ADDR,
    128,
    NumberFormat.UInt8LE,
    true
    )
    for (let CNT_Y = 0; CNT_Y <= 7; CNT_Y++) {
        for (let CNT_X = 0; CNT_X <= 7; CNT_X++) {
            // 1LSBが0.25℃に相当する12bit分解能(11bit+サイン)を持ち、2の補数形式で表される
            VAL_SENSOR = pins.i2cReadNumber(AMG88_ADDR, NumberFormat.UInt16LE, CNT_X != 7 && CNT_Y != 6)
            // センサー計測値                  ：
            // 符号  ：
            // 2進            ：10進  ： あり  ： 温度
            // ---- ---- ---- ： ---- ： ----- ： -------
            // 0111 1111 1111 ： 2047 ：  2047 ：  511.75
            // 0011 1111 1111 ： 1023 ：  1023 ：  255.75
            // 0001 1111 1111 ：  511 ：   511 ：  127.75
            // 0000 1111 1111 ：  255 ：   255 ：   63.75
            // 0000 0111 1111 ：  127 ：   127 ：   31.75
            // 0000 0011 1111 ：   63 ：    63 ：   15.75
            // 0000 0001 1111 ：   31 ：    31 ：    7.75
            // 0000 0000 1111 ：   15 ：    15 ：    3.75
            // 0000 0000 0111 ：    7 ：     7 ：    1.75
            // 0000 0000 0011 ：    3 ：     3 ：    0.75
            // 0000 0000 0001 ：    1 ：     1 ：    0.25
            // 0000 0000 0000 ：    0 ：     0 ：    0
            // 1111 1111 1111 ： 4095 ：    -1 ：   -0.25
            // 1111 1111 1110 ： 4094 ：    -2 ：   -0.5
            // 1111 1111 1100 ： 4092 ：    -4 ：   -1
            // 1111 1111 1000 ： 4088 ：    -8 ：   -2
            // 1111 1111 0000 ： 4080 ：   -16 ：   -4
            // 1111 1110 0000 ： 4064 ：   -32 ：   -8
            // 1111 1100 0000 ： 4032 ：   -64 ：  -16
            // 1111 1000 0000 ： 3968 ：  -128 ：  -32
            // 1111 0000 0000 ： 3840 ：  -256 ：  -64
            // 1110 0000 0000 ： 3584 ：  -512 ： -128
            // 1100 0000 0000 ： 3072 ： -1024 ： -256
            // 1000 0000 0000 ： 2048 ： -2048 ： -512
            VAL_SENSOR = VAL_SENSOR % 4096
            if (VAL_SENSOR <= 2047) {
                VAL_TEMP = VAL_SENSOR / 4
            } else {
                VAL_TEMP = (VAL_SENSOR - 4096) / 4
            }
            VAL_TEMP = Math.round(VAL_TEMP)
            TEMP_MAX_SUB = Math.max(VAL_TEMP, TEMP_MAX_SUB)
            TEMP_MIN_SUB = Math.min(VAL_TEMP, TEMP_MIN_SUB)
            // 色相
            // ----
            // 0 赤
            // 30 橙
            // 60 黄
            // 90 黄緑
            // 120 緑
            // 150 水色
            // 180 水色
            // 210 水色
            // 240 青
            // 270 青紫
            // 300 紫
            // 330 赤紫
            色相 = Math.constrain(Math.map(VAL_TEMP, 20, 30, 240, 0), 0, 240)
            if (CNT_Y % 2 == センサ向きがLED側) {
                POS_LED = CNT_Y * 8 + CNT_X
            } else {
                POS_LED = CNT_Y * 8 + (7 - CNT_X)
            }
            if (VAL_TEMP >= 20 && VAL_TEMP <= 30) {
                彩度 = 99
                輝度 = 基本輝度
            } else if (VAL_TEMP > 30) {
                彩度 = Math.constrain(Math.map(VAL_TEMP, 30, 35, 99, 0), 0, 99)
                輝度 = 基本輝度
            } else {
                彩度 = 99
                輝度 = Math.constrain(Math.map(VAL_TEMP, 10, 20, 0, 基本輝度), 0, 基本輝度)
            }
            LED色 = neopixel.hsl(色相, 彩度, 輝度)
            LED_TAPE.setPixelColor(POS_LED, LED色)
        }
    }
    LED_TAPE.show()
    TEMP_MAX = TEMP_MAX_SUB
    TEMP_MIN = TEMP_MIN_SUB
})
control.inBackground(function () {
    while (基本輝度 < 10) {
        basic.pause(400)
        基本輝度 = 基本輝度 + 1
    }
})
