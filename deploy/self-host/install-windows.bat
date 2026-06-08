@echo off
REM Camera 3A 课程 · Windows 安装脚本
REM 用法：双击运行，或 cmd 里执行 install-windows.bat [PORT]
REM
REM 做的事：
REM   1. 复制项目到 %USERPROFILE%\Camera3A\
REM   2. 创建启动项快捷方式（开机自启）
REM   3. 启动服务
REM
REM 卸载：双击 uninstall-windows.bat

setlocal

set PORT=%1
if "%PORT%"=="" set PORT=8080

set INSTALL_DIR=%USERPROFILE%\Camera3A
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set START_VBS=%STARTUP_DIR%\Camera3A.vbs

REM 检查 Python
where python >nul 2>nul
if errorlevel 1 (
  where python3 >nul 2>nul
  if errorlevel 1 (
    echo [X] 没找到 Python。请从 https://www.python.org/downloads/ 安装并勾选 "Add to PATH"
    pause
    exit /b 1
  )
  set PYBIN=python3
) else (
  set PYBIN=python
)

echo [✓] 找到 Python: %PYBIN%

REM 源目录（脚本所在目录的上两级）
set SCRIPT_DIR=%~dp0
pushd "%SCRIPT_DIR%\..\.."
set SRC_DIR=%CD%
popd

echo [✓] 源目录: %SRC_DIR%

REM 创建安装目录
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

echo [→] 复制文件到 %INSTALL_DIR% ...
xcopy "%SRC_DIR%\assets" "%INSTALL_DIR%\assets" /E /I /Y /Q >nul
xcopy "%SRC_DIR%\index.html" "%INSTALL_DIR%\" /Y /Q >nul
xcopy "%SRC_DIR%\server.py" "%INSTALL_DIR%\" /Y /Q >nul
if exist "%SRC_DIR%\PRD.txt" xcopy "%SRC_DIR%\PRD.txt" "%INSTALL_DIR%\" /Y /Q >nul
if exist "%SRC_DIR%\README.md" xcopy "%SRC_DIR%\README.md" "%INSTALL_DIR%\" /Y /Q >nul

REM 创建后台启动脚本（VBS 隐藏控制台窗口）
echo [→] 创建开机自启项 %START_VBS% ...
(
  echo Set WshShell = CreateObject^("WScript.Shell"^)
  echo WshShell.CurrentDirectory = "%INSTALL_DIR%"
  echo WshShell.Run """%PYBIN%"" """%INSTALL_DIR%\server.py"" %PORT%", 0, False
) > "%START_VBS%"

REM 立即启动
echo [→] 启动服务 ...
cscript //nologo "%START_VBS%"

REM 等服务起来
timeout /t 3 /nobreak >nul

echo.
echo ===========================================
echo [✓] 安装成功！
echo ===========================================
echo.
echo 访问地址：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
  set IP=%%a
  setlocal enabledelayedexpansion
  echo   → http://!IP: =!:%PORT%/
  endlocal
)
echo   → http://localhost:%PORT%/  (本机)
echo.
echo Windows 重启时自动恢复服务。
echo.
echo 卸载：双击运行 uninstall-windows.bat
echo.
pause
