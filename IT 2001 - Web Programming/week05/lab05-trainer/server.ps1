# Lab 05 Trainer - a tiny local web server, nothing to install (uses only the PowerShell that comes with Windows).
# It listens only on 127.0.0.1, so no other computer can reach it.
$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
if (-not (Test-Path -LiteralPath (Join-Path $root 'index.html'))) {
    Write-Host "index.html is missing. Extract the whole ZIP before starting." -ForegroundColor Red
    Read-Host 'Press Enter to exit'; exit 1
}
$rootFull = [IO.Path]::GetFullPath($root)

$types = @{
    '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.mjs' = 'text/javascript; charset=utf-8'
    '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json'; '.wasm' = 'application/wasm'
    '.so' = 'application/octet-stream'; '.png' = 'image/png'; '.svg' = 'image/svg+xml'; '.ico' = 'image/x-icon'
}

# First free port from 5186 up
$listener = $null
foreach ($port in 5186..5199) {
    try {
        $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $port)
        $listener.Start(); break
    } catch { $listener = $null }
}
if (-not $listener) { Write-Host 'No free port between 5186 and 5199.' -ForegroundColor Red; Read-Host 'Press Enter to exit'; exit 1 }

$url = "http://127.0.0.1:$port/"
Write-Host ''
Write-Host "  Lab 05 Trainer is running at $url" -ForegroundColor Green
Write-Host '  Do NOT close this window while you practise. When you are done, just close it.' -ForegroundColor Yellow
Write-Host ''
if (-not $env:LAB_NO_BROWSER) { Start-Process $url }

function Send-Response($stream, $status, $type, [byte[]]$body, $isHead) {
    $head = "HTTP/1.1 $status`r`nContent-Type: $type`r`nContent-Length: $($body.Length)`r`nCache-Control: no-cache`r`nConnection: close`r`n`r`n"
    $h = [Text.Encoding]::ASCII.GetBytes($head)
    $stream.Write($h, 0, $h.Length)
    if (-not $isHead -and $body.Length) { $stream.Write($body, 0, $body.Length) }
}

while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
        $client.ReceiveTimeout = 5000
        $stream = $client.GetStream()
        $reader = [IO.StreamReader]::new($stream, [Text.Encoding]::ASCII, $false, 8192, $true)
        $requestLine = $reader.ReadLine()
        while (($line = $reader.ReadLine()) -ne $null -and $line -ne '') { }   # skip the headers
        if (-not $requestLine) { continue }
        $parts = $requestLine.Split(' ')
        $method = $parts[0]; $path = $parts[1].Split('?')[0].Split('#')[0]
        $isHead = $method -eq 'HEAD'
        if ($method -ne 'GET' -and -not $isHead) { Send-Response $stream '405 Method Not Allowed' 'text/plain' ([byte[]]@()) $false; continue }

        $rel = [Uri]::UnescapeDataString($path).TrimStart('/')
        if ($rel -eq '') { $rel = 'index.html' }
        $file = [IO.Path]::GetFullPath((Join-Path $rootFull $rel))
        if (-not $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
            Send-Response $stream '404 Not Found' 'text/plain; charset=utf-8' ([Text.Encoding]::UTF8.GetBytes('Not found')) $isHead
            continue
        }
        $ext = [IO.Path]::GetExtension($file).ToLower()
        $type = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        Send-Response $stream '200 OK' $type ([IO.File]::ReadAllBytes($file)) $isHead
    } catch {
        # connection closed or timed out - just go on
    } finally {
        $client.Close()
    }
}
