Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\SLICRMDATA"

' Terminate any previous stuck instances
WshShell.Run "cmd /c taskkill /f /im node.exe >nul 2>&1 & taskkill /f /im cloudflared.exe >nul 2>&1", 0, True

WScript.Sleep 1000

' Start Master 8TB Server Hub invisibly (0 = hidden)
WshShell.Run "cmd /c ""C:\SLICRMDATA\node.exe"" ""C:\SLICRMDATA\sli_server_hub_bundle.js""", 0, False

WScript.Sleep 3000

' Start Zero-Trust Secure Tunnel invisibly (0 = hidden)
WshShell.Run "cmd /c ""C:\SLICRMDATA\cloudflared.exe"" tunnel --url http://127.0.0.1:8080", 0, False
