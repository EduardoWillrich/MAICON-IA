function Ponto-AbaAtividades($palavras, $origem, $quadro = $null) {
  $candidatas = @($palavras | Where-Object {
    (Normalizar $_.T) -eq "ATIVIDADES" -and $_.Y -ge 40 -and
    ($null -eq $quadro -or (
      ($origem.L + $_.X) -ge $quadro.L -and ($origem.L + $_.X) -le $quadro.R -and
      ($origem.T + $_.Y) -ge ($quadro.T - 64) -and ($origem.T + $_.Y) -le ($quadro.T + 56)
    ))
  })
  if ($candidatas.Count -ne 1) { return $null }
  $p = $candidatas[0]
  return @{ X = $origem.L + [int]$p.X + [int]($p.W / 2); Y = $origem.T + [int]$p.Y + [int]($p.H / 2) }
}

function Selecionar-AbaAtividadesUia {
  if (-not $script:hcUiaDisponivel) { return $false }
  try {
    $raiz = [System.Windows.Automation.AutomationElement]::FromHandle($script:janela)
    $condicao = New-Object System.Windows.Automation.PropertyCondition ([System.Windows.Automation.AutomationElement]::ControlTypeProperty), ([System.Windows.Automation.ControlType]::TabItem)
    $abas = @($raiz.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condicao) | Where-Object { -not $_.Current.IsOffscreen -and $_.Current.IsEnabled -and (Normalizar $_.Current.Name) -eq "ATIVIDADES" })
    if ($abas.Count -ne 1) { return $false }
    $padrao = $null
    if (-not $abas[0].TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$padrao)) { return $false }
    $padrao.Select()
    return $true
  } catch { return $false }
}
