@echo off
REM Camera 3A Windows 卸载脚本

set INSTALL_DIR=%USERPROFILE%\Camera3A
set START_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\Camera3A.vbs

echo [→] 停止 Python 进程 ...
taskkill /F /IM python.exe /FI "COMMANDLINE eq *Camera3A*server.py*" 2>nul
taskkill /F /IM python3.exe /FI "COMMANDLINE eq *Camera3A*server.py*" 2>nul

echo [→] 删除开机启动项 ...
del /Q "%START_VBS%" 2>nul

echo [→] 删除安装目录 %INSTALL_DIR% ...
rmdir /S /Q "%INSTALL_DIR%" 2>nul

echo [✓] 卸载完成
pause
