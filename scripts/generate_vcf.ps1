param(
    [int]$Files = 3,
    [int]$ContactsPerFile = 5
)

function New-RandomPhone {
    # Mainland China mobile: 1[3-9]\d{9}
    $second = Get-Random -Minimum 3 -Maximum 10
    $rest = -join ((1..9 | ForEach-Object { Get-Random -Minimum 0 -Maximum 10 })[0..8])
    return "1$second$rest"
}

function New-VcfContact([int]$index) {
    $name = "测试联系人$index"
    $phone = New-RandomPhone
    @(
        'BEGIN:VCARD',
        'VERSION:3.0',
        "N:$name;;;",  # N: Family;Given;Additional;Prefix;Suffix — 简化用法
        "FN:$name",
        "TEL;TYPE=CELL:$phone",
        'END:VCARD'
    ) -join "`r`n"
}

$base = Join-Path $PSScriptRoot '..' | Resolve-Path
$outDir = Join-Path $base 'data/generated-vcf'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

for ($f = 1; $f -le $Files; $f++) {
    $lines = @()
    for ($i = 1; $i -le $ContactsPerFile; $i++) {
        $lines += New-VcfContact -index $i
    }
    $file = Join-Path $outDir ("contacts_$f.vcf")
    $content = ($lines -join "`r`n`r`n") + "`r`n"
    Set-Content -LiteralPath $file -Value $content -Encoding UTF8
    Write-Host "Generated: $file"
}
