# push.ps1 — Squash all local (unpushed) commits into one and push
# Usage: .\push.ps1  OR  .\push.ps1 "custom commit message"

$ahead = git rev-list --count origin/main..HEAD 2>$null
if ($LASTEXITCODE -ne 0 -or $ahead -eq 0) {
    Write-Host "Nothing to push." -ForegroundColor Yellow
    exit 0
}

if ($ahead -eq 1) {
    Write-Host "Pushing 1 commit..." -ForegroundColor Cyan
    git push
    exit 0
}

# Build summary from all unpushed commit messages
$messages = git log --format="%s" origin/main..HEAD | Where-Object { $_ }
$summary = if ($args[0]) { $args[0] } else { $messages | Select-Object -First 1 }
$details = ($messages | Select-Object -Skip 1) -join "; "

$fullMsg = if ($details) { "$summary [$details]" } else { $summary }

Write-Host "Squashing $ahead commits into one: '$fullMsg'" -ForegroundColor Cyan
git reset --soft origin/main
git commit -m $fullMsg
git push
Write-Host "Done." -ForegroundColor Green
