# Optional accessibility support for controls which expose native patterns.
$script:hcUiaDisponivel = $false
try {
  Add-Type -AssemblyName UIAutomationClient -ErrorAction Stop
  Add-Type -AssemblyName UIAutomationTypes -ErrorAction Stop
  $script:hcUiaDisponivel = $true
} catch { }

function Definir-ValorUia([IntPtr]$hwnd, [string]$valor) {
  if (-not $script:hcUiaDisponivel -or $hwnd -eq [IntPtr]::Zero) { return $false }
  try {
    $elemento = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
    if (-not $elemento.Current.IsEnabled -or $elemento.Current.ControlType -ne [System.Windows.Automation.ControlType]::Edit) { return $false }
    $padrao = $null
    if (-not $elemento.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$padrao)) { return $false }
    if ($padrao.Current.IsReadOnly) { return $false }
    $padrao.SetValue($valor)
    return $true
  } catch { return $false }
}

function Invocar-BotaoUia([IntPtr]$hwnd) {
  if (-not $script:hcUiaDisponivel -or $hwnd -eq [IntPtr]::Zero) { return $false }
  try {
    $elemento = [System.Windows.Automation.AutomationElement]::FromHandle($hwnd)
    if (-not $elemento.Current.IsEnabled -or $elemento.Current.ControlType -ne [System.Windows.Automation.ControlType]::Button) { return $false }
    $padrao = $null
    if (-not $elemento.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$padrao)) { return $false }
    $padrao.Invoke()
    return $true
  } catch { return $false }
}
