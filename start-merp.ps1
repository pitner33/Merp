# Launch backend, frontend, and open the app in Chrome.
$backendDir  = "D:\.WINDSURF\workspace\merp\backend"
$frontendDir = "D:\.WINDSURF\workspace\merp\frontend"
$chromePath  = "C:\Program Files\Google\Chrome\Application\chrome.exe"

$backendArgs = @(
    '-NoExit'
    '-Command'
    '& { . .\env.local.ps1; .\mvnw.cmd spring-boot:run }'
)

$frontendArgs = @(
    '-NoExit'
    '-Command'
    '& { npm run dev -- --host --port 5173 }'
)

Start-Process -FilePath "powershell.exe" -WorkingDirectory $backendDir -ArgumentList $backendArgs
Start-Process -FilePath "powershell.exe" -WorkingDirectory $frontendDir -ArgumentList $frontendArgs

Start-Sleep -Seconds 8

if (Test-Path $chromePath) {
    Start-Process -FilePath $chromePath -ArgumentList '--new-window','http://localhost:5173/home'
} else {
    Start-Process -FilePath "http://localhost:5173/home"
}
