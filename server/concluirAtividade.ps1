$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "headcargoUia.ps1")
. (Join-Path $PSScriptRoot "abaAtividades.ps1")
. (Join-Path $PSScriptRoot "dialogosHeadcargo.ps1")
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$OutputEncoding = [Console]::OutputEncoding
Add-Type @"
using System.Runtime.InteropServices;
public class HcDpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@
[void][HcDpi]::SetProcessDPIAware()
$numero = [string]$env:HC_NUMERO
$nome = [string]$env:HC_NOME
$codigo = [string]$env:HC_CODIGO
$caminhoPedido = [string]$env:HC_CAMINHO
$acao = [string]$env:HC_ACAO
$pedidoBotao = ""
function Nome-Botao([string]$rotulo) {
  if (-not $rotulo) { return "o botão" }
  return $rotulo.Substring(0, 1) + $rotulo.Substring(1).ToLowerInvariant()
}
function Mesmo-Botao([string]$visto, [string]$pedido) {
  $a = Normalizar $visto
  $b = Normalizar $pedido
  if (-not $a -or -not $b) { return $false }
  if ($a -eq $b) { return $true }
  $n = [Math]::Min(5, [Math]::Min($a.Length, $b.Length))
  if ($n -lt 4) { return $false }
  return $a.Substring(0, $n) -eq $b.Substring(0, $n)
}
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Storage.StorageFile, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType=WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType=WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1"
})[0]
function Await-Win($op, $tipo) {
  $tarefa = $asTask.MakeGenericMethod($tipo).Invoke($null, @($op))
  $tarefa.Wait()
  $tarefa.Result
}
function Normalizar([string]$valor) {
  if (-not $valor) { return "" }
  $limpo = $valor.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $limpo.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$sb.Append($c)
    }
  }
  return ($sb.ToString().ToUpperInvariant() -replace "[^A-Z0-9]+", " ").Trim()
}
$pedidoBotao = Normalizar ([string]$env:HC_BOTAO)
if (-not $pedidoBotao) { $pedidoBotao = if ($acao -eq "restaurar") { "RESTAURAR" } else { "CONCLUIR" } }
$rotuloBotao = $pedidoBotao
$nomeBotao = Nome-Botao $pedidoBotao
$verbo = switch ($pedidoBotao) {
  "RESTAURAR" { "restauro" }
  "CONCLUIR" { "concluo" }
  "CANCELAR" { "cancelo" }
  default { "altero" }
}
$feito = switch ($pedidoBotao) {
  "RESTAURAR" { "restaurei" }
  "CONCLUIR" { "concluí" }
  "CANCELAR" { "cancelei" }
  "ENCERRAR" { "encerrei" }
  "INICIAR" { "iniciei" }
  default { "alterei" }
}
$clicar = $env:HC_CLICAR -eq "1"
$visualizar = $acao -eq "visualizar"
if ($visualizar -and $clicar) { Write-Output "ERRO A navegação não permite botões de alteração."; exit 0 }
if (-not $visualizar -and $numero -notmatch "\s+teste$") { Write-Output "ERRO Só $verbo atividade de processo teste."; exit 0 }
if (-not $nome.Trim()) { Write-Output "ERRO Falta o nome da atividade."; exit 0 }

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class HcClique {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint proc);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern IntPtr ChildWindowFromPointEx(IntPtr h, POINT p, uint flags);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetLastActivePopup(IntPtr h);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, System.UIntPtr extra);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, System.UIntPtr extra);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr depois, int x, int y, int cx, int cy, uint flags);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  [DllImport("user32.dll", CharSet = CharSet.Auto)] public static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, StringBuilder s);
  [DllImport("user32.dll", EntryPoint = "SendMessage")] public static extern IntPtr Enviar(IntPtr h, int msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessage")] public static extern IntPtr DefinirTexto(IntPtr h, int msg, IntPtr w, string s);
  public struct RECT { public int L; public int T; public int R; public int B; }
  public struct POINT { public int X; public int Y; }
  public static IntPtr Fundo(IntPtr raiz, int sx, int sy) {
    IntPtr atual = raiz;
    for (int i = 0; i < 12; i++) {
      POINT p = new POINT { X = sx, Y = sy };
      if (!ScreenToClient(atual, ref p)) break;
      IntPtr filho = ChildWindowFromPointEx(atual, p, 0);
      if (filho == IntPtr.Zero || filho == atual) break;
      atual = filho;
    }
    return atual;
  }
  public static void Ativar(IntPtr h) {
    if (h == IntPtr.Zero) return;
    uint ignorado;
    uint deles = GetWindowThreadProcessId(GetForegroundWindow(), out ignorado);
    uint alvo = GetWindowThreadProcessId(h, out ignorado);
    uint meu = GetCurrentThreadId();
    AttachThreadInput(meu, deles, true);
    AttachThreadInput(meu, alvo, true);
    if (IsIconic(h)) ShowWindow(h, 9);
    SetForegroundWindow(h);
    AttachThreadInput(meu, alvo, false);
    AttachThreadInput(meu, deles, false);
  }
  public static void CliqueReal(int x, int y) {
    POINT antes;
    GetCursorPos(out antes);
    SetCursorPos(x, y);
    System.Threading.Thread.Sleep(200);
    mouse_event(0x0002, 0, 0, 0, System.UIntPtr.Zero);
    System.Threading.Thread.Sleep(100);
    mouse_event(0x0004, 0, 0, 0, System.UIntPtr.Zero);
    System.Threading.Thread.Sleep(200);
    SetCursorPos(antes.X, antes.Y);
  }
  public static void Tecla(byte vk) {
    keybd_event(vk, 0, 0, System.UIntPtr.Zero);
    keybd_event(vk, 0, 2, System.UIntPtr.Zero);
  }
  public static void Clicar(IntPtr raiz, int sx, int sy) {
    IntPtr alvo = Fundo(raiz, sx, sy);
    if (alvo == IntPtr.Zero) alvo = raiz;
    POINT p = new POINT { X = sx, Y = sy };
    if (!ScreenToClient(alvo, ref p)) return;
    int packed = (p.Y << 16) | (p.X & 0xFFFF);
    PostMessage(alvo, 0x0200, IntPtr.Zero, (IntPtr)packed);
    PostMessage(alvo, 0x0201, (IntPtr)1, (IntPtr)packed);
    PostMessage(alvo, 0x0202, IntPtr.Zero, (IntPtr)packed);
  }
  public static void Apertar(IntPtr botao) {
    Enviar(botao, 0x00F5, IntPtr.Zero, IntPtr.Zero);
  }
  public static void Esconder(IntPtr h) {
    ShowWindow(h, 7);
    SetWindowPos(h, (IntPtr)1, 0, 0, 0, 0, 0x0013);
  }
  public static void Devolver(IntPtr antes) {
    if (antes == IntPtr.Zero || GetForegroundWindow() == antes) return;
    uint ignorado;
    uint deles = GetWindowThreadProcessId(GetForegroundWindow(), out ignorado);
    uint antigo = GetWindowThreadProcessId(antes, out ignorado);
    uint meu = GetCurrentThreadId();
    AttachThreadInput(meu, deles, true);
    AttachThreadInput(meu, antigo, true);
    SetForegroundWindow(antes);
    AttachThreadInput(meu, antigo, false);
    AttachThreadInput(meu, deles, false);
  }
}
"@

