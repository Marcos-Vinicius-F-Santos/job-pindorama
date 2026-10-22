@echo off
rem Abre o painel da busca de vagas (tools\painel.py) no navegador.
rem Duplo clique neste arquivo; feche a janela preta para encerrar o painel.
cd /d "%~dp0"
python --version >nul 2>&1
if %errorlevel%==0 (
  python tools\painel.py
) else (
  py tools\painel.py
)
pause
