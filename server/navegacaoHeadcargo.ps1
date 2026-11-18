function Processo-VisivelHc {
  $script:processoVisivel = $false
  [HcClique]::EnumChildWindows($script:janela, {
    param($c, $l)
    if (-not [HcClique]::IsWindowVisible($c)) { return $true }
    $cls = New-Object System.Text.StringBuilder 80
    [void][HcClique]::GetClassName($c, $cls, 80)
    if ($cls.ToString() -ne "TDBEdit") { return $true }
    $txt = New-Object System.Text.StringBuilder 180
    [void][HcClique]::SendMessage($c, 13, [IntPtr]180, $txt)
    if ($txt.ToString().Trim() -ieq $numero) { $script:processoVisivel = $true }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:processoVisivel
}

function Abrir-ProcessoVisualizacao {
  if (Processo-VisivelHc) { return $true }
  if (-not $script:hcUiaDisponivel) { return $false }
  $raiz = [System.Windows.Automation.AutomationElement]::FromHandle($script:janela)
  $elementos = $raiz.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  $buscas = @()
  foreach ($e in $elementos) {
    if ($e.Current.IsOffscreen -or -not $e.Current.IsEnabled) { continue }
    # Never type into a bound ERP field (TDBEdit); only a named search edit.
    if ($e.Current.ClassName -notin @("TEdit", "Edit")) { continue }
    if ((Normalizar $e.Current.Name) -notmatch "^(PESQUISAR|PESQUISA|LOCALIZAR|BUSCAR|NUMERO DO PROCESSO PARA PESQUISA)$") { continue }
    $padrao = $null
    if ($e.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$padrao) -and -not $padrao.Current.IsReadOnly) { $buscas += $e }
  }
  if ($buscas.Count -ne 1) { return $false }
  $campo = $buscas[0]
  $padrao = $campo.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)
  $campo.SetFocus()
  $padrao.SetValue($numero)
  # Enter submits the search, with focus checked immediately beforehand.
  $foco = [System.Windows.Automation.AutomationElement]::FocusedElement
  if (-not [System.Windows.Automation.Automation]::Compare($foco, $campo)) { return $false }
  [HcClique]::Tecla(13)
  for ($i=0; $i -lt 20; $i++) {
    Start-Sleep -Milliseconds 250
    if (Processo-VisivelHc) { return $true }
  }
  return $false
}

function Selecao-AtividadeConfirmada {
  if (-not $script:hcUiaDisponivel) { return $false }
  $raiz = [System.Windows.Automation.AutomationElement]::FromHandle($script:janela)
  $elementos = $raiz.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)
  foreach ($e in $elementos) {
    if ($e.Current.IsOffscreen) { continue }
    $padrao = $null
    if (-not $e.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$padrao)) { continue }
    if (-not $padrao.Current.IsSelected) { continue }
    $texto = Normalizar $e.Current.Name
    if ($texto -and $texto.Contains((Normalizar $nome))) { return $true }
  }
  return $false
}
