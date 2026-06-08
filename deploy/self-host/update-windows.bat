@echo off
REM Camera 3A · Windows 增量更新脚本
REM 用法：双击或在新版本目录里运行 update-windows.bat

setlocal

set INSTALL_DIR=%USERPROFILE%\Camera3A
set START_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Camera3A.vbs

if not exist "%INSTALL_DIR%" (
  echo [X] 没找到 %INSTALL_DIR%，请先跑 install-windows.bat
  pause
  exit /b 1
)

set SCRIPT_DIR=%~dp0
pushd "%SCRIPT_DIR%\..\.."
set SRC_DIR=%CD%
popd

echo [✓] 新版本源: %SRC_DIR%
echo [✓] 安装目录: %INSTALL_DIR%

echo [→] 停止旧服务 ...
taskkill /F /IM python.exe /FI "COMMANDLINE eq *Camera3A*server.py*" 2>nul
taskkill /F /IM python3.exe /FI "COMMANDLINE eq *Camera3A*server.py*" 2>nul
timeout /t 2 /nobreak >nul

echo [→] 覆盖代码文件 ...
xcopy "%SRC_DIR%\assets" "%INSTALL_DIR%\assets" /E /I /Y /Q >nul
xcopy "%SRC_DIR%\index.html" "%INSTALL_DIR%\" /Y /Q >nul
xcopy "%SRC_DIR%\server.py" "%INSTALL_DIR%\" /Y /Q >nul

echo [→] 重启服务 ...
cscript //nologo "%START_VBS%"
timeout /t 3 /nobreak >nul

echo.
echo ===========================================
echo [✓] 更新成功
echo ===========================================
echo.
pause
