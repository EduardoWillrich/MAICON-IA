$ErrorActionPreference = "Stop"

$raiz = Split-Path -Parent $PSScriptRoot
$pasta = Join-Path $raiz "certs"
$pfx = Join-Path $pasta "dev.pfx"
$cer = Join-Path $pasta "ca.cer"
$nome = "maicon.conlinebr.com.br"
$senhaTexto = "maicon-dev"

New-Item -ItemType Directory -Force -Path $pasta | Out-Null

if (-not (Test-Path $pfx)) {
  $senha = ConvertTo-SecureString $senhaTexto -AsPlainText -Force
  $ca = New-SelfSignedCertificate `
    -Subject "CN=Maicon AI Dev CA" `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyUsage CertSign, CRLSign, DigitalSignature `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(5) `
    -TextExtension @("2.5.29.19={critical}{text}CA=true")

  New-SelfSignedCertificate `
    -Subject "CN=$nome" `
    -DnsName $nome, "localhost" `
    -Signer $ca `
    -CertStoreLocation "Cert:\CurrentUser\My" `
    -KeyExportPolicy Exportable `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -HashAlgorithm SHA256 `
    -NotAfter (Get-Date).AddYears(2) `
    -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1") | Out-Null

  $servidor = Get-ChildItem "Cert:\CurrentUser\My" |
    Where-Object { $_.Subject -eq "CN=$nome" -and $_.Issuer -eq $ca.Subject } |
    Sort-Object NotBefore -Descending |
    Select-Object -First 1

  Export-Certificate -Cert $ca -FilePath $cer | Out-Null
  Export-PfxCertificate -Cert $servidor -FilePath $pfx -Password $senha -ChainOption BuildChain | Out-Null

  $loja = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
  $loja.Open("ReadWrite")
  $loja.Add($ca)
  $loja.Close()
  Write-Host "Certificado criado e a CA foi instalada neste usuario."
}

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$linha = "127.0.0.1 $nome"
try {
  $atual = Get-Content -Path $hostsPath -Raw -ErrorAction Stop
  if ($atual -notmatch [regex]::Escape($nome)) {
    Add-Content -Path $hostsPath -Value $linha -ErrorAction Stop
    Write-Host "Hosts atualizado: $linha"
  }
} catch {
  Write-Host "Nao foi possivel gravar o hosts. Adicione como administrador: $linha"
}

Write-Host "Origem para o Google: https://${nome}:5173"