$processos = @(Get-Process -Name Desktop -ErrorAction SilentlyContinue)
if (-not $processos.Count) { Write-Output "ERRO O HeadCargo não está aberto neste computador."; exit 0 }
$ids = @{}
foreach ($p in $processos) { $ids[[uint32]$p.Id] = $true }
$script:janela = [IntPtr]::Zero
$script:janelasHeadCargo = 0
$script:ids = $ids
[HcClique]::EnumWindows({
  param($h, $l)
  $dono = [uint32]0
  [void][HcClique]::GetWindowThreadProcessId($h, [ref]$dono)
  if (-not $script:ids.ContainsKey($dono)) { return $true }
  $classe = New-Object System.Text.StringBuilder 80
  [void][HcClique]::GetClassName($h, $classe, 80)
  if ($classe.ToString() -eq "TfrmPrincipal") { $script:janela = $h; $script:janelasHeadCargo++ }
  return $true
}, [IntPtr]::Zero) | Out-Null
if ($script:janela -eq [IntPtr]::Zero) { Write-Output "ERRO O HeadCargo não está aberto neste computador."; exit 0 }
if ($visualizar -and $script:janelasHeadCargo -ne 1) { Write-Output "ERRO Há mais de uma janela do HeadCargo. Mantenha somente a janela desejada aberta."; exit 0 }

if ($visualizar) {
  . (Join-Path $PSScriptRoot "navegacaoHeadcargo.ps1")
  [HcClique]::Ativar($script:janela)
  if (-not (Abrir-ProcessoVisualizacao)) { Write-Output "ERRO Não consegui confirmar o processo $numero. Abra a tela de processos logísticos do HeadCargo e tente novamente. Nenhum campo do cadastro foi preenchido."; exit 0 }
}

$script:achouNumero = $false
$script:numero = $numero
[HcClique]::EnumChildWindows($script:janela, {
  param($c, $l)
  $classe = New-Object System.Text.StringBuilder 40
  [void][HcClique]::GetClassName($c, $classe, 40)
  if ($classe.ToString() -ne "TDBEdit") { return $true }
  $lido = New-Object System.Text.StringBuilder 180
  [void][HcClique]::SendMessage($c, 13, [IntPtr]180, $lido)
  if ($lido.ToString().Trim() -eq $script:numero) { $script:achouNumero = $true }
  return -not $script:achouNumero
}, [IntPtr]::Zero) | Out-Null
if (-not $script:achouNumero -and -not $visualizar) {
  $marca = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:janela, [ref]$marca)
  $script:filtro = [IntPtr]::Zero
  [HcClique]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ($script:filtro -ne [IntPtr]::Zero) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcClique]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -ne "TDBEdit" -or -not [HcClique]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcClique+RECT
    [void][HcClique]::GetWindowRect($c, [ref]$rr)
    if (($rr.T - $marca.T) -gt 240 -or ($rr.R - $rr.L) -lt 90 -or ($rr.R - $rr.L) -gt 240) { return $true }
    $lido = New-Object System.Text.StringBuilder 80
    [void][HcClique]::SendMessage($c, 13, [IntPtr]80, $lido)
    if ($lido.ToString() -match "[A-Za-z]{1,4}\d{2,6}-\d{2}") { $script:filtro = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:filtro -ne [IntPtr]::Zero) {
    [void][HcClique]::DefinirTexto($script:filtro, 0x000C, [IntPtr]::Zero, $numero)
    [void][HcClique]::Enviar($script:filtro, 0x0100, [IntPtr]13, [IntPtr]::Zero)
    [void][HcClique]::Enviar($script:filtro, 0x0101, [IntPtr]13, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 1200
    $script:achouNumero = $false
    [HcClique]::EnumChildWindows($script:janela, {
      param($c, $l)
      $classe = New-Object System.Text.StringBuilder 40
      [void][HcClique]::GetClassName($c, $classe, 40)
      if ($classe.ToString() -ne "TDBEdit") { return $true }
      $lido = New-Object System.Text.StringBuilder 180
      [void][HcClique]::SendMessage($c, 13, [IntPtr]180, $lido)
      if ($lido.ToString().Trim() -eq $script:numero) { $script:achouNumero = $true }
      return -not $script:achouNumero
    }, [IntPtr]::Zero) | Out-Null
  }
}
if (-not $script:achouNumero) { Write-Output "ERRO O HeadCargo aberto não está no processo $numero."; exit 0 }

