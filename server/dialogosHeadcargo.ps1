function Normalizar-DialogoHc([string]$valor) {
  if (-not $valor) { return "" }
  $limpo = $valor.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
  return ($limpo.ToUpperInvariant() -replace '[^A-Z0-9]+', ' ').Trim()
}

function Linha-SistemaHc([string]$texto) {
  $n = Normalizar-DialogoHc $texto
  if (-not $n -or $n -match '^(OK|SIM|NAO|YES|NO|CANCELAR|CANCEL|CONFIRMAR|CUIDADO(?: X)?|ATENCAO(?: X)?)$') { return $true }
  $resto = ($n -replace '\b(?:FECHA|FECHAR|CTRL|F4|ALT|ESPACO|MINIMIZAR|MAXIMIZAR|RESTAURAR|TAMANHO|CENTRALIZAR|MOVER|R)\b', '').Trim()
  return -not $resto
}

function Tipo-DialogoHc([string]$titulo, $linhas) {
  $nome = Normalizar-DialogoHc $titulo
  $corpo = Normalizar-DialogoHc (($linhas | ForEach-Object { $_.Texto }) -join ' ')
  $junto = "$nome $corpo"
  if ($junto -match 'RECONECTAR|FORCAR FECHAMENTO|CONEXAO.*(?:PERDIDA|SERVIDOR|INTERROMPIDA)|SERVIDOR.*(?:PERDID|DESCONECT|INDISPONIVEL)') { return 'conexao' }
  if ($nome -match 'ESCOLHA DE CAMINHO' -or $corpo -match 'CAMINHO A SER TOMADO') { return 'caminho' }
  # A window titled Cuidado can report any error, including a lost connection.
  if ($corpo -match 'PREENCHER (?:OS )?CAMPOS|NECESSARIO PREENCHER|CAMPOS (?:ABAIXO|OBRIGATORIOS)') { return 'campos' }
  $uteis = @($linhas | Where-Object { -not (Linha-SistemaHc $_.Texto) })
  if ($linhas.Count -gt 0 -and -not $uteis.Count) { return 'menu' }
  return ''
}

function Campos-PedidosHc($linhas) {
  if ((Tipo-DialogoHc '' $linhas) -ne 'campos') { return @() }
  $lista = @()
  foreach ($linha in @($linhas)) {
    $t = ([string]$linha.Texto).Trim()
    $n = Normalizar-DialogoHc $t
    if ($n.Length -lt 3 -or (Linha-SistemaHc $t)) { continue }
    if ($n -match 'PREENCHER (?:OS )?CAMPOS|NECESSARIO PREENCHER|CAMPOS ABAIXO|CAMPOS OBRIGATORIOS|PARA CONFIRMAR A ATIVIDADE') {
      # Some dialogs list fields after a colon on the same line.
      if ($t -match ':\s*(.+)$') {
        foreach ($campo in @($Matches[1] -split ';')) { if ($campo.Trim() -and -not (Linha-SistemaHc $campo)) { $lista += $campo.Trim().TrimEnd('.') } }
      }
      continue
    }
    $lista += $t.TrimEnd('.')
  }
  return @($lista | Select-Object -Unique)
}

function Texto-UtilHc($linhas) {
  return @($linhas | Where-Object { ([string]$_.Texto).Trim().Length -ge 3 -and -not (Linha-SistemaHc $_.Texto) } | ForEach-Object { ([string]$_.Texto).Trim() })
}
