@echo off
chcp 65001 >nul

REM 設置 Node.js 路徑優先順序
REM 優先使用 D:\node-v22.17.0-win-x64\ 路徑下的 npx (最新版)
set "NODE_PATH=D:\node-v22.17.0-win-x64"
set "PATH=%NODE_PATH%;%PATH%"

REM 執行 npx 命令並傳遞所有參數
"%NODE_PATH%\npx.cmd" %*
