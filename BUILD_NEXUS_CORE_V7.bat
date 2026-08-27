@echo off
setlocal
cd /d "%~dp0nexus-core"
echo ============================================
echo Nexus Core 0.6.33 - Nexus Crystal V7.1.1
echo ============================================
call gradlew.bat clean check build
if errorlevel 1 (
    echo.
    echo [ERROR] Gradle build/check ha fallado.
    exit /b 1
)
echo.
echo [OK] JAR: %CD%\build\libs\nexus-core-0.6.33.jar
echo Sustituye el Nexus Core anterior en CLIENTE y SERVIDOR.
endlocal