Add-Type -AssemblyName System.Windows.Forms
$script:frente = [HcClique]::GetForegroundWindow()
$script:origem = New-Object HcClique+RECT
[void][HcClique]::GetWindowRect($script:janela, [ref]$script:origem)
$script:escondido = [HcClique]::IsIconic($script:janela) -or -not [HcClique]::IsWindowVisible($script:janela)
$script:moveu = $false
function Restaurar-HeadCargo {
  if ($visualizar) { return }
  if ($script:moveu) {
    if ($script:escondido) {
      [void][HcClique]::ShowWindow($script:janela, 7)
    } else {
      $o = $script:origem
      [void][HcClique]::SetWindowPos($script:janela, [IntPtr]1, $o.L, $o.T, ($o.R - $o.L), ($o.B - $o.T), 0x0010)
    }
  }
  [HcClique]::Devolver($script:frente)
}
function Mostrar-SemCobrir {
  $frenteRect = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:frente, [ref]$frenteRect)
  $cx = [int](($frenteRect.L + $frenteRect.R) / 2)
  $cy = [int](($frenteRect.T + $frenteRect.B) / 2)
  $telas = @([System.Windows.Forms.Screen]::AllScreens)
  $ocupada = $telas | Where-Object {
    $cx -ge $_.Bounds.X -and $cx -lt ($_.Bounds.X + $_.Bounds.Width) -and $cy -ge $_.Bounds.Y -and $cy -lt ($_.Bounds.Y + $_.Bounds.Height)
  } | Select-Object -First 1
  $livre = $telas | Where-Object { -not $ocupada -or $_.DeviceName -ne $ocupada.DeviceName } | Select-Object -First 1
  if (-not $livre) { $livre = $telas[0] }
  $area = $livre.WorkingArea
  $largura = [Math]::Min(1500, $area.Width)
  $altura = [Math]::Min(900, $area.Height)
  $x = $area.X + 20
  $y = $area.Y + 20
  [void][HcClique]::SetWindowPos($script:janela, [IntPtr]::Zero, $x, $y, $largura, $altura, 0x0050)
  if ([HcClique]::IsIconic($script:janela)) { [void][HcClique]::ShowWindow($script:janela, 4) }
  [void][HcClique]::SetWindowPos($script:janela, [IntPtr]::Zero, $x, $y, $largura, $altura, 0x0050)
  $script:moveu = $true
  Start-Sleep -Milliseconds 400
}
function Barra-Atividades {
  $script:barra = [IntPtr]::Zero
  $script:barraAltura = 0
  $marca = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:janela, [ref]$marca)
  $script:limiteBarra = $marca.L + [int](($marca.R - $marca.L) * 0.62)
  [HcClique]::EnumChildWindows($script:janela, {
    param($c, $l)
    $cls = New-Object System.Text.StringBuilder 48
    [void][HcClique]::GetClassName($c, $cls, 48)
    if ($cls.ToString() -ne "TcxControlScrollBar") { return $true }
    if (-not [HcClique]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcClique+RECT
    [void][HcClique]::GetWindowRect($c, [ref]$rr)
    $largura = $rr.R - $rr.L
    $altura = $rr.B - $rr.T
    if ($largura -gt 28 -or $altura -lt 180 -or $rr.L -gt $script:limiteBarra) { return $true }
    if ($altura -gt $script:barraAltura) { $script:barraAltura = $altura; $script:barra = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:barra
}
function Rolar-Atividades([int]$paraCima, [int]$vezes) {
  $barra = Barra-Atividades
  if ($barra -eq [IntPtr]::Zero) { return $false }
  $pai = [HcClique]::GetParent($barra)
  if ($pai -eq [IntPtr]::Zero) { return $false }
  $codigo = if ($paraCima -eq 1) { [IntPtr]0 } else { [IntPtr]1 }
  for ($i = 0; $i -lt $vezes; $i++) {
    [void][HcClique]::Enviar($pai, 0x0115, $codigo, $barra)
  }
  Start-Sleep -Milliseconds 220
  return $true
}
function Foto-Janela {
  $r = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:janela, [ref]$r)
  $w = $r.R - $r.L
  $h = $r.B - $r.T
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [void][HcClique]::PrintWindow($script:janela, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  return $bmp
}
function Clicar-NoControle([IntPtr]$hwnd, [int]$sx, [int]$sy) {
  if (Invocar-BotaoUia $hwnd) { return }
  $p = New-Object HcClique+POINT
  $p.X = $sx
  $p.Y = $sy
  [void][HcClique]::ScreenToClient($hwnd, [ref]$p)
  $marca = [IntPtr]((($p.Y -band 0xFFFF) -shl 16) -bor ($p.X -band 0xFFFF))
  [void][HcClique]::PostMessage($hwnd, 0x0201, [IntPtr]1, $marca)
  [void][HcClique]::PostMessage($hwnd, 0x0202, [IntPtr]::Zero, $marca)
}
function Localizar-QuadroAtividades {
  $script:frameAtiv = [IntPtr]::Zero
  $script:quadroAtiv = [IntPtr]::Zero
  [HcClique]::EnumChildWindows($script:janela, {
    param($c, $l)
    $cls = New-Object System.Text.StringBuilder 40
    [void][HcClique]::GetClassName($c, $cls, 40)
    if ($cls.ToString() -ne "TFrameHost") { return $true }
    $lido = New-Object System.Text.StringBuilder 40
    [void][HcClique]::SendMessage($c, 13, [IntPtr]40, $lido)
    if ($lido.ToString() -ne "Atividades") { return $true }
    $script:frameAtiv = $c
    $script:quadroAtiv = [HcClique]::GetParent($c)
    return $true
  }, [IntPtr]::Zero) | Out-Null
}
function Abrir-Atividades {
  if ([HcClique]::IsIconic($script:janela)) { [void][HcClique]::ShowWindow($script:janela, 9); Start-Sleep -Milliseconds 300 }
  [HcClique]::Ativar($script:janela)
  Localizar-QuadroAtividades
  if ($script:frameAtiv -ne [IntPtr]::Zero -and [HcClique]::IsWindowVisible($script:frameAtiv)) { return $true }
  if (Selecionar-AbaAtividadesUia) {
    for ($i=0; $i -lt 10; $i++) {
      Start-Sleep -Milliseconds 150
      Localizar-QuadroAtividades
      if ($script:frameAtiv -ne [IntPtr]::Zero -and [HcClique]::IsWindowVisible($script:frameAtiv)) { return $true }
    }
  }
  $origem = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:janela, [ref]$origem)
  $faixa = $null
  if ($script:quadroAtiv -ne [IntPtr]::Zero) {
    $faixa = New-Object HcClique+RECT
    [void][HcClique]::GetWindowRect($script:quadroAtiv, [ref]$faixa)
  }
  $bmp = Foto-Janela
  $caminho = Join-Path $env:TEMP "hc-aba-atividades.png"
  try { $bmp.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png) } finally { $bmp.Dispose() }
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($caminho)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  if (-not $script:ocr) { $script:ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages() }
  if (-not $script:ocr) { return $false }
  $lido = Await-Win ($script:ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavrasAba = @($lido.Lines | ForEach-Object { $_.Words } | ForEach-Object { [pscustomobject]@{ T=[string]$_.Text; X=[int]$_.BoundingRect.X; Y=[int]$_.BoundingRect.Y; W=[int]$_.BoundingRect.Width; H=[int]$_.BoundingRect.Height } })
  $ponto = Ponto-AbaAtividades $palavrasAba $origem $faixa
  if ($null -eq $ponto) { return $false }
  # The page's parent is not necessarily the control that owns the tab strip.
  $destino = [HcClique]::Fundo($script:janela, $ponto.X, $ponto.Y)
  if ($destino -eq [IntPtr]::Zero) { return $false }
  Clicar-NoControle $destino $ponto.X $ponto.Y
  for ($tentativa=0; $tentativa -lt 2; $tentativa++) {
    for ($espera=0; $espera -lt 10; $espera++) {
      Start-Sleep -Milliseconds 150
      Localizar-QuadroAtividades
      if ($script:frameAtiv -ne [IntPtr]::Zero -and [HcClique]::IsWindowVisible($script:frameAtiv)) { Start-Sleep -Milliseconds 200; return $true }
    }
    if ($tentativa -eq 0 -and [HcClique]::GetForegroundWindow() -eq $script:janela) { [HcClique]::CliqueReal($ponto.X, $ponto.Y) }
  }
  return $false
}
function Texto-Grupo($grupo) {
  return Normalizar (($grupo.Palavras | Sort-Object { [int]$_.X } | ForEach-Object { $_.T }) -join " ")
}
function So-Digitos([string]$valor) {
  return ([regex]::Replace((Normalizar $valor), "[^0-9]", ""))
}
function Valor-Codigo([string]$valor) {
  $texto = Normalizar $valor
  if ($texto -match "^(\d{3,4}) (\d+)$") {
    return ([int]$Matches[1] * 100) + [Math]::Min(99, [int]$Matches[2])
  }
  $digitos = So-Digitos $texto
  if ($digitos -match "^(\d{4})(\d{1,2})$") {
    return ([int]$Matches[1] * 100) + [Math]::Min(99, [int]$Matches[2])
  }
  if ($digitos -match "^(\d{3,4})$") { return [int]$Matches[1] * 100 }
  return -1
}
function Limite-Grade {
  $barra = Barra-Atividades
  if ($barra -eq [IntPtr]::Zero) { return 1100 }
  $caixa = New-Object HcClique+RECT
  $marca = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($barra, [ref]$caixa)
  [void][HcClique]::GetWindowRect($script:janela, [ref]$marca)
  return [Math]::Max(240, $caixa.L - $marca.L - 8)
}
function Linhas-Grade($palavras) {
  $limite = Limite-Grade
  $uteis = @($palavras | Where-Object { $_.X -lt $limite -and $_.Y -gt 320 })
  $linhas = New-Object System.Collections.Generic.List[object]
  foreach ($p in @($uteis | Sort-Object { [int]$_.Y }, { [int]$_.X })) {
    $ultima = if ($linhas.Count) { $linhas[$linhas.Count - 1] } else { $null }
    if ($ultima -and [Math]::Abs([int]$p.Y - [int]$ultima.Y) -le 8) {
      [void]$ultima.Palavras.Add($p)
    } else {
      $grupo = New-Object System.Collections.Generic.List[object]
      [void]$grupo.Add($p)
      [void]$linhas.Add([pscustomobject]@{ Y = [int]$p.Y; Palavras = $grupo })
    }
  }
  $prontas = @()
  foreach ($grupo in $linhas) {
    $tokens = New-Object System.Collections.ArrayList
    foreach ($item in $grupo.Palavras) { [void]$tokens.Add($item) }
    $nomeTokens = @($tokens | Where-Object { (Normalizar $_.T) -match "[A-Z]" -and (Normalizar $_.T).Length -gt 2 })
    if (-not $nomeTokens.Count) { continue }
    $inicioNome = [int]$nomeTokens[0].X
    $nomeTokens = @($nomeTokens | Where-Object { [int]$_.X -lt ($inicioNome + 760) })
    $codigoTok = $null
    foreach ($token in $tokens) {
      if ([int]$token.X -ge $inicioNome) { continue }
      if ([int]$token.X -lt ($inicioNome - 140)) { continue }
      $limpo = Normalizar $token.T
      if ($limpo -notmatch "^\d{3,6}( \d+)*$") { continue }
      if (-not $codigoTok -or [int]$token.X -gt [int]$codigoTok.X) { $codigoTok = $token }
    }
    $nome = Normalizar (($nomeTokens | ForEach-Object { $_.T }) -join " ")
    $codigo = if ($codigoTok) { [string]$codigoTok.T } else { "" }
    $clique = $nomeTokens[0]
    foreach ($token in $nomeTokens) { if ([int]$token.W -gt [int]$clique.W) { $clique = $token } }
    $prontas += [pscustomobject]@{ Y = $grupo.Y; Nome = $nome; Codigo = $codigo; Clique = $clique }
  }
  return $prontas
}
function Alvos-NaTela($palavras) {
  $grade = @(Linhas-Grade $palavras)
  $candidatos = @()
  $pedido = So-Digitos $codigo
  $pedidoValor = Valor-Codigo $codigo
  $palavrasNome = @($nomeNorm -split " " | Where-Object { $_.Length -gt 2 })
  $trecho = ($palavrasNome | Select-Object -First 3) -join " "
  foreach ($linha in $grade) {
    $valorLinha = Valor-Codigo $linha.Codigo
    $porCodigo = ($pedidoValor -ge 0 -and $valorLinha -eq $pedidoValor) -or ($pedido.Length -ge 3 -and (So-Digitos $linha.Codigo) -eq $pedido)
    $achou = @($palavrasNome | Where-Object { $linha.Nome.Contains($_) }).Count
    $porNome = $nomeNorm -and ($linha.Nome.Contains($nomeNorm) -or ($trecho.Length -ge 8 -and $linha.Nome.Contains($trecho)))
    if ($visualizar -and -not $porCodigo -and -not $linha.Nome.Contains($nomeNorm)) { continue }
    if (-not $porCodigo -and -not $porNome) { continue }
    $pontos = $achou
    if ($porCodigo) { $pontos += 50 }
    if ($linha.Nome.Contains($nomeNorm)) { $pontos += 20 }
    $candidatos += [pscustomobject]@{ Linha = $linha; Pontos = $pontos; PorCodigo = $porCodigo }
  }
  if (-not $candidatos.Count) { return @() }
  $porCodigo = @($candidatos | Where-Object { $_.PorCodigo })
  if ($porCodigo.Count -eq 1) { return @($porCodigo[0].Linha) }
  if ($porCodigo.Count -gt 1) { $candidatos = $porCodigo }
  $maior = ($candidatos | Measure-Object Pontos -Maximum).Maximum
  return @($candidatos | Where-Object { $_.Pontos -eq $maior } | ForEach-Object { $_.Linha })
}
try {

$ret = New-Object HcClique+RECT
[void][HcClique]::GetWindowRect($script:janela, [ref]$ret)
$largura = $ret.R - $ret.L
$altura = $ret.B - $ret.T
if ($largura -lt 200 -or $altura -lt 200) { Write-Output "ERRO A janela do HeadCargo está pequena demais para achar a atividade."; exit 0 }
if (-not (Abrir-Atividades)) { Write-Output "ERRO Não consegui ativar e confirmar a aba Atividades do processo $numero. Nenhum botão de conclusão foi acionado."; exit 0 }
$ret = New-Object HcClique+RECT
[void][HcClique]::GetWindowRect($script:janela, [ref]$ret)
$largura = $ret.R - $ret.L
$altura = $ret.B - $ret.T
$bmp = Foto-Janela
$foto = Join-Path $env:TEMP "hc-concluir.png"
$brilho = 0L
for ($y = 0; $y -lt $altura; $y += 48) {
  for ($x = 0; $x -lt $largura; $x += 48) {
    $cor = $bmp.GetPixel($x, $y)
    $brilho += ($cor.R + $cor.G + $cor.B)
  }
}
if ($brilho -lt 1000) {
  $bmp.Dispose()
  if ([HcClique]::IsIconic($script:janela)) { [void][HcClique]::ShowWindow($script:janela, 4) }
  Start-Sleep -Milliseconds 300
  $ret = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($script:janela, [ref]$ret)
  $largura = $ret.R - $ret.L
  $altura = $ret.B - $ret.T
  $bmp = Foto-Janela
}
$bmp.Save($foto, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

$arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($foto)) ([Windows.Storage.StorageFile])
$fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
$ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$script:ocr = $ocr
if (-not $ocr) { Write-Output "ERRO Não consegui ler a tela do HeadCargo."; exit 0 }
$lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$palavras = New-Object System.Collections.Generic.List[object]
foreach ($linha in $lido.Lines) {
  foreach ($p in $linha.Words) {
    $palavras.Add([pscustomobject]@{
      T = [string]$p.Text
      X = [int]$p.BoundingRect.X
      Y = [int]$p.BoundingRect.Y
      W = [int]$p.BoundingRect.Width
      H = [int]$p.BoundingRect.Height
    }) | Out-Null
  }
}
$nomeNorm = Normalizar $nome
$codigoNorm = Normalizar $codigo
$alvos = @()
$rolagem = 0
$anterior = ""
$parado = $false
while ($rolagem -le 16) {
  if ($rolagem -gt 0) {
    $ret = New-Object HcClique+RECT
    [void][HcClique]::GetWindowRect($script:janela, [ref]$ret)
    $largura = $ret.R - $ret.L
    $altura = $ret.B - $ret.T
    $bmp = Foto-Janela
    $bmp.Save($foto, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($foto)) ([Windows.Storage.StorageFile])
    $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $palavras = New-Object System.Collections.Generic.List[object]
    foreach ($linha in $lido.Lines) {
      foreach ($p in $linha.Words) {
        $palavras.Add([pscustomobject]@{
          T = [string]$p.Text
          X = [int]$p.BoundingRect.X
          Y = [int]$p.BoundingRect.Y
          W = [int]$p.BoundingRect.Width
          H = [int]$p.BoundingRect.Height
        }) | Out-Null
      }
    }
  }
  $linhas = New-Object System.Collections.Generic.List[object]
  foreach ($p in @($palavras | Sort-Object { [int]$_.Y }, { [int]$_.X })) {
    $ultima = if ($linhas.Count) { $linhas[$linhas.Count - 1] } else { $null }
    if ($ultima -and [Math]::Abs($p.Y - $ultima.Y) -le 12) {
      $ultima.Palavras.Add($p) | Out-Null
    } else {
      $grupo = New-Object System.Collections.Generic.List[object]
      $grupo.Add($p) | Out-Null
      $linhas.Add([pscustomobject]@{ Y = $p.Y; Palavras = $grupo }) | Out-Null
    }
  }
  $assinaturaSb = New-Object System.Text.StringBuilder
  foreach ($item in $palavras) {
    [void]$assinaturaSb.Append($item.Y).Append(",").Append($item.X).Append(",").Append($item.T).Append("|")
  }
  $assinatura = $assinaturaSb.ToString()
  if ($rolagem -gt 0 -and $assinatura -eq $anterior) {
    if ($parado) { break }
    $parado = $true
  } else {
    $parado = $false
  }
  $anterior = $assinatura
  $alvos = @(Alvos-NaTela $palavras)
  if ($alvos.Count -ge 1) { break }
  $grade = @(Linhas-Grade $palavras)
  $pedidoValor = Valor-Codigo $codigo
  $valores = @($grade | ForEach-Object { Valor-Codigo $_.Codigo } | Where-Object { $_ -ge 0 })
  $sentido = 0
  if ($pedidoValor -ge 0 -and $valores.Count) {
    $menor = ($valores | Measure-Object -Minimum).Minimum
    $maior = ($valores | Measure-Object -Maximum).Maximum
    if ($pedidoValor -lt $menor) { $sentido = 1 }
    elseif ($pedidoValor -le $maior) { break }
  }
  if (-not (Rolar-Atividades $sentido 8)) { break }
  $rolagem++
}
$rotuloAtividade = (@($codigo, $nome) | Where-Object { $_.Trim() }) -join " "
if (-not $alvos.Count) { Write-Output "ERRO Não vi a atividade $rotuloAtividade na aba Atividades do processo $numero."; exit 0 }
if ($alvos.Count -gt 1) { Write-Output "ERRO Vi mais de uma linha com a atividade $nome. Não cliquei."; exit 0 }

if ($visualizar) {
  if (-not (Processo-VisivelHc)) { Write-Output "ERRO O processo exibido mudou. A navegação foi interrompida."; exit 0 }
  $celula = $alvos[0].Clique
  $x = $ret.L + $celula.X + [Math]::Max(8, [int]($celula.W / 2))
  $y = $ret.T + $celula.Y + [Math]::Max(6, [int]($celula.H / 2))
  [HcClique]::Ativar($script:janela)
  [HcClique]::Clicar($script:janela, $x, $y)
  Start-Sleep -Milliseconds 300
  if (-not (Selecao-AtividadeConfirmada)) { Write-Output "ERRO Processo $numero exibido e clique enviado para $nome. Não consegui confirmar o destaque da linha; confira a aba Atividades no HeadCargo."; exit 0 }
  Write-Output "OK Processo $numero aberto com a atividade $nome selecionada no HeadCargo."
  exit 0
}

$faixa = @($palavras | Where-Object { $_.Y -lt 220 -and (Normalizar $_.T).Length -ge 4 })
$botao = $faixa | Where-Object { (Normalizar $_.T) -eq $rotuloBotao } | Sort-Object Y | Select-Object -First 1
if (-not $botao) {
  $botao = $faixa | Sort-Object @{ Expression = { (Normalizar $_.T).Length }; Descending = $true }, Y | Where-Object { Mesmo-Botao $_.T $rotuloBotao } | Select-Object -First 1
}
if (-not $botao) {
  $lidos = @($faixa | ForEach-Object { Normalizar $_.T } | Where-Object { $_ -match "[A-Z]" } | Select-Object -Unique) -join ", "
  $extra = if ($lidos) { " Li: $lidos." } else { "" }
  Write-Output "ERRO Não encontrei o botão $nomeBotao na faixa de Ações.$extra"
  exit 0
}
$rotuloBotao = Normalizar $botao.T
$nomeBotao = Nome-Botao $rotuloBotao
$celula = $alvos[0].Clique
$pontoLinhaX = $ret.L + $celula.X + [Math]::Max(8, [int]($celula.W / 2))
$pontoLinhaY = $ret.T + $celula.Y + [Math]::Max(6, [int]($celula.H / 2))
$pontoBotaoX = $ret.L + $botao.X + [Math]::Max(8, [int]($botao.W / 2))
$pontoBotaoY = $ret.T + $botao.Y + [Math]::Max(6, [int]($botao.H / 2))
if (-not $clicar) {
  Write-Output "OK linha=$pontoLinhaX,$pontoLinhaY botao=$pontoBotaoX,$pontoBotaoY"
  exit 0
}

$script:antes = New-Object System.Collections.Generic.List[string]
$script:pidAlvo = [uint32]0
[void][HcClique]::GetWindowThreadProcessId($script:janela, [ref]$script:pidAlvo)
[HcClique]::EnumWindows({
  param($h, $l)
  $dono = [uint32]0
  [void][HcClique]::GetWindowThreadProcessId($h, [ref]$dono)
  if ($dono -eq $script:pidAlvo -and [HcClique]::IsWindowVisible($h)) {
    $cls = New-Object System.Text.StringBuilder 40
    [void][HcClique]::GetClassName($h, $cls, 40)
    $titulo = New-Object System.Text.StringBuilder 80
    [void][HcClique]::GetWindowText($h, $titulo, 80)
    $rotulo = $titulo.ToString()
    if ($cls.ToString() -eq "TfrmHeadMessage" -or $rotulo -match "Cuidado|Escolha de caminho") { return $true }
    [void]$script:antes.Add([string]$h)
  }
  return $true
}, [IntPtr]::Zero) | Out-Null

$frente = [HcClique]::GetForegroundWindow()

function Palavras-DaJanela([IntPtr]$hwnd) {
  $caixa = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($hwnd, [ref]$caixa)
  $larguraDlg = $caixa.R - $caixa.L
  $alturaDlg = $caixa.B - $caixa.T
  if ($larguraDlg -lt 40 -or $alturaDlg -lt 40 -or -not $script:ocr) { return @() }
  $bmp = New-Object System.Drawing.Bitmap $larguraDlg, $alturaDlg
  $grafico = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $grafico.GetHdc()
  [void][HcClique]::PrintWindow($hwnd, $hdc, 2)
  $grafico.ReleaseHdc($hdc)
  $grafico.Dispose()
  $escala = 2
  $folha = New-Object System.Drawing.Bitmap ($larguraDlg * $escala), ($alturaDlg * $escala)
  $g2 = [System.Drawing.Graphics]::FromImage($folha)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g2.DrawImage($bmp, 0, 0, ($larguraDlg * $escala), ($alturaDlg * $escala))
  $g2.Dispose()
  $bmp.Dispose()
  $fotoDlg = Join-Path $env:TEMP "hc-dialogo.png"
  $folha.Save($fotoDlg, [System.Drawing.Imaging.ImageFormat]::Png)
  $folha.Dispose()
  $arquivoDlg = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($fotoDlg)) ([Windows.Storage.StorageFile])
  $fluxoDlg = Await-Win ($arquivoDlg.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoderDlg = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxoDlg)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmapDlg = Await-Win ($decoderDlg.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $lidoDlg = Await-Win ($script:ocr.RecognizeAsync($bitmapDlg)) ([Windows.Media.Ocr.OcrResult])
  $achadas = @()
  foreach ($linhaDlg in $lidoDlg.Lines) {
    foreach ($p in $linhaDlg.Words) {
      $achadas += [pscustomobject]@{
        T = [string]$p.Text
        X = $caixa.L + [int]($p.BoundingRect.X / 2)
        Y = $caixa.T + [int]($p.BoundingRect.Y / 2)
        W = [Math]::Max(8, [int]($p.BoundingRect.Width / 2))
        H = [Math]::Max(8, [int]($p.BoundingRect.Height / 2))
      }
    }
  }
  return $achadas
}
function Titulo-Janela([IntPtr]$dlg) {
  $txt = New-Object System.Text.StringBuilder 160
  [void][HcClique]::GetWindowText($dlg, $txt, 160)
  return $txt.ToString().Trim()
}
function Linhas-DoDialogo([IntPtr]$dlg) {
  $linhas = @()
  foreach ($p in @(Palavras-DaJanela $dlg | Sort-Object Y, X)) {
    $ultima = $null
    if ($linhas.Count) { $ultima = $linhas[$linhas.Count - 1] }
    if ($null -ne $ultima -and [Math]::Abs([int]$p.Y - [int]$ultima.Y) -le 8) {
      $ultima.Texto = (($ultima.Texto + " " + $p.T).Trim())
      $ultima.Direita = [Math]::Max([int]$ultima.Direita, [int]($p.X + $p.W))
    } else {
      $linhas += [pscustomobject]@{ Texto = [string]$p.T; Y = [int]$p.Y; X = [int]$p.X; Direita = [int]($p.X + $p.W); MeioY = [int]($p.Y + [Math]::Max(4, [int]($p.H / 2))) }
    }
  }
  return @($linhas | Where-Object { $_.Texto.Trim().Length -ge 2 })
}
function Botao-PorNome([IntPtr]$dlg, [string[]]$nomes) {
  $script:botaoAchei = [IntPtr]::Zero
  $script:nomesBotao = @($nomes)
  [HcClique]::EnumChildWindows($dlg, {
    param($c, $l)
    $rotulo = New-Object System.Text.StringBuilder 80
    [void][HcClique]::GetWindowText($c, $rotulo, 80)
    $limpo = ($rotulo.ToString() -replace "&", "").Trim()
    if ($script:nomesBotao -contains $limpo) { $script:botaoAchei = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:botaoAchei
}
function Apertar-Nome([IntPtr]$dlg, [string[]]$nomes) {
  $botao = Botao-PorNome $dlg $nomes
  if ($botao -eq [IntPtr]::Zero) { return $false }
  $caixa = New-Object HcClique+RECT
  [void][HcClique]::GetWindowRect($botao, [ref]$caixa)
  [HcClique]::Apertar($botao)
  Clicar-NoControle $botao ([int](($caixa.L + $caixa.R) / 2)) ([int](($caixa.T + $caixa.B) / 2))
  return $true
}
function Tipo-Dialogo([string]$titulo, $linhas) {
  return Tipo-DialogoHc $titulo $linhas
}
function Campos-Pedidos($linhas) {
  return @(Campos-PedidosHc $linhas)
}
function Opcoes-Caminho($linhas) {
  $script:assuntoCaminho = ""
  $brutas = @()
  foreach ($linha in @($linhas)) {
    $n = Normalizar $linha.Texto
    if ($n.Length -lt 4) { continue }
    if ($n -match "^(OK|CANCELAR|CANCEL|SIM|NAO)$") { continue }
    if ($n -match "SELECIONE|CAMINHO A SER|ESCOLHA DE CAMINHO") { continue }
    $brutas += $linha
  }
  $grupos = @()
  foreach ($linha in $brutas) {
    $n = Normalizar $linha.Texto
    $ultimo = if ($grupos.Count) { $grupos[$grupos.Count - 1] } else { $null }
    $un = if ($ultimo) { Normalizar $ultimo.Texto } else { "" }
    $repete = $un -and (($n -eq $un) -or ($un.Length -ge 8 -and $n.StartsWith($un)) -or ($n.Length -ge 8 -and $un.StartsWith($n)))
    if ($repete) {
      if ($n.Length -gt $un.Length) { $ultimo.Texto = $linha.Texto.Trim() }
      $ultimo.Vezes = [int]$ultimo.Vezes + 1
      continue
    }
    $grupos += [pscustomobject]@{ Texto = $linha.Texto.Trim(); Vezes = 1; X = [int](($linha.X + $linha.Direita) / 2); Y = [int]$linha.MeioY }
  }
  if ($grupos.Count -ge 2 -and [int]$grupos[0].Vezes -eq 1 -and @($grupos | Where-Object { [int]$_.Vezes -gt 1 }).Count -ge 1) {
    $script:assuntoCaminho = $grupos[0].Texto
    $grupos = @($grupos | Select-Object -Skip 1)
  }
  return @($grupos)
}
function Nota-Caminho([string]$opcao, [string]$pedido) {
  $a = Normalizar $opcao
  $b = Normalizar $pedido
  if (-not $a -or -not $b) { return 0 }
  if ($a -eq $b) { return 100 }
  if ($a.Contains($b) -or $b.Contains($a)) { return 60 }
  $palavras = @($b -split " " | Where-Object { $_.Length -gt 3 })
  if (-not $palavras.Count) { return 0 }
  $achou = @($palavras | Where-Object { $a.Contains($_) }).Count
  if ($achou -eq $palavras.Count) { return 40 + $achou }
  if ($achou -ge 2) { return 20 + $achou }
  return 0
}
function Escolher-Opcao($opcoes, [string]$pedido) {
  $melhor = 0
  $escolha = @()
  foreach ($opcao in @($opcoes)) {
    $nota = Nota-Caminho $opcao.Texto $pedido
    if ($nota -gt $melhor) { $melhor = $nota; $escolha = @($opcao) }
    elseif ($nota -gt 0 -and $nota -eq $melhor) { $escolha += $opcao }
  }
  if ($melhor -lt 40 -or $escolha.Count -ne 1) { return $null }
  return $escolha[0]
}
function Mensagem-Campos($campos) {
  $itens = @($campos | Where-Object { $_.Trim() })
  if (-not $itens.Count) { $itens = @("não consegui ler os nomes dos campos") }
  return ("ERRO Não $feito a atividade $nome. Para confirmar, o HeadCargo pediu para preencher: " + ($itens -join "; ") + ".")
}
function Mensagem-Caminho($opcoes) {
  $itens = @($opcoes | ForEach-Object { $_.Texto })
  $assunto = if ($script:assuntoCaminho) { " em $($script:assuntoCaminho)" } else { "" }
  if (-not $itens.Count) { return "PERGUNTA O HeadCargo pediu um caminho para a atividade $nome, mas não consegui ler as opções. Diga qual seguir." }
  return ("PERGUNTA O HeadCargo pediu um caminho$assunto para a atividade $nome. Qual seguir? " + ($itens -join "; ") + ".")
}
function Texto-Util($linhas) {
  return @(Texto-UtilHc $linhas)
}
function Tratar-Dialogo([IntPtr]$dlg) {
  $linhas = @(Linhas-DoDialogo $dlg)
  if (-not $linhas.Count) {
    Start-Sleep -Milliseconds 250
    $linhas = @(Linhas-DoDialogo $dlg)
  }
  $tipo = Tipo-Dialogo (Titulo-Janela $dlg) $linhas
  if ($tipo -eq "conexao") { return "ERRO A conexão do HeadCargo com o servidor foi perdida. Não confirmei a reconexão nem o fechamento do sistema. Reconecte o HeadCargo antes de continuar; não identifiquei campos obrigatórios nesse aviso." }
  if ($tipo -eq "menu") { return "" }
  if ($tipo -eq "campos") {
    $campos = @(Campos-Pedidos $linhas)
    [void](Apertar-Nome $dlg @("OK"))
    return Mensagem-Campos $campos
  }
  if ($tipo -eq "caminho") {
    $opcoes = @(Opcoes-Caminho $linhas)
    $pedido = $caminhoPedido.Trim()
    if ($pedido) {
      $opcao = Escolher-Opcao $opcoes $pedido
      if ($opcao) {
        $alvo = [HcClique]::Fundo($dlg, $opcao.X, $opcao.Y)
        if ($alvo -eq [IntPtr]::Zero) { $alvo = $dlg }
        Clicar-NoControle $alvo $opcao.X $opcao.Y
        Start-Sleep -Milliseconds 200
        [void](Apertar-Nome $dlg @("OK"))
        return "SEGUIU"
      }
    }
    [void](Apertar-Nome $dlg @("Cancelar", "Cancel"))
    return Mensagem-Caminho $opcoes
  }
  $texto = @(Texto-Util $linhas)
  $junto = Normalizar ($texto -join " ")
  if ($junto -match "CAMINHO A SER TOMADO|ESCOLHA DE CAMINHO") {
    $opcoes = @(Opcoes-Caminho $linhas)
    [void](Apertar-Nome $dlg @("Cancelar", "Cancel"))
    return Mensagem-Caminho $opcoes
  }
  $temSim = Botao-PorNome $dlg @("Sim", "Yes", "Confirmar")
  if ($temSim -ne [IntPtr]::Zero) { return "" }
  if ($texto.Count -ge 1) {
    [void](Apertar-Nome $dlg @("OK"))
    return ("ERRO Não $feito a atividade $nome. O HeadCargo avisou: " + ($texto -join " ") + ".")
  }
  return ""
}
function Confirmar-Janela([IntPtr]$dlg) {
  $tipo = Tipo-Dialogo (Titulo-Janela $dlg) @(Linhas-DoDialogo $dlg)
  if ($tipo -eq "conexao" -or $tipo -eq "menu") { return $false }
  $script:sim = [IntPtr]::Zero
  [HcClique]::EnumChildWindows($dlg, {
    param($c, $l)
    $rotulo = New-Object System.Text.StringBuilder 80
    [void][HcClique]::GetWindowText($c, $rotulo, 80)
    $limpo = ($rotulo.ToString() -replace "&", "").Trim()
    $prefere = $limpo -match "^(Sim|Yes|Confirmar)$"
    if ($prefere) { $script:sim = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:sim -ne [IntPtr]::Zero) {
    $botaoRect = New-Object HcClique+RECT
    [void][HcClique]::GetWindowRect($script:sim, [ref]$botaoRect)
    [HcClique]::Apertar($script:sim)
    return $true
  }
  $palavra = Palavras-DaJanela $dlg | Where-Object { (Normalizar $_.T) -match "^(SIM|YES|CONFIRMAR)$" } | Select-Object -First 1
  if (-not $palavra) { return $false }
  Clicar-NoControle $dlg ($palavra.X + [Math]::Max(6, [int]($palavra.W / 2))) ($palavra.Y + [Math]::Max(4, [int]($palavra.H / 2)))
  return $true
}

function Dialogos-Novos {
  $script:novas = New-Object System.Collections.Generic.List[IntPtr]
  [HcClique]::EnumWindows({
    param($h, $l)
    $dono = [uint32]0
    [void][HcClique]::GetWindowThreadProcessId($h, [ref]$dono)
    if ($dono -ne $script:pidAlvo -or -not [HcClique]::IsWindowVisible($h)) { return $true }
    if ($h -eq $script:janela -or $script:antes.Contains([string]$h)) { return $true }
    $cls = New-Object System.Text.StringBuilder 40
    [void][HcClique]::GetClassName($h, $cls, 40)
    if ($cls.ToString() -eq "TApplication" -or $cls.ToString() -eq "#32768") { return $true }
    $script:novas.Add($h)
    return $true
  }, [IntPtr]::Zero) | Out-Null
  $popup = [HcClique]::GetLastActivePopup($script:janela)
  if ($popup -ne [IntPtr]::Zero -and $popup -ne $script:janela -and [HcClique]::IsWindowVisible($popup) -and -not $script:antes.Contains([string]$popup)) {
    $jaTem = $false
    foreach ($item in @($script:novas)) { if ([string]$item -eq [string]$popup) { $jaTem = $true } }
    if (-not $jaTem) { $script:novas.Add($popup) }
  }
  return @($script:novas)
}
function Acao-Trocou {
  $bmp = $null
  $recorte = $null
  try {
    $bmp = Foto-Janela
    $altura = [Math]::Min(220, $bmp.Height)
    if ($altura -lt 40) { return $false }
    $recorte = $bmp.Clone((New-Object System.Drawing.Rectangle 0, 0, $bmp.Width, $altura), $bmp.PixelFormat)
    $caminho = Join-Path $env:TEMP "hc-acao.png"
    $recorte.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
    $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($caminho)) ([Windows.Storage.StorageFile])
    $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $lido = Await-Win ($script:ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
    $vistos = New-Object System.Collections.Generic.List[string]
    foreach ($linha in $lido.Lines) {
      foreach ($p in $linha.Words) { [void]$vistos.Add((Normalizar $p.Text)) }
    }
    $temAtual = @($vistos | Where-Object { $_ -eq $rotuloBotao -or (Mesmo-Botao $_ $rotuloBotao) }).Count -gt 0
    $leuFaixa = @($vistos | Where-Object { $_.Length -ge 4 }).Count -ge 2
    return ((-not $temAtual) -and $leuFaixa)
  } catch {
    return $false
  } finally {
    if ($recorte) { $recorte.Dispose() }
    if ($bmp) { $bmp.Dispose() }
  }
}
$aviso = ""
foreach ($dlg in @(Dialogos-Novos)) {
  $lido = Tratar-Dialogo $dlg
  [void]$script:antes.Add([string]$dlg)
  if ($lido -and $lido -ne "SEGUIU") { $aviso = $lido; break }
}
if (-not $aviso) {
  [HcClique]::Clicar($script:janela, $pontoLinhaX, $pontoLinhaY)
  Start-Sleep -Milliseconds 450
  [HcClique]::Clicar($script:janela, $pontoBotaoX, $pontoBotaoY)
}
$confirmou = $false
$confirmouEm = $null
$trocas = 0
$viuDialogo = $false
$limiteSemDialogo = (Get-Date).AddSeconds(12)
$limiteEspera = (Get-Date).AddSeconds(45)
while ((Get-Date) -lt $limiteEspera -and -not $aviso) {
  Start-Sleep -Milliseconds 800
  $viuAgora = $false
  foreach ($dlg in @(Dialogos-Novos)) {
    $viuAgora = $true
    $lido = Tratar-Dialogo $dlg
    if ($lido -eq "SEGUIU") { $confirmou = $true; $confirmouEm = Get-Date; [void]$script:antes.Add([string]$dlg); continue }
    if ($lido) { $aviso = $lido; [void]$script:antes.Add([string]$dlg); break }
    if (Confirmar-Janela $dlg) { $confirmou = $true; $confirmouEm = Get-Date; [void]$script:antes.Add([string]$dlg); continue }
  }
  if ($aviso) { break }
  if ($viuAgora) { $viuDialogo = $true }
  if ($confirmou -and $confirmouEm -and -not $viuAgora -and ((Get-Date) - $confirmouEm).TotalSeconds -ge 10) { break }
  if (-not $viuDialogo -and -not $confirmou -and (Get-Date) -gt $limiteSemDialogo) { break }
  if ($viuAgora) { $trocas = 0; continue }
  if (Acao-Trocou) { $trocas++ } else { $trocas = 0 }
  if ($trocas -ge 2) { $confirmou = $true; break }
}
[HcClique]::Devolver($frente)
if ($aviso) {
  Write-Output $aviso
  exit 0
}
if (-not $confirmou) {
  Write-Output "ERRO Não $feito a atividade $nome. O HeadCargo não confirmou."
  exit 0
}

Write-Output "OK Clique enviado na atividade $nome."
} finally {
  Restaurar-HeadCargo
}
