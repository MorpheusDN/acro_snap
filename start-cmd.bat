@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 日志目录：脚本所在目录下 logs
set "LOG_DIR=%~dp0logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

:: 获取时间戳 精确到 年月日时分秒
for /f "tokens=2 delims==" %%a in ('wmic os get LocalDateTime /value') do set "dt=%%a"
set "ts=%dt:~0,4%-%dt:~4,2%-%dt:~6,2%-%dt:~8,2%-%dt:~10,2%-%dt:~12,2%"

set "baseName=cmd-%ts%"
set "logFile=%LOG_DIR%\!baseName!.log"
set "num=1"

:: 重复文件自动加 (2)(3)...
:loop_check
if exist "!logFile!" (
    set /a num+=1
    set "logFile=%LOG_DIR%\!baseName! (!num!).log"
    goto loop_check
)

:: 美化提示
echo.
echo ------------------------------------------------------------
echo  Terminal Log Session Started
echo  Log File: !logFile!
echo ------------------------------------------------------------
echo.

:: 进入项目目录并打开普通CMD，无嵌套无刷屏
cd /d "%~dp0"
cmd /k