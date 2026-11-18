$ErrorActionPreference = "Stop"
# Navigation has a separate entry point. Never inherit action-button flags.
$env:HC_ACAO = "visualizar"
$env:HC_CLICAR = "0"
$env:HC_BOTAO = ""
. (Join-Path $PSScriptRoot "concluirAtividade.ps1")
