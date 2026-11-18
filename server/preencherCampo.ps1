$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "headcargoUia.ps1")
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$OutputEncoding = [Console]::OutputEncoding
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class HcCampo {
  public delegate bool EnumProc(IntPtr h, IntPtr l);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr h, EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr h);
  [DllImport("user32.dll")] public static extern int GetDlgCtrlID(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint proc);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] public static extern short VkKeyScan(char c);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(POINT p);
  [DllImport("user32.dll")] public static extern IntPtr RealChildWindowFromPoint(IntPtr parent, POINT p);
  [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h, ref POINT p);
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint a, uint b, bool f);
  public struct POINT { public int X; public int Y; }
  public static void Ativar(IntPtr h) {
    uint ignorado;
    uint deles = GetWindowThreadProcessId(GetForegroundWindow(), out ignorado);
    uint alvo = GetWindowThreadProcessId(h, out ignorado);
    uint meu = GetCurrentThreadId();
    AttachThreadInput(meu, deles, true);
    AttachThreadInput(meu, alvo, true);
    SetForegroundWindow(h);
    AttachThreadInput(meu, alvo, false);
    AttachThreadInput(meu, deles, false);
  }
  public static void CliqueNo(int sx, int sy) {
    POINT p; p.X = sx; p.Y = sy;
    IntPtr h = WindowFromPoint(p);
    for (int i = 0; i < 40 && h != IntPtr.Zero; i++) {
      POINT c = p;
      ScreenToClient(h, ref c);
      IntPtr prox = RealChildWindowFromPoint(h, c);
      if (prox == IntPtr.Zero || prox == h) {
        int packed = (c.Y << 16) | (c.X & 0xFFFF);
        Enviar(h, 0x201, (IntPtr)1, (IntPtr)packed);
        Enviar(h, 0x202, IntPtr.Zero, (IntPtr)packed);
        return;
      }
      h = prox;
    }
  }
  public static IntPtr Fundo(IntPtr raiz, int sx, int sy) {
    IntPtr atual = raiz;
    for (int i = 0; i < 12; i++) {
      POINT p = new POINT { X = sx, Y = sy };
      if (!ScreenToClient(atual, ref p)) break;
      IntPtr filho = RealChildWindowFromPoint(atual, p);
      if (filho == IntPtr.Zero || filho == atual) break;
      atual = filho;
    }
    return atual;
  }
  public static void Clicar(int x, int y) {
    IntPtr raiz = Raiz != IntPtr.Zero ? Raiz : WindowFromPoint(new POINT { X = x, Y = y });
    if (raiz == IntPtr.Zero) return;
    IntPtr alvo = Fundo(raiz, x, y);
    POINT p = new POINT { X = x, Y = y };
    if (!ScreenToClient(alvo, ref p)) return;
    int packed = (p.Y << 16) | (p.X & 0xFFFF);
    PostMessage(alvo, 0x0200, IntPtr.Zero, (IntPtr)packed);
    PostMessage(alvo, 0x0201, (IntPtr)1, (IntPtr)packed);
    PostMessage(alvo, 0x0202, IntPtr.Zero, (IntPtr)packed);
  }
  public static void Tecla(byte vk, bool ctrl) {
    if (ctrl) keybd_event(0x11, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, 0, UIntPtr.Zero);
    keybd_event(vk, 0, 2, UIntPtr.Zero);
    if (ctrl) keybd_event(0x11, 0, 2, UIntPtr.Zero);
  }
  [DllImport("user32.dll", EntryPoint = "SendMessage")] public static extern IntPtr Enviar(IntPtr h, int msg, IntPtr w, IntPtr l);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, int msg, IntPtr w, IntPtr l);
  public static IntPtr Raiz = IntPtr.Zero;
  public static void Digitar(string texto) {
    foreach (char c in texto) {
      if (c > 255) continue;
      keybd_event(0, (byte)c, 0x0004, UIntPtr.Zero);
      keybd_event(0, (byte)c, 0x0004 | 0x0002, UIntPtr.Zero);
      System.Threading.Thread.Sleep(30);
    }
  }
  public static void DigitarNo(IntPtr h, string texto) {
    foreach (char c in texto) {
      Enviar(h, 0x0102, (IntPtr)c, IntPtr.Zero);
      System.Threading.Thread.Sleep(40);
    }
  }
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, int msg, IntPtr w, StringBuilder s);
  [DllImport("user32.dll", CharSet = CharSet.Unicode, EntryPoint = "SendMessage")] public static extern IntPtr DefinirTexto(IntPtr h, int msg, IntPtr w, string s);
  public struct RECT { public int L; public int T; public int R; public int B; }
}
"@
[void][HcCampo]::SetProcessDPIAware()
$numero = [string]$env:HC_NUMERO
$campo = [string]$env:HC_CAMPO
$valor = [string]$env:HC_VALOR
if ($env:HC_TESTE_ROTULO -ne "1") {
  if ($numero -notmatch "\s+teste$") { Write-Output "ERRO Só preencho campo de processo teste."; exit 0 }
  if (-not $campo.Trim() -or -not $valor.Trim()) { Write-Output "ERRO Falta o campo ou o valor."; exit 0 }
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
function Normalizar([string]$texto) {
  if (-not $texto) { return "" }
  $limpo = $texto.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object System.Text.StringBuilder
  foreach ($c in $limpo.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($c) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($c) }
  }
  return ($sb.ToString().ToUpperInvariant() -replace "[^A-Z0-9]+", " ").Trim()
}
$script:dica = $null
$script:erroEscolha = ""
if ($env:HC_ESCOLHA) {
  try { $script:dica = $env:HC_ESCOLHA | ConvertFrom-Json } catch { $script:dica = $null }
}
function Compacto([string]$texto) { return ((Normalizar $texto) -replace " ", "") }
function Pontuar-Texto([string]$texto, [string]$pedido) {
  $limpo = Normalizar $texto
  $curto = Compacto $texto
  $alvos = New-Object System.Collections.Generic.List[string]
  if ($pedido) { [void]$alvos.Add($pedido) }
  if ($script:dica) {
    foreach ($parte in @($script:dica.nome, $script:dica.codigo, $script:dica.sigla)) { if ($parte) { [void]$alvos.Add([string]$parte) } }
    if ($script:dica.aliases) { foreach ($parte in @($script:dica.aliases)) { if ($parte) { [void]$alvos.Add([string]$parte) } } }
  }
  $pontos = 0
  foreach ($alvo in $alvos) {
    $nome = Normalizar $alvo
    $codigo = Compacto $alvo
    if (-not $codigo) { continue }
    $p = 0
    if ($limpo -eq $nome -or $curto -eq $codigo) { $p = 50 }
    elseif ($nome.Length -ge 3 -and ($limpo.Contains($nome) -or $curto.Contains($codigo))) { $p = 18 }
    if ($p -gt $pontos) { $pontos = $p }
  }
  if ($script:dica -and $script:dica.nome -and $script:dica.sigla) {
    $nomeDica = Normalizar ([string]$script:dica.nome)
    $siglaDica = Compacto ([string]$script:dica.sigla)
    if ($nomeDica -and $siglaDica -and $limpo.Contains($nomeDica) -and $curto.Contains($siglaDica)) { $pontos += 25 }
  }
  return $pontos
}
function Linhas-DaLista($palavras) {
  $grupos = @()
  foreach ($p in @($palavras | Sort-Object Y, X)) {
    $ultima = $null
    if ($grupos.Count) { $ultima = $grupos[$grupos.Count - 1] }
    if ($null -ne $ultima -and [Math]::Abs([int]$p.Y - [int]$ultima.Y) -le 8) {
      [void]$ultima.Palavras.Add($p)
      $ordenadas = @($ultima.Palavras | Sort-Object X)
      $ultima.Texto = (($ordenadas | ForEach-Object { $_.T }) -join " ")
    } else {
      $lista = New-Object System.Collections.Generic.List[object]
      [void]$lista.Add($p)
      $grupos += [pscustomobject]@{ Y = [int]$p.Y; Palavras = $lista; Texto = [string]$p.T; Pontos = 0 }
    }
  }
  return @($grupos)
}
function Escolher-Linha($palavras, [string]$pedido) {
  $notas = @()
  foreach ($linha in @(Linhas-DaLista $palavras)) {
    $linha.Pontos = Pontuar-Texto $linha.Texto $pedido
    if ([int]$linha.Pontos -gt 0) { $notas += $linha }
  }
  if (-not $notas.Count) { return @{ Tipo = "vazio"; Textos = @() } }
  $melhor = [int](@($notas | Sort-Object Pontos -Descending | Select-Object -First 1).Pontos)
  $topo = @($notas | Where-Object { [int]$_.Pontos -eq $melhor })
  if ($topo.Count -gt 1) { return @{ Tipo = "ambiguo"; Textos = @($topo | ForEach-Object { $_.Texto }) } }
  return @{ Tipo = "unico"; Linha = $topo[0]; Textos = @() }
}
function Foco-DaLinha($linha) {
  $nome = ""
  if ($script:dica -and $script:dica.nome) { $nome = Normalizar ([string]$script:dica.nome) }
  foreach ($p in @($linha.Palavras)) {
    if ($nome -and (Normalizar $p.T) -eq $nome) { return $p }
  }
  return @($linha.Palavras | Sort-Object X)[0]
}
function Mensagem-Ambiguo([string]$pedido, $textos) {
  $lista = (@($textos) | Select-Object -First 3) -join "; "
  return "A lista mostrou mais de uma opção para ${pedido}: $lista. Diga a sigla ou o nome completo."
}

if ($env:HC_TESTE_ROTULO -ne "1") {
$processos = @(Get-Process -Name Desktop -ErrorAction SilentlyContinue)
if (-not $processos.Count) { Write-Output "ERRO O HeadCargo não está aberto neste computador."; exit 0 }
$ids = @{}
foreach ($p in $processos) { $ids[[uint32]$p.Id] = $true }
$script:janela = [IntPtr]::Zero
$script:ids = $ids
[HcCampo]::EnumWindows({
  param($h, $l)
  $dono = [uint32]0
  [void][HcCampo]::GetWindowThreadProcessId($h, [ref]$dono)
  if (-not $script:ids.ContainsKey($dono)) { return $true }
  $classe = New-Object System.Text.StringBuilder 80
  [void][HcCampo]::GetClassName($h, $classe, 80)
  if ($classe.ToString() -eq "TfrmPrincipal") { $script:janela = $h }
  return $true
}, [IntPtr]::Zero) | Out-Null
if ($script:janela -eq [IntPtr]::Zero) { Write-Output "ERRO O HeadCargo não está aberto neste computador."; exit 0 }
[HcCampo]::Raiz = $script:janela

$script:achouNumero = $false
$script:numero = $numero
[HcCampo]::EnumChildWindows($script:janela, {
  param($c, $l)
  $classe = New-Object System.Text.StringBuilder 40
  [void][HcCampo]::GetClassName($c, $classe, 40)
  if ($classe.ToString() -ne "TDBEdit") { return $true }
  $lido = New-Object System.Text.StringBuilder 180
  [void][HcCampo]::SendMessage($c, 13, [IntPtr]180, $lido)
  if ($lido.ToString().Trim() -eq $script:numero) { $script:achouNumero = $true }
  return -not $script:achouNumero
}, [IntPtr]::Zero) | Out-Null
if (-not $script:achouNumero) {
  $marca = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($script:janela, [ref]$marca)
  $script:filtro = [IntPtr]::Zero
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ($script:filtro -ne [IntPtr]::Zero) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -ne "TDBEdit" -or -not [HcCampo]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    if (($rr.T - $marca.T) -gt 240 -or ($rr.R - $rr.L) -lt 90 -or ($rr.R - $rr.L) -gt 240) { return $true }
    $lido = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::SendMessage($c, 13, [IntPtr]80, $lido)
    if ($lido.ToString() -match "[A-Za-z]{1,4}\d{2,6}-\d{2}") { $script:filtro = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:filtro -ne [IntPtr]::Zero) {
    [void][HcCampo]::DefinirTexto($script:filtro, 0x000C, [IntPtr]::Zero, $numero)
    [void][HcCampo]::Enviar($script:filtro, 0x0100, [IntPtr]13, [IntPtr]::Zero)
    [void][HcCampo]::Enviar($script:filtro, 0x0101, [IntPtr]13, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 1200
    $script:achouNumero = $false
    [HcCampo]::EnumChildWindows($script:janela, {
      param($c, $l)
      $classe = New-Object System.Text.StringBuilder 40
      [void][HcCampo]::GetClassName($c, $classe, 40)
      if ($classe.ToString() -ne "TDBEdit") { return $true }
      $lido = New-Object System.Text.StringBuilder 180
      [void][HcCampo]::SendMessage($c, 13, [IntPtr]180, $lido)
      if ($lido.ToString().Trim() -eq $script:numero) { $script:achouNumero = $true }
      return -not $script:achouNumero
    }, [IntPtr]::Zero) | Out-Null
  }
}
if (-not $script:achouNumero) { Write-Output "ERRO O HeadCargo aberto não está no processo $numero."; exit 0 }
}

function Foto-Janela {
  $r = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($script:janela, [ref]$r)
  $w = $r.R - $r.L
  $h = $r.B - $r.T
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [void][HcCampo]::PrintWindow($script:janela, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  return @{ Bitmap = $bmp; Ret = $r }
}
function Palavras-DaFoto($foto) {
  $bmp = $foto.Bitmap
  $caminho = Join-Path $env:TEMP "hc-campo.png"
  $bmp.Save($caminho, [System.Drawing.Imaging.ImageFormat]::Png)
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($caminho)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $ocr) { return @() }
  $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavras = @()
  foreach ($linha in $lido.Lines) {
    foreach ($p in $linha.Words) {
      $palavras += [pscustomobject]@{ T = [string]$p.Text; X = [int]$p.BoundingRect.X; Y = [int]$p.BoundingRect.Y; W = [int]$p.BoundingRect.Width; H = [int]$p.BoundingRect.Height }
    }
  }
  return $palavras
}
function Tokens-Campo([string]$texto) {
  $ignorar = @("DE","DA","DO","DAS","DOS","NA","NO","NAS","NOS","EM","A","O","OS","AS","PARA","PRA","ABA","CAMPO","DIA")
  $lista = New-Object System.Collections.Generic.List[string]
  foreach ($p in ((Normalizar $texto) -split " ")) {
    if ($p -and $ignorar -notcontains $p) { [void]$lista.Add($p) }
  }
  return @($lista)
}
function Palavra-Confere([string]$a, [string]$b) {
  if (-not $a -or -not $b) { return $false }
  if ($a -eq $b) { return $true }
  $curta = $a
  $longa = $b
  if ($b.Length -lt $a.Length) { $curta = $b; $longa = $a }
  if ($curta.Length -lt 4) { return $false }
  if (-not $longa.StartsWith($curta)) { return $false }
  return (($longa.Length - $curta.Length) -le 2)
}
function Agrupar-Frases($palavras) {
  $inicio = @("SITUACAO","STATUS","DATA","TIPO","PORTO","ORIGEM","DESTINO","NAVIO","COMPANHIA","INCOTERM","PREVISAO","CANAL")
  $lista = @($palavras)
  for ($i = 0; $i -lt $lista.Count; $i++) { $lista[$i] | Add-Member -NotePropertyName I -NotePropertyValue $i -Force }
  $grupos = @()
  foreach ($p in @($lista | Sort-Object Y, X, I)) {
    $junta = $false
    $nomePalavra = Normalizar $p.T
    if ($grupos.Count) {
      $ultimo = $grupos[$grupos.Count - 1]
      $mesmoRetangulo = ([int]$p.X -eq [int]$ultimo.X -and [int]$p.Y -eq [int]$ultimo.Y -and [int]$p.W -eq [int]$ultimo.Largura)
      $gap = [int]$p.X - [int]$ultimo.Direita
      $vizinho = [int]$ultimo.Largura -lt 80 -and [int]$p.W -lt 80 -and [Math]::Abs([int]$p.Y - [int]$ultimo.Y) -le 8 -and $gap -ge -4 -and $gap -lt 14
      $outroCampo = $false
      foreach ($ini in $inicio) { if ($nomePalavra -eq $ini) { $outroCampo = $true } }
      if ($vizinho -and $outroCampo -and $ultimo.Nome.Contains(" ")) { $vizinho = $false }
      if ($mesmoRetangulo -or $vizinho) { $junta = $true }
    }
    if ($junta) {
      $ultimo.Nome = Normalizar ($ultimo.Nome + " " + $p.T)
      $ultimo.Direita = [Math]::Max([int]$ultimo.Direita, [int]($p.X + $p.W))
      $ultimo.Meio = [int](($ultimo.Esquerda + $ultimo.Direita) / 2)
      $ultimo.Largura = [int]$p.W
    } else {
      $grupos += [pscustomobject]@{
        Nome = $nomePalavra
        X = [int]$p.X
        Y = [int]$p.Y
        Direita = [int]($p.X + $p.W)
        Esquerda = [int]$p.X
        Meio = [int]($p.X + ($p.W / 2))
        Largura = [int]$p.W
      }
    }
  }
  return @($grupos | Where-Object { $_.Nome.Length -ge 3 })
}
function Nota-Rotulo($texto, $pedido) {
  $pedidoTokens = @(Tokens-Campo $pedido)
  $fraseTokens = @(Tokens-Campo $texto)
  if (-not $pedidoTokens.Count -or -not $fraseTokens.Count) { return 0 }
  $trava = @("SITUACAO","STATUS","PREVISAO","PREVISTA","PREVISTO")
  foreach ($palavra in $fraseTokens) {
    $ehTrava = $false
    foreach ($t in $trava) { if (Palavra-Confere $palavra $t) { $ehTrava = $true } }
    if (-not $ehTrava) { continue }
    $pedida = $false
    foreach ($p in $pedidoTokens) { if (Palavra-Confere $p $palavra) { $pedida = $true } }
    if (-not $pedida) { return 0 }
  }
  $faltou = New-Object System.Collections.Generic.List[string]
  $casou = 0
  foreach ($p in $pedidoTokens) {
    $ok = $false
    foreach ($f in $fraseTokens) { if (Palavra-Confere $p $f) { $ok = $true } }
    if ($ok) { $casou++ } else { [void]$faltou.Add($p) }
  }
  $extras = 0
  foreach ($f in $fraseTokens) {
    $ok = $false
    foreach ($p in $pedidoTokens) { if (Palavra-Confere $p $f) { $ok = $true } }
    if (-not $ok) { $extras++ }
  }
  $dataValor = $valor -match "^\d{1,2}/\d{1,2}/\d{4}$"
  if ($faltou.Count -gt 0) {
    $pedidoJunto = -join @($pedidoTokens)
    $fraseJunto = -join @($fraseTokens)
    if ($pedidoJunto.Length -ge 4 -and $fraseJunto -eq $pedidoJunto) { return 120 }
    $soData = ($faltou.Count -eq 1 -and $faltou[0] -eq "DATA")
    $temEmbarque = $false
    $pedidoTemEmbarque = $false
    foreach ($f in $fraseTokens) { if (Palavra-Confere $f "EMBARQUE") { $temEmbarque = $true } }
    foreach ($p in $pedidoTokens) { if (Palavra-Confere $p "EMBARQUE") { $pedidoTemEmbarque = $true } }
    if ($dataValor -and $soData -and $temEmbarque -and $pedidoTemEmbarque) { return [int](45 - ($extras * 10)) }
    return 0
  }
  $pontos = 60 + ($casou * 15) - ($extras * 20)
  if ($extras -eq 0) { $pontos += 40 }
  if ($pontos -lt 1) { return 0 }
  return [int]$pontos
}
function Rotulo-DoCampo($palavras, $pedido) {
  $pedidos = @([pscustomobject]@{ Texto = (Normalizar $pedido); Extra = 0 })
  if ($script:pedidoCurto) { $pedidos += [pscustomobject]@{ Texto = (Normalizar $script:pedidoCurto); Extra = 0 } }
  $melhorNota = 0
  $lista = @()
  foreach ($grupo in @(Agrupar-Frases $palavras)) {
    foreach ($opcao in $pedidos) {
      $nota = [int](Nota-Rotulo $grupo.Nome $opcao.Texto) + [int]$opcao.Extra
      if ($nota -le 0) { continue }
      if ($nota -gt $melhorNota) {
        $melhorNota = $nota
        $lista = @($grupo)
      } elseif ($nota -eq $melhorNota) {
        $lista += $grupo
      }
    }
  }
  if (-not $lista.Count) { $script:rotulosCampo = @(); return $null }
  $script:rotulosCampo = @($lista | Sort-Object { [int]$_.Y }, { [int]$_.X })
  return $script:rotulosCampo | Select-Object -First 1
}
function Celula-DoCampo($palavras, $rotulo, $numero) {
  $abaixo = @($palavras | Where-Object {
    [int]$_.Y -gt ($rotulo.Y + 8) -and [Math]::Abs(($_.X + ($_.W / 2)) - $rotulo.Meio) -lt 140 -and $_.T -match "^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$"
  })
  $data = $abaixo | Sort-Object { [int]$_.Y } | Select-Object -First 1
  if ($data) { return [pscustomobject]@{ Y = [int]($data.Y + ($data.H / 2)); Meio = [int]($data.X + ($data.W / 2)) } }
  return $null
}
function Edicao-AoLado($rotulo, $origem) {
  $script:melhor = $null
  $script:distancia = 99999
  $script:rotulo = $rotulo
  $script:origem = $origem
  $script:valorData = $valor -match "^\d{1,2}/\d{1,2}/\d{4}$"
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    $classe = New-Object System.Text.StringBuilder 60
    [void][HcCampo]::GetClassName($c, $classe, 60)
    $nome = $classe.ToString()
    if ($nome -notmatch "Edit|Combo|Memo") { return $true }
    if ($script:valorData -and $nome -match "Combo" -and $nome -notmatch "Edit") { return $true }
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $altura = $rr.B - $rr.T
    $largura = $rr.R - $rr.L
    if ($altura -lt 14 -or $altura -gt 42 -or $largura -lt 40) { return $true }
    $x = $rr.L - $script:origem.L
    $y = [int](($rr.T + $rr.B) / 2) - $script:origem.T
    if ([Math]::Abs($y - $script:rotulo.Y) -gt 46) { return $true }
    $sobrepoe = $x -lt ($script:rotulo.Direita + 8) -and ($x + $largura) -gt ($script:rotulo.Esquerda - 8)
    if (-not $sobrepoe) { return $true }
    if ($y -lt ($script:rotulo.Y - 6)) { return $true }
    $dist = [Math]::Abs($y - $script:rotulo.Y) * 1000 + [Math]::Abs($x - $script:rotulo.X)
    if ($dist -lt $script:distancia) { $script:distancia = $dist; $script:melhor = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:melhor
}
function Contrastar($imagem) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $imagem.Width, $imagem.Height
  $dados = $imagem.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = [Math]::Abs($dados.Stride) * $imagem.Height
  $buffer = New-Object byte[] $bytes
  [Runtime.InteropServices.Marshal]::Copy($dados.Scan0, $buffer, 0, $bytes)
  for ($i = 0; $i -lt $bytes; $i += 4) {
    $media = [int](($buffer[$i] + $buffer[$i + 1] + $buffer[$i + 2]) / 3)
    $corte = 165
    if ($script:limiteContraste) { $corte = [int]$script:limiteContraste }
    $valor = if ($media -lt $corte) { [byte]0 } else { [byte]255 }
    $buffer[$i] = $valor
    $buffer[$i + 1] = $valor
    $buffer[$i + 2] = $valor
    $buffer[$i + 3] = 255
  }
  [Runtime.InteropServices.Marshal]::Copy($buffer, 0, $dados.Scan0, $bytes)
  $imagem.UnlockBits($dados)
}
function Palavras-DosRotulos($bmp, $origem) {
  $script:faixaRotulos = New-Object System.Collections.Generic.List[string]
  $script:faixaEdicoes = New-Object System.Collections.Generic.List[string]
  $script:limiteRotulo = $origem
  $script:larguraFoto = $bmp.Width
  $script:alturaFoto = $bmp.Height
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $classe = New-Object System.Text.StringBuilder 60
    [void][HcCampo]::GetClassName($c, $classe, 60)
    $nome = $classe.ToString()
    $rotulo = $nome -eq "THeadDBLabel"
    $edicao = $nome -match "Edit|Combo"
    if (-not $rotulo -and -not $edicao) { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $x = $rr.L - $script:limiteRotulo.L
    $y = $rr.T - $script:limiteRotulo.T
    $w = $rr.R - $rr.L
    $h = $rr.B - $rr.T
    if ($x -lt 0 -or $y -lt 0 -or ($x + $w) -gt $script:larguraFoto -or ($y + $h) -gt $script:alturaFoto) { return $true }
    if ($rotulo -and $h -ge 10 -and $h -le 24 -and $w -ge 40 -and $w -le 280) { $script:faixaRotulos.Add("$x,$y,$w,$h") }
    if ($edicao -and $h -ge 14 -and $h -le 32 -and $w -ge 40 -and $w -le 280) { $script:faixaEdicoes.Add("$x,$y,$w,$h") }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  $pares = @()
  foreach ($bruto in $script:faixaRotulos) {
    $p = $bruto.Split(",")
    $rx = [int]$p[0]; $ry = [int]$p[1]; $rw = [int]$p[2]; $rh = [int]$p[3]
    $encaixa = $false
    foreach ($ed in $script:faixaEdicoes) {
      $e = $ed.Split(",")
      $ex = [int]$e[0]; $ey = [int]$e[1]; $ew = [int]$e[2]
      $abaixo = $ey - ($ry + $rh)
      if ([Math]::Abs($ex - $rx) -le 16 -and [Math]::Abs($ew - $rw) -le 30 -and $abaixo -ge -2 -and $abaixo -le 18) { $encaixa = $true; break }
    }
    if ($encaixa) { $pares += [pscustomobject]@{ X = $rx; Y = $ry; W = $rw; H = $rh } }
  }
  if (-not $pares.Count) { $bmp.Dispose(); return @() }
  $escala = 4
  $cellW = 440
  $cellH = 120
  $cols = 4
  $rows = [Math]::Ceiling($pares.Count / $cols)
  $folha = New-Object System.Drawing.Bitmap ($cols * $cellW), ($rows * $cellH)
  $g = [System.Drawing.Graphics]::FromImage($folha)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  for ($i = 0; $i -lt $pares.Count; $i++) {
    $item = $pares[$i]
    $col = $i % $cols
    $lin = [Math]::Floor($i / $cols)
    $destino = New-Object System.Drawing.Rectangle (($col * $cellW) + 16), (($lin * $cellH) + 28), ($item.W * $escala), ($item.H * $escala)
    $recorte = New-Object System.Drawing.Rectangle $item.X, $item.Y, $item.W, $item.H
    $g.DrawImage($bmp, $destino, $recorte, [System.Drawing.GraphicsUnit]::Pixel)
  }
  $g.Dispose()
  $bmp.Dispose()
  Contrastar $folha
  $saida = Join-Path $env:TEMP "hc-rotulos.png"
  $folha.Save($saida, [System.Drawing.Imaging.ImageFormat]::Png)
  $folha.Dispose()
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($saida)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $ocr) { return @() }
  $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavras = @()
  foreach ($linha in $lido.Lines) {
    foreach ($p in $linha.Words) {
      $cx = [int]($p.BoundingRect.X + ($p.BoundingRect.Width / 2))
      $cy = [int]($p.BoundingRect.Y + ($p.BoundingRect.Height / 2))
      $col = [Math]::Floor($cx / $cellW)
      $lin = [Math]::Floor($cy / $cellH)
      $indice = [int](($lin * $cols) + $col)
      if ($indice -lt 0 -or $indice -ge $pares.Count) { continue }
      $item = $pares[$indice]
      $palavras += [pscustomobject]@{ T = [string]$p.Text; X = [int]$item.X; Y = [int]$item.Y; W = [int]$item.W; H = [int]$item.H }
    }
  }
  return $palavras
}
function Texto-Confere($texto, $pedido) {
  $esperado = (Normalizar $pedido) -replace " ", ""
  $lido = (Normalizar $texto) -replace " ", ""
  return [bool]($esperado -and $lido.Contains($esperado))
}
function Janela-DaClasse($classe) {
  $script:acheiJanela = [IntPtr]::Zero
  $script:classeJanela = $classe
  [HcCampo]::EnumWindows({
    param($h, $l)
    $dono = [uint32]0
    [void][HcCampo]::GetWindowThreadProcessId($h, [ref]$dono)
    if (-not $script:ids.ContainsKey($dono)) { return $true }
    if (-not [HcCampo]::IsWindowVisible($h)) { return $true }
    $nome = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::GetClassName($h, $nome, 80)
    if ($nome.ToString() -eq $script:classeJanela) { $script:acheiJanela = $h }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:acheiJanela
}
function Controle-DaPesquisa($pai, $classe, $texto) {
  $script:acheiControle = [IntPtr]::Zero
  $script:classeControle = $classe
  $script:textoControle = $texto
  [HcCampo]::EnumChildWindows($pai, {
    param($c, $l)
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $nome = New-Object System.Text.StringBuilder 60
    [void][HcCampo]::GetClassName($c, $nome, 60)
    if ($nome.ToString() -ne $script:classeControle) { return $true }
    if ($script:textoControle) {
      $lido = New-Object System.Text.StringBuilder 80
      [void][HcCampo]::SendMessage($c, 13, [IntPtr]80, $lido)
      if ($lido.ToString().Trim() -ne $script:textoControle) { return $true }
    }
    $script:acheiControle = $c
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:acheiControle
}
function Foto-De($hwnd) {
  $r = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($hwnd, [ref]$r)
  $w = $r.R - $r.L
  $h = $r.B - $r.T
  if ($w -lt 40 -or $h -lt 12) { return $null }
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $hdc = $g.GetHdc()
  [void][HcCampo]::PrintWindow($hwnd, $hdc, 2)
  $g.ReleaseHdc($hdc)
  $g.Dispose()
  return @{ Bitmap = $bmp; Ret = $r }
}
function Pesquisa-NoCampo($rotulo, $origem, $valor) {
  [HcCampo]::Tecla(0x1B, $false)
  Start-Sleep -Milliseconds 150
  $pesquisa = Janela-DaClasse "TfrmRelPesquisar"
  if ($pesquisa -eq [IntPtr]::Zero) {
    [HcCampo]::Ativar($script:janela)
    [HcCampo]::Clicar(($origem.L + $rotulo.Direita - 8), ($origem.T + $rotulo.Y + 8))
    for ($i = 0; $i -lt 10 -and $pesquisa -eq [IntPtr]::Zero; $i++) {
      Start-Sleep -Milliseconds 200
      $pesquisa = Janela-DaClasse "TfrmRelPesquisar"
    }
  }
  if ($pesquisa -eq [IntPtr]::Zero) { return $false }
  $chave = Controle-DaPesquisa $pesquisa "TEdit" ""
  $buscar = Controle-DaPesquisa $pesquisa "THeadButton" "Iniciar pesquisa"
  if ($chave -eq [IntPtr]::Zero -or $buscar -eq [IntPtr]::Zero) {
    [void][HcCampo]::Enviar($pesquisa, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    return $false
  }
  [void][HcCampo]::DefinirTexto($chave, 12, [IntPtr]::Zero, $valor)
  $br = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($buscar, [ref]$br)
  [HcCampo]::Ativar($pesquisa)
  [HcCampo]::Clicar([int](($br.L + $br.R) / 2), [int](($br.T + $br.B) / 2))
  $visto = $null
  $fotoPesquisa = $null
  for ($i = 0; $i -lt 4; $i++) {
    Start-Sleep -Milliseconds 700
    if ($fotoPesquisa) { $fotoPesquisa.Bitmap.Dispose() }
    $fotoPesquisa = Foto-De $pesquisa
    if (-not $fotoPesquisa) { continue }
    $visto = Palavras-DaFoto $fotoPesquisa
    $junto = (($visto | ForEach-Object { Normalizar $_.T }) -join " ")
    if ($junto.Contains((Normalizar $valor))) { break }
    $visto = $null
  }
  if (-not $visto) {
    if ($fotoPesquisa) { $fotoPesquisa.Bitmap.Dispose() }
    [void][HcCampo]::Enviar($pesquisa, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    return $false
  }
  $escolha = Escolher-Linha $visto $valor
  if ($escolha.Tipo -eq "ambiguo") {
    $script:erroEscolha = Mensagem-Ambiguo $valor $escolha.Textos
    $fotoPesquisa.Bitmap.Dispose()
    [void][HcCampo]::Enviar($pesquisa, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    return $false
  }
  if ($escolha.Tipo -ne "unico") {
    $fotoPesquisa.Bitmap.Dispose()
    [void][HcCampo]::Enviar($pesquisa, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    return $false
  }
  $alvo = Foco-DaLinha $escolha.Linha
  [HcCampo]::Clicar(($fotoPesquisa.Ret.L + [int]$alvo.X + [int]($alvo.W / 2)), ($fotoPesquisa.Ret.T + [int]$alvo.Y + [int]($alvo.H / 2)))
  Start-Sleep -Milliseconds 200
  $fotoPesquisa.Bitmap.Dispose()
  $escolher = Controle-DaPesquisa $pesquisa "THeadButton" "Selecionar"
  if ($escolher -eq [IntPtr]::Zero) {
    [void][HcCampo]::Enviar($pesquisa, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
    return $false
  }
  [void][HcCampo]::GetWindowRect($escolher, [ref]$br)
  [HcCampo]::Clicar([int](($br.L + $br.R) / 2), [int](($br.T + $br.B) / 2))
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Milliseconds 200
    if (-not [HcCampo]::IsWindowVisible($pesquisa)) { return $true }
  }
  return $true
}
function Viu-Valor($palavras, $rotulo, $valor) {
  $esperado = (Normalizar $valor) -replace " ", ""
  if (-not $esperado) { return $false }
  $perto = @($palavras | Where-Object {
    [int]$_.Y -ge ([int]$rotulo.Y - 12) -and [int]$_.Y -le ([int]$rotulo.Y + 70) -and [int]$_.X -ge ([int]$rotulo.X - 80) -and [int]$_.X -le ([int]$rotulo.X + 180)
  } | Sort-Object X)
  $junto = (($perto | ForEach-Object { Normalizar $_.T }) -join "") -replace " ", ""
  return $junto.Contains($esperado)
}

function Palavras-DaFaixa($bmp, $x, $y, $w, $h) {
  if ($x -lt 0 -or $y -lt 0 -or ($x + $w) -gt $bmp.Width -or ($y + $h) -gt $bmp.Height) { return @() }
  $escala = 4
  $folha = New-Object System.Drawing.Bitmap (($w * $escala) + 32), (($h * $escala) + 32)
  $g = [System.Drawing.Graphics]::FromImage($folha)
  $g.Clear([System.Drawing.Color]::White)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 12, 12, ($w * $escala), ($h * $escala)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $script:limiteContraste = 185
  Contrastar $folha
  $script:limiteContraste = 165
  $saida = Join-Path $env:TEMP "hc-abas.png"
  $folha.Save($saida, [System.Drawing.Imaging.ImageFormat]::Png)
  $folha.Dispose()
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($saida)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $ocr) { return @() }
  $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavras = @()
  foreach ($linha in $lido.Lines) {
    foreach ($p in $linha.Words) {
      $texto = Normalizar $p.Text
      if ($texto.Length -lt 2) { continue }
      $px = [int](($p.BoundingRect.X - 12) / $escala) + $x
      $pw = [Math]::Max(8, [int]($p.BoundingRect.Width / $escala))
      $palavras += [pscustomobject]@{ T = [string]$p.Text; X = $px; Y = $y; W = $pw; H = $h }
    }
  }
  return $palavras
}
function Pagina-DoProcesso($origem) {
  $script:paginaProcesso = $null
  $script:paginasExtra = New-Object System.Collections.Generic.List[object]
  $script:origemPagina = $origem
  $script:alturasRotulo = New-Object System.Collections.Generic.List[int]
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $classe = New-Object System.Text.StringBuilder 60
    [void][HcCampo]::GetClassName($c, $classe, 60)
    $nome = $classe.ToString()
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $x = $rr.L - $script:origemPagina.L
    $y = $rr.T - $script:origemPagina.T
    $w = $rr.R - $rr.L
    $h = $rr.B - $rr.T
    if ($nome -eq "TcxPageControl" -and $w -gt 400 -and $h -gt 80 -and $x -ge 0 -and $x -lt 200 -and $y -gt 180 -and $y -lt 700) {
      $item = [pscustomobject]@{ Hwnd = $c; X = $x; Y = $y; W = $w; H = $h }
      if ($null -eq $script:paginaProcesso -or $y -lt $script:paginaProcesso.Y) { $script:paginaProcesso = $item }
      $script:paginasExtra.Add($item)
    }
    if ($nome -eq "THeadDBLabel" -and $h -ge 10 -and $h -le 24 -and $w -ge 40 -and $y -gt 180) {
      $script:alturasRotulo.Add([int]$y)
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  $rotuloY = 99999
  if ($null -ne $script:paginaProcesso) {
    foreach ($y in $script:alturasRotulo) {
      if ($y -lt $script:paginaProcesso.Y -and $y -gt ($script:paginaProcesso.Y - 90) -and $y -lt $rotuloY) { $rotuloY = $y }
    }
  }
  $extras = @($script:paginasExtra | Where-Object { $null -ne $script:paginaProcesso -and $_.Y -gt $script:paginaProcesso.Y })
  return @{ Pagina = $script:paginaProcesso; RotuloY = $rotuloY; Extras = $extras }
}
function Titulos-DaPagina($pagina) {
  if ($null -eq $pagina) { return @() }
  $script:titulosPagina = New-Object System.Collections.Generic.List[string]
  $script:hwndPagina = $pagina.Hwnd
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ([HcCampo]::GetParent($c) -ne $script:hwndPagina) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -ne "TcxTabSheet") { return $true }
    $lido = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::SendMessage($c, 13, [IntPtr]80, $lido)
    $titulo = (Normalizar $lido.ToString())
    if ($titulo.Length -ge 4) { $script:titulosPagina.Add($titulo) }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return @($script:titulosPagina)
}
function Aba-Visivel($pagina) {
  if ($null -eq $pagina) { return "" }
  $script:abaVisivel = ""
  $script:hwndPagina = $pagina.Hwnd
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ([HcCampo]::GetParent($c) -ne $script:hwndPagina) { return $true }
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -ne "TcxTabSheet") { return $true }
    $lido = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::SendMessage($c, 13, [IntPtr]80, $lido)
    $script:abaVisivel = Normalizar $lido.ToString()
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:abaVisivel
}
function Abas-Agrupadas($palavras, $nivel, $y) {
  $grupos = @()
  foreach ($p in @($palavras | Sort-Object X)) {
    $junta = $false
    if ($grupos.Count) {
      $ultimo = $grupos[$grupos.Count - 1]
      $continua = [string]$p.T -cmatch "^[a-zà-ÿ]"
      if ((([int]$p.X - [int]$ultimo.Direita) -lt 10) -or $continua) { $junta = $true }
    }
    if ($junta) {
      $ultimo.Nome = Normalizar ($ultimo.Nome + " " + $p.T)
      $ultimo.Direita = [int]$p.X + [int]$p.W
      $ultimo.X = [int](($ultimo.Esquerda + $ultimo.Direita) / 2)
    } else {
      $grupos += [pscustomobject]@{ Nome = (Normalizar $p.T); X = [int]($p.X + ($p.W / 2)); Y = [int]($y + 11); Direita = [int]($p.X + $p.W); Esquerda = [int]$p.X; Nivel = $nivel }
    }
  }
  return @($grupos | Where-Object { $_.Nome.Length -ge 2 })
}
function Abas-DaTela($bmp, $origem) {
  $info = Pagina-DoProcesso $origem
  $pagina = $info.Pagina
  if ($null -eq $pagina) { return @{ Internas = @(); Externas = @(); Inicial = "" } }
  $internas = @()
  $palavras = Palavras-DaFaixa $bmp $pagina.X $pagina.Y ([Math]::Min($pagina.W, 900)) 22
  foreach ($titulo in (Titulos-DaPagina $pagina)) {
    $melhor = $null
    foreach ($p in $palavras) {
      $texto = Normalizar $p.T
      if ($texto.Length -lt 4) { continue }
      if ($titulo.StartsWith($texto) -or $texto.StartsWith($titulo)) { $melhor = $p; break }
    }
    if ($melhor) { $internas += [pscustomobject]@{ Nome = $titulo; X = [int]($melhor.X + ($melhor.W / 2)); Y = [int]($pagina.Y + 11); Nivel = 1 } }
  }
  if (-not $internas.Count) { $internas = Abas-Agrupadas $palavras 1 $pagina.Y }
  foreach ($extra in @($info.Extras)) {
    $lidas = Palavras-DaFaixa $bmp $extra.X $extra.Y ([Math]::Min($extra.W, 900)) 22
    $internas += @(Abas-Agrupadas $lidas 2 $extra.Y)
  }
  $externas = @()
  $faixaY = $pagina.Y - 76
  if ($info.RotuloY -lt 99999) { $faixaY = $info.RotuloY - 30 }
  if ($faixaY -gt 120) { $externas = Abas-Agrupadas (Palavras-DaFaixa $bmp $pagina.X $faixaY ([Math]::Min($pagina.W, 900)) 22) 0 $faixaY }
  $faixas = @([int]$pagina.Y, [int]$faixaY)
  foreach ($extra in @($info.Extras)) { $faixas += [int]$extra.Y }
  return @{ Internas = @($internas); Externas = @($externas); Inicial = (Aba-Visivel $pagina); Faixas = $faixas }
}
function Sem-Faixa($palavras, $faixas) {
  if (-not $palavras) { return @() }
  return @($palavras | Where-Object {
    $y = [int]$_.Y
    $naAba = $false
    foreach ($faixa in @($faixas)) {
      if ($y -ge [int]$faixa -and $y -le ([int]$faixa + 20)) { $naAba = $true }
    }
    -not $naAba
  })
}
function Buscar-Rotulo($pedido, $completo, $faixas) {
  $foto = Foto-Janela
  $origem = $foto.Ret
  $palavras = @()
  if ($completo) { $palavras = Sem-Faixa (Palavras-DaFoto $foto) $faixas }
  $script:rotulosCampo = @()
  $rotulo = Rotulo-DoCampo (Sem-Faixa (Palavras-DosRotulos $foto.Bitmap $origem) $faixas) $pedido
  $lista = @($script:rotulosCampo)
  if (-not $rotulo -and $completo) {
    $rotulo = Rotulo-DoCampo $palavras $pedido
    $lista = $lista + @($script:rotulosCampo)
  }
  $script:rotulosCampo = @($lista | Where-Object { $_ })
  return @{ Rotulo = $rotulo; Origem = $origem; Palavras = $palavras }
}
function Clicar-Aba($aba, $origem) {
  [HcCampo]::CliqueNo(($origem.L + [int]$aba.X), ($origem.T + [int]$aba.Y))
  Start-Sleep -Milliseconds 480
}
function Aba-Citada($pedido, $abas) {
  $pedidoN = Normalizar $pedido
  if ($pedidoN -notmatch "\bABA\b") { return $null }
  foreach ($aba in @($abas | Sort-Object { $_.Nome.Length } -Descending)) {
    $nome = [regex]::Escape([string]$aba.Nome)
    if ($aba.Nome.Length -ge 4 -and $pedidoN -match "\bABA\s+$nome\b") { return $aba }
  }
  return $null
}
function Pedido-SemAba($pedido, $aba) {
  if ($null -eq $aba) { return $pedido }
  $nome = [regex]::Escape([string]$aba.Nome)
  $limpo = [regex]::Replace((Normalizar $pedido), "\b(?:NA|NO|DA|DE|DO|EM|PARA|PRA)?\s*\bABA\s+$nome\b", " ")
  return (($limpo -replace "\s+", " ").Trim())
}
function Lista-Aberta {
  $script:listaAberta = [IntPtr]::Zero
  [HcCampo]::EnumWindows({
    param($h, $l)
    $dono = [uint32]0
    [void][HcCampo]::GetWindowThreadProcessId($h, [ref]$dono)
    if (-not $script:ids.ContainsKey($dono)) { return $true }
    if (-not [HcCampo]::IsWindowVisible($h)) { return $true }
    $nome = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($h, $nome, 40)
    if ($nome.ToString() -eq "ComboLBox") { $script:listaAberta = $h }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:listaAberta
}
function Clarear($imagem) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $imagem.Width, $imagem.Height
  $dados = $imagem.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = [Math]::Abs($dados.Stride) * $imagem.Height
  $buffer = New-Object byte[] $bytes
  [Runtime.InteropServices.Marshal]::Copy($dados.Scan0, $buffer, 0, $bytes)
  for ($i = 0; $i -lt $bytes; $i += 4) {
    $luz = [int](($buffer[$i] * 0.11) + ($buffer[$i + 1] * 0.59) + ($buffer[$i + 2] * 0.30))
    $valor = if ($luz -gt 190) { [byte]0 } else { [byte]255 }
    $buffer[$i] = $valor
    $buffer[$i + 1] = $valor
    $buffer[$i + 2] = $valor
    $buffer[$i + 3] = 255
  }
  [Runtime.InteropServices.Marshal]::Copy($buffer, 0, $dados.Scan0, $bytes)
  $imagem.UnlockBits($dados)
}
function Palavras-Ampliadas($hwnd, $escala, $claro) {
  $foto = Foto-De $hwnd
  if (-not $foto) { return $null }
  $bmp = $foto.Bitmap
  $folha = New-Object System.Drawing.Bitmap ($bmp.Width * $escala), ($bmp.Height * $escala)
  $g = [System.Drawing.Graphics]::FromImage($folha)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawImage($bmp, 0, 0, ($bmp.Width * $escala), ($bmp.Height * $escala))
  $g.Dispose()
  $bmp.Dispose()
  if ($claro) { Clarear $folha }
  $saida = Join-Path $env:TEMP "hc-ampliada.png"
  $folha.Save($saida, [System.Drawing.Imaging.ImageFormat]::Png)
  $folha.Dispose()
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($saida)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $ocr) { return $null }
  $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavras = @()
  foreach ($linha in $lido.Lines) {
    foreach ($p in $linha.Words) {
      $palavras += [pscustomobject]@{
        T = [string]$p.Text
        X = [int]($p.BoundingRect.X / $escala)
        Y = [int]($p.BoundingRect.Y / $escala)
        W = [Math]::Max(8, [int]($p.BoundingRect.Width / $escala))
        H = [Math]::Max(8, [int]($p.BoundingRect.Height / $escala))
      }
    }
  }
  return @{ Palavras = $palavras; Ret = $foto.Ret }
}
function Selecionar-PorCodigo($combo, [string]$codigo) {
  $alvo = $codigo.Trim()
  if (-not $alvo) { return "" }
  $qtd = [int][HcCampo]::Enviar($combo, 0x0146, [IntPtr]::Zero, [IntPtr]::Zero)
  if ($qtd -le 0 -or $qtd -gt 80) { return "" }
  $indice = -1
  for ($i = 0; $i -lt $qtd; $i++) {
    $item = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::SendMessage($combo, 0x0148, [IntPtr]$i, $item)
    if ((Normalizar $item.ToString()) -eq (Normalizar $alvo)) { $indice = $i; break }
  }
  if ($indice -lt 0) { return "ausente" }
  [HcCampo]::Ativar($script:janela)
  [void][HcCampo]::Enviar($combo, 0x014E, [IntPtr]$indice, [IntPtr]::Zero)
  [void][HcCampo]::Enviar($combo, 0xBD11, [IntPtr]0x10000, [IntPtr]::Zero)
  [void][HcCampo]::Enviar($combo, 0xBD11, [IntPtr]0x90000, [IntPtr]::Zero)
  $id = [HcCampo]::GetDlgCtrlID($combo)
  $pai = [HcCampo]::GetParent($combo)
  $aviso = [IntPtr]((1 -shl 16) -bor ($id -band 0xFFFF))
  [void][HcCampo]::Enviar($pai, 0x0111, $aviso, $combo)
  Start-Sleep -Milliseconds 250
  $atual = New-Object System.Text.StringBuilder 80
  [void][HcCampo]::SendMessage($combo, 13, [IntPtr]80, $atual)
  if ((Normalizar $atual.ToString()) -eq (Normalizar $alvo)) { return "ok" }
  return ""
}
function Rotulo-Acima($combo, $origem) {
  $script:rotuloHwnd = [IntPtr]::Zero
  $script:rotuloGap = 99
  $script:comboAlvo = $combo
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -notmatch "Label") { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $caixa = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($script:comboAlvo, [ref]$caixa)
    $gap = $caixa.T - $rr.B
    $largura = $rr.R - $rr.L
    if ([Math]::Abs($rr.L - $caixa.L) -gt 20) { return $true }
    if ([Math]::Abs($largura - ($caixa.R - $caixa.L)) -gt 40) { return $true }
    if ($gap -lt -2 -or $gap -gt 18) { return $true }
    if ($gap -lt $script:rotuloGap) { $script:rotuloGap = $gap; $script:rotuloHwnd = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:rotuloHwnd -eq [IntPtr]::Zero) { return $null }
  $rr = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($script:rotuloHwnd, [ref]$rr)
  $x = $rr.L - $origem.L
  $y = $rr.T - $origem.T
  return [pscustomobject]@{
    Y = [int]$y
    X = [int]$x
    Direita = [int]($x + ($rr.R - $rr.L))
    Esquerda = [int]$x
    Meio = [int]($x + (($rr.R - $rr.L) / 2))
    Hwnd = $script:rotuloHwnd
  }
}
function Combo-PelaLista($pedido, $codigo) {
  $script:combosLista = New-Object System.Collections.Generic.List[object]
  $script:codigoLista = [string]$codigo
  if (-not $script:codigoLista) { return [IntPtr]::Zero }
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $classe = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($c, $classe, 40)
    if ($classe.ToString() -notmatch "Combo") { return $true }
    $qtd = [int][HcCampo]::Enviar($c, 0x0146, [IntPtr]::Zero, [IntPtr]::Zero)
    if ($qtd -le 0 -or $qtd -gt 40) { return $true }
    $tem = $false
    for ($i = 0; $i -lt $qtd; $i++) {
      $item = New-Object System.Text.StringBuilder 40
      [void][HcCampo]::SendMessage($c, 0x0148, [IntPtr]$i, $item)
      if ((Normalizar $item.ToString()) -eq (Normalizar $script:codigoLista)) { $tem = $true }
    }
    if ($tem) { $script:combosLista.Add($c) }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  $origem = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($script:janela, [ref]$origem)
  $melhor = [IntPtr]::Zero
  $nota = 0
  $escolhido = $null
  for ($i = 0; $i -lt $script:combosLista.Count; $i++) {
    $combo = $script:combosLista[$i]
    $acima = Rotulo-Acima $combo $origem
    if (-not $acima) { continue }
    $lido = Palavras-Ampliadas $acima.Hwnd 4 $false
    if (-not $lido) { continue }
    $texto = (($lido.Palavras | ForEach-Object { $_.T }) -join " ")
    $n = [int](Nota-Rotulo $texto $pedido)
    if ($n -gt $nota) { $nota = $n; $melhor = $combo; $escolhido = $acima }
  }
  if ($nota -lt 80 -or $melhor -eq [IntPtr]::Zero) { return [IntPtr]::Zero }
  $script:rotuloLista = $escolhido
  $script:origemLista = $origem
  return $melhor
}
function Escolher-Item($valor) {
  $lista = Lista-Aberta
  if ($lista -eq [IntPtr]::Zero) { return "falha" }
  $lido = Palavras-Ampliadas $lista 3
  if (-not $lido) { return "falha" }
  $escolha = Escolher-Linha $lido.Palavras $valor
  if ($escolha.Tipo -eq "ambiguo") {
    $script:erroEscolha = Mensagem-Ambiguo $valor $escolha.Textos
    return "ambiguo"
  }
  if ($escolha.Tipo -ne "unico") { return "falha" }
  $alvo = Foco-DaLinha $escolha.Linha
  $cx = [int]$alvo.X + [int]($alvo.W / 2)
  $cy = [int]$alvo.Y + [int]($alvo.H / 2)
  $packed = [IntPtr](($cy -shl 16) -bor ($cx -band 0xFFFF))
  [void][HcCampo]::Enviar($lista, 0x201, [IntPtr]1, $packed)
  Start-Sleep -Milliseconds 40
  [void][HcCampo]::Enviar($lista, 0x202, [IntPtr]::Zero, $packed)
  Start-Sleep -Milliseconds 200
  return "ok"
}
function Palavras-DaRegiao($bmp, $x, $y, $w, $h) {
  if ($x -lt 0 -or $y -lt 0 -or ($x + $w) -gt $bmp.Width -or ($y + $h) -gt $bmp.Height) { return @() }
  $escala = 3
  $folha = New-Object System.Drawing.Bitmap ($w * $escala), ($h * $escala)
  $g = [System.Drawing.Graphics]::FromImage($folha)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $g.DrawImage($bmp, (New-Object System.Drawing.Rectangle 0, 0, ($w * $escala), ($h * $escala)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $saida = Join-Path $env:TEMP "hc-barra-btn.png"
  $folha.Save($saida, [System.Drawing.Imaging.ImageFormat]::Png)
  $folha.Dispose()
  $arquivo = Await-Win ([Windows.Storage.StorageFile]::GetFileFromPathAsync($saida)) ([Windows.Storage.StorageFile])
  $fluxo = Await-Win ($arquivo.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
  $decoder = Await-Win ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await-Win ($decoder.GetSoftwareBitmapAsync([Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8, [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $ocr = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $ocr) { return @() }
  $lido = Await-Win ($ocr.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  $palavras = @()
  foreach ($linha in $lido.Lines) {
    foreach ($p in $linha.Words) {
      $palavras += [pscustomobject]@{
        T = [string]$p.Text
        X = $x + [int]($p.BoundingRect.X / $escala)
        Y = $y + [int]($p.BoundingRect.Y / $escala)
        W = [Math]::Max(8, [int]($p.BoundingRect.Width / $escala))
        H = [Math]::Max(8, [int]($p.BoundingRect.Height / $escala))
      }
    }
  }
  return $palavras
}
function Clicar-NaBarra($rotulo) {
  $foto = Foto-Janela
  $palavras = Palavras-DaRegiao $foto.Bitmap 0 55 720 140
  $origem = $foto.Ret
  $foto.Bitmap.Dispose()
  $alvo = @($palavras | Where-Object { (Normalizar $_.T) -eq $rotulo }) | Select-Object -First 1
  if (-not $alvo) { return $false }
  [HcCampo]::Ativar($script:janela)
  [HcCampo]::Clicar(($origem.L + [int]$alvo.X + [int]($alvo.W / 2)), ($origem.T + [int]$alvo.Y - 22))
  Start-Sleep -Milliseconds 450
  return $true
}
function Dialogo-Confirmacao {
  $script:dlgConf = [IntPtr]::Zero
  [HcCampo]::EnumWindows({
    param($h, $l)
    $dono = [uint32]0
    [void][HcCampo]::GetWindowThreadProcessId($h, [ref]$dono)
    if (-not $script:ids.ContainsKey($dono)) { return $true }
    if (-not [HcCampo]::IsWindowVisible($h)) { return $true }
    if ($h -eq $script:janela) { return $true }
    $cls = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::GetClassName($h, $cls, 40)
    $titulo = New-Object System.Text.StringBuilder 80
    [void][HcCampo]::SendMessage($h, 13, [IntPtr]80, $titulo)
    $nome = Normalizar $titulo.ToString()
    if ($cls.ToString() -eq "TfrmHeadMessage" -or $nome -eq "CONFIRMACAO") { $script:dlgConf = $h }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $script:dlgConf
}
function Clicar-Sim($dlg) {
  $script:botaoSim = [IntPtr]::Zero
  [HcCampo]::EnumChildWindows($dlg, {
    param($c, $l)
    $rotulo = New-Object System.Text.StringBuilder 40
    [void][HcCampo]::SendMessage($c, 13, [IntPtr]40, $rotulo)
    $limpo = ($rotulo.ToString() -replace "&", "").Trim()
    if ($limpo -eq "Sim" -or $limpo -eq "Yes") { $script:botaoSim = $c }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:botaoSim -eq [IntPtr]::Zero) { return $false }
  $caixa = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($script:botaoSim, [ref]$caixa)
  [HcCampo]::Ativar($dlg)
  [HcCampo]::Clicar([int](($caixa.L + $caixa.R) / 2), [int](($caixa.T + $caixa.B) / 2))
  return $true
}
function Gravar-Alteracao {
  if (-not (Clicar-NaBarra "CONFIRMAR")) { return $false }
  for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Milliseconds 250
    $dlg = Dialogo-Confirmacao
    if ($dlg -eq [IntPtr]::Zero) { continue }
    if (Clicar-Sim $dlg) {
      Start-Sleep -Milliseconds 700
      return -not [HcCampo]::IsWindowVisible($dlg)
    }
    $script:botaoSim = [IntPtr]::Zero
    [HcCampo]::EnumChildWindows($dlg, {
      param($c, $l)
      $rotulo = New-Object System.Text.StringBuilder 40
      [void][HcCampo]::SendMessage($c, 13, [IntPtr]40, $rotulo)
      if (($rotulo.ToString() -replace "&", "").Trim() -eq "OK") { $script:botaoSim = $c }
      return $true
    }, [IntPtr]::Zero) | Out-Null
    if ($script:botaoSim -ne [IntPtr]::Zero) {
      $caixa = New-Object HcCampo+RECT
      [void][HcCampo]::GetWindowRect($script:botaoSim, [ref]$caixa)
      [HcCampo]::Clicar([int](($caixa.L + $caixa.R) / 2), [int](($caixa.T + $caixa.B) / 2))
    }
    return $false
  }
  return $false
}
function Concluir-Preenchimento($como) {
  $visto = ""
  if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
    $buf = New-Object System.Text.StringBuilder 180
    [void][HcCampo]::SendMessage($edicao, 13, [IntPtr]180, $buf)
    $visto = $buf.ToString().Trim()
  }
  $naTela = if ($visto) { " Na tela ficou: $visto." } else { "" }
  if (Gravar-Alteracao) {
    Write-Output "OK O bot $como $valor no campo $campo do processo $numero e confirmou os dados na tela do HeadCargo.$naTela"
  } else {
    Write-Output "ERRO O bot $como $valor no campo $campo, mas não conseguiu confirmar os dados."
  }
  exit 0
}
function Voltar-Aba($origem, $inicial) {
  if (-not $inicial) { return }
  $foto = Foto-Janela
  $abas = Abas-DaTela $foto.Bitmap $foto.Ret
  $foto.Bitmap.Dispose()
  $destino = @($abas.Internas) | Where-Object { $_.Nome -eq $inicial -or $inicial.StartsWith($_.Nome) } | Select-Object -First 1
  if ($destino) { Clicar-Aba $destino $origem }
}

function Classe-De($hwnd) {
  if ($hwnd -eq [IntPtr]::Zero) { return "" }
  $nome = New-Object System.Text.StringBuilder 80
  [void][HcCampo]::GetClassName($hwnd, $nome, 80)
  return $nome.ToString()
}
function Texto-De($hwnd) {
  $lido = New-Object System.Text.StringBuilder 80
  [void][HcCampo]::SendMessage($hwnd, 13, [IntPtr]80, $lido)
  return (Normalizar ($lido.ToString() -replace "&", ""))
}
function Pagina-DaFolha($hwnd) {
  $atual = [HcCampo]::GetParent($hwnd)
  while ($atual -ne [IntPtr]::Zero -and $atual -ne $script:janela) {
    if ((Classe-De $atual) -match "PageControl|Notebook") { return $atual }
    $atual = [HcCampo]::GetParent($atual)
  }
  return [IntPtr]::Zero
}
function Ancestral-DaFolha($hwnd) {
  $pagina = Pagina-DaFolha $hwnd
  if ($pagina -eq [IntPtr]::Zero) { return [IntPtr]::Zero }
  $atual = [HcCampo]::GetParent($pagina)
  while ($atual -ne [IntPtr]::Zero -and $atual -ne $script:janela) {
    if ((Classe-De $atual) -match "TabSheet|NotebookPage") { return $atual }
    $atual = [HcCampo]::GetParent($atual)
  }
  return [IntPtr]::Zero
}
function Folhas-DoSistema {
  $script:folhasLista = New-Object System.Collections.Generic.List[object]
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ((Classe-De $c) -notmatch "TabSheet|NotebookPage") { return $true }
    $nome = Texto-De $c
    if ($nome.Length -lt 2) { return $true }
    $script:folhasLista.Add([pscustomobject]@{ Nome = $nome; Hwnd = $c; Pagina = (Pagina-DaFolha $c) })
    return $true
  }, [IntPtr]::Zero) | Out-Null
  $copias = @()
  for ($i = 0; $i -lt $script:folhasLista.Count; $i++) { $copias += $script:folhasLista[$i] }
  foreach ($folha in $copias) {
    $profundidade = 0
    $atual = Ancestral-DaFolha $folha.Hwnd
    while ($atual -ne [IntPtr]::Zero -and $profundidade -lt 8) {
      $profundidade++
      $atual = Ancestral-DaFolha $atual
    }
    $folha | Add-Member -NotePropertyName Profundidade -NotePropertyValue $profundidade -Force
  }
  return $copias
}
function Folha-PorHwnd($hwnd) {
  $chave = [int64]$hwnd
  return @($script:catalogo | Where-Object { [int64]$_.Hwnd -eq $chave } | Select-Object -First 1)
}
function Desce-De($folha, $raiz) {
  $alvo = [int64]$raiz
  $atual = Ancestral-DaFolha $folha.Hwnd
  $passos = 0
  while ($atual -ne [IntPtr]::Zero -and $passos -lt 8) {
    if ([int64]$atual -eq $alvo) { return $true }
    $atual = Ancestral-DaFolha $atual
    $passos++
  }
  return $false
}
function Ler-Secao($origem) {
  $script:shellRect = $null
  $script:secaoNome = ""
  $script:secaoY = 99999
  $script:origemSecao = $origem
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    $classe = Classe-De $c
    if ($classe -notlike "TfrmIm*") { return $true }
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $y = $rr.T - $script:origemSecao.T
    if ($classe -eq "TfrmImLogistica") {
      $script:shellRect = [pscustomobject]@{ X = ($rr.L - $script:origemSecao.L); Y = $y; W = ($rr.R - $rr.L) }
      return $true
    }
    if ($y -lt $script:secaoY) { $script:secaoY = $y; $script:secaoNome = (Texto-De $c) }
    return $true
  }, [IntPtr]::Zero) | Out-Null
}
function Faixa-DoControle($hwnd, $origem) {
  if ($hwnd -eq [IntPtr]::Zero -or -not [HcCampo]::IsWindowVisible($hwnd)) { return $null }
  $rr = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($hwnd, [ref]$rr)
  $x = $rr.L - $origem.L
  $y = $rr.T - $origem.T
  $w = [Math]::Min(980, $rr.R - $rr.L)
  if ($x -lt 0 -or $y -lt 40 -or $w -lt 80) { return $null }
  return @{ X = $x; Y = $y; W = $w }
}
function Ponto-NaFaixa($nome, $bmp, $faixa) {
  $grupos = @(Abas-Agrupadas (Palavras-DaFaixa $bmp $faixa.X $faixa.Y $faixa.W 26) 0 $faixa.Y)
  $alvo = $nome -replace " ", ""
  $melhor = $null
  $nota = 0
  foreach ($grupo in $grupos) {
    $lido = $grupo.Nome -replace " ", ""
    $n = 0
    if ($lido -eq $alvo) { $n = 100 }
    elseif ($alvo.Length -ge 4 -and $lido.Length -ge 4 -and $alvo.Contains($lido) -and $lido.Length -ge ($alvo.Length * 0.6)) { $n = 40 + $lido.Length }
    if ($n -gt $nota) { $nota = $n; $melhor = $grupo }
  }
  if ($nota -lt 40) { return $null }
  return $melhor
}
function Abrir-Folha($folha) {
  $chave = [int64]$folha.Hwnd
  if ([HcCampo]::IsWindowVisible($folha.Hwnd)) { return $true }
  if ($script:pilhaAbrir.ContainsKey($chave)) { return $false }
  $script:pilhaAbrir[$chave] = $true
  $ancestral = Ancestral-DaFolha $folha.Hwnd
  if ($ancestral -ne [IntPtr]::Zero) {
    $pai = Folha-PorHwnd $ancestral
    if ($null -eq $pai -or -not (Abrir-Folha $pai)) {
      [void]$script:pilhaAbrir.Remove($chave)
      return $false
    }
  }
  $pagina = $folha.Pagina
  if ($pagina -eq [IntPtr]::Zero -or -not [HcCampo]::IsWindowVisible($pagina)) {
    [void]$script:pilhaAbrir.Remove($chave)
    return $false
  }
  $foto = Foto-Janela
  $faixa = Faixa-DoControle $pagina $foto.Ret
  $ponto = $null
  if ($faixa) { $ponto = Ponto-NaFaixa $folha.Nome $foto.Bitmap $faixa }
  $giro = 0
  while (-not $ponto -and $faixa -and $giro -lt 4) {
    [HcCampo]::CliqueNo(($foto.Ret.L + $faixa.X + $faixa.W - 14), ($foto.Ret.T + $faixa.Y + 12))
    Start-Sleep -Milliseconds 220
    $foto.Bitmap.Dispose()
    $foto = Foto-Janela
    $faixa = Faixa-DoControle $pagina $foto.Ret
    if ($faixa) { $ponto = Ponto-NaFaixa $folha.Nome $foto.Bitmap $faixa }
    $giro++
  }
  $origem = $foto.Ret
  $foto.Bitmap.Dispose()
  if (-not $ponto) {
    [void]$script:pilhaAbrir.Remove($chave)
    return $false
  }
  Clicar-Aba $ponto $origem
  $aberta = $false
  for ($i = 0; $i -lt 8; $i++) {
    if ([HcCampo]::IsWindowVisible($folha.Hwnd)) { $aberta = $true; break }
    Start-Sleep -Milliseconds 140
  }
  [void]$script:pilhaAbrir.Remove($chave)
  return $aberta
}
function Curto-Util($pedido, $aba) {
  if (-not $aba) { return "" }
  $sem = Pedido-SemAba $pedido $aba
  $cheio = Normalizar $pedido
  if (-not $sem -or $sem -eq $cheio) { return "" }
  return $sem
}
function Procurar-NaSecao($pedido) {
  $script:catalogo = @(Folhas-DoSistema)
  $script:pilhaAbrir = @{}
  $citada = Aba-Citada $pedido $script:catalogo
  $script:pedidoCurto = Curto-Util $pedido $(if ($citada) { $citada.Nome } else { "" })
  $ordem = @($script:catalogo | Sort-Object Profundidade, Nome)
  if ($citada) {
    $antes = @()
    $depois = @()
    foreach ($folha in $ordem) {
      if ([int64]$folha.Hwnd -eq [int64]$citada.Hwnd -or (Desce-De $folha $citada.Hwnd)) { $antes += $folha } else { $depois += $folha }
    }
    $ordem = @($antes) + @($depois)
  }
  foreach ($folha in $ordem) {
    if ($script:visitas -ge 70) { break }
    $vista = "$($folha.Pagina)|$($folha.Nome)"
    if ($script:vistas.ContainsKey($vista)) { continue }
    $script:vistas[$vista] = $true
    $script:visitas++
    if (-not (Abrir-Folha $folha)) { continue }
    $busca = Buscar-Rotulo $pedido $false @()
    if ($busca.Rotulo) { return $busca }
  }
  return $null
}
function Faixas-Visiveis($origem) {
  $script:faixasVisiveis = @()
  $script:origemFaixa = $origem
  [HcCampo]::EnumChildWindows($script:janela, {
    param($c, $l)
    if ((Classe-De $c) -notmatch "PageControl") { return $true }
    if (-not [HcCampo]::IsWindowVisible($c)) { return $true }
    $rr = New-Object HcCampo+RECT
    [void][HcCampo]::GetWindowRect($c, [ref]$rr)
    $script:faixasVisiveis += ($rr.T - $script:origemFaixa.T)
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return @($script:faixasVisiveis)
}

if ($env:HC_TESTE_ROTULO -eq "1") {
  $bruto = $env:HC_CASOS | ConvertFrom-Json
  $casos = if ($bruto -is [System.Array]) { $bruto } else { @($bruto) }
  foreach ($caso in $casos) {
    $valor = [string]$caso.valor
    $script:pedidoCurto = [string]$caso.curto
    $palavras = @()
    $listaPalavras = $caso.palavras
    if ($listaPalavras -isnot [System.Array]) { $listaPalavras = @($listaPalavras) }
    foreach ($p in $listaPalavras) {
      $palavras += [pscustomobject]@{ T = [string]$p.t; X = [int]$p.x; Y = [int]$p.y; W = [int]$p.w; H = [int]$p.h }
    }
    $rotulo = Rotulo-DoCampo $palavras ([string]$caso.pedido)
    $texto = ""
    if ($null -ne $rotulo) { $texto = [string]$rotulo.Nome }
    Write-Output ("CASO|$($caso.id)|$texto")
  }
  $pedidoAba = "DATA DE EMBARQUE NA ABA EMBARQUE"
  $abas = @([pscustomobject]@{ Nome = "EMBARQUE" }, [pscustomobject]@{ Nome = "CARGA" })
  $citada = Aba-Citada "DATA EMBARQUE" $abas
  $citadaNome = ""
  if ($null -ne $citada) { $citadaNome = [string]$citada.Nome }
  Write-Output "CASO|aba-sem|$citadaNome"
  $citada2 = Aba-Citada $pedidoAba $abas
  $resto = ""
  if ($null -ne $citada2) { $resto = Pedido-SemAba $pedidoAba $citada2 }
  Write-Output "CASO|aba-com|$resto"
  exit 0
}

$pedido = Normalizar $campo
$atalho = $null
$codigoLista = ""
if ($script:dica -and $script:dica.lista -and $script:dica.codigo) { $codigoLista = [string]$script:dica.codigo }
if ($codigoLista) {
  $hwndLista = Combo-PelaLista $pedido $codigoLista
  if ($hwndLista -ne [IntPtr]::Zero) {
    $atalho = @{ Rotulo = $script:rotuloLista; Origem = $script:origemLista; Palavras = @() }
  }
}
if (-not $atalho) {
$script:pedidoCurto = ""
$script:vistas = @{}
$script:visitas = 0
$script:catalogo = @(Folhas-DoSistema)
$folhaInicial = @($script:catalogo | Where-Object { [HcCampo]::IsWindowVisible($_.Hwnd) } | Sort-Object Profundidade -Descending | Select-Object -First 1)
$fotoInicial = Foto-Janela
Ler-Secao $fotoInicial.Ret
$secaoInicial = $script:secaoNome
$faixasAtuais = Faixas-Visiveis $fotoInicial.Ret
$fotoInicial.Bitmap.Dispose()
$citadaInicial = Aba-Citada $pedido $script:catalogo
$script:pedidoCurto = Curto-Util $pedido $(if ($citadaInicial) { $citadaInicial.Nome } else { "" })
$busca = Buscar-Rotulo $pedido $false @()
if (-not $busca.Rotulo) { $busca = Buscar-Rotulo $pedido $true $faixasAtuais }
if (-not $busca.Rotulo) {
  foreach ($folha in $script:catalogo) {
    if ([HcCampo]::IsWindowVisible($folha.Hwnd)) { $script:vistas["$($folha.Pagina)|$($folha.Nome)"] = $true }
  }
  $busca = Procurar-NaSecao $pedido
}
if (-not $busca.Rotulo) {
  $fotoSecao = Foto-Janela
  Ler-Secao $fotoSecao.Ret
  $faixaExterna = $null
  if ($script:shellRect -and $script:secaoY -lt 99999) {
    $altura = $script:secaoY - $script:shellRect.Y - 18
    if ($altura -ge 18 -and $altura -le 70) {
      $faixaExterna = @{ X = [int]$script:shellRect.X; Y = ([int]$script:shellRect.Y + 16); W = [Math]::Min(980, [int]$script:shellRect.W) }
    }
  }
  $externas = @()
  if ($faixaExterna) { $externas = @(Abas-Agrupadas (Palavras-DaFaixa $fotoSecao.Bitmap $faixaExterna.X $faixaExterna.Y $faixaExterna.W $altura) 0 $faixaExterna.Y) }
  $origemSecao = $fotoSecao.Ret
  $fotoSecao.Bitmap.Dispose()
  if (-not $script:secoesVistas) { $script:secoesVistas = @{} }
  foreach ($aba in $externas) {
    if ($busca.Rotulo) { break }
    if ($aba.Nome.Length -lt 4 -or $aba.Nome -eq $script:secaoNome) { continue }
    if ($script:secoesVistas.ContainsKey($aba.Nome)) { continue }
    $script:secoesVistas[$aba.Nome] = $true
    Clicar-Aba $aba $origemSecao
    $mudou = $false
    for ($i = 0; $i -lt 8; $i++) {
      Start-Sleep -Milliseconds 160
      $fotoNova = Foto-Janela
      Ler-Secao $fotoNova.Ret
      $fotoNova.Bitmap.Dispose()
      if ($script:secaoNome -and $script:secaoNome -ne $secaoInicial) { $mudou = $true; break }
    }
    if (-not $mudou) { continue }
    $busca = Procurar-NaSecao $pedido
  }
}
if (-not $busca.Rotulo) {
  if ($secaoInicial) {
    $fotoVolta = Foto-Janela
    Ler-Secao $fotoVolta.Ret
    if ($script:secaoNome -ne $secaoInicial -and $script:shellRect) {
      $altura = $script:secaoY - $script:shellRect.Y - 18
      if ($altura -ge 18) {
        $faixaVolta = @{ X = [int]$script:shellRect.X; Y = ([int]$script:shellRect.Y + 16); W = [Math]::Min(980, [int]$script:shellRect.W) }
        $pontoVolta = Ponto-NaFaixa $secaoInicial $fotoVolta.Bitmap $faixaVolta
        if ($pontoVolta) { Clicar-Aba $pontoVolta $fotoVolta.Ret }
      }
    }
    $fotoVolta.Bitmap.Dispose()
  }
  if ($folhaInicial) {
    $script:catalogo = @(Folhas-DoSistema)
    $script:pilhaAbrir = @{}
    [void](Abrir-Folha $folhaInicial)
  }
}
} else {
  $busca = $atalho
}
if (-not $busca -or -not $busca.Rotulo) { Write-Output "ERRO Não vi o campo $campo nas abas do processo $numero."; exit 0 }
$palavras = $busca.Palavras
$rotulo = $busca.Rotulo
$origem = $busca.Origem
$edicao = $null
$celula = $null
if (-not $script:rotulosCampo) { $script:rotulosCampo = @($rotulo) }
foreach ($opcao in @($script:rotulosCampo)) {
  $rotulo = $opcao
  $edicao = Edicao-AoLado $rotulo $origem
  if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) { break }
  $edicao = $null
  $celula = Celula-DoCampo $palavras $rotulo $numero
  if ($celula) { break }
}
if (($edicao -eq $null -or $edicao -eq [IntPtr]::Zero) -and -not $celula) {
  Write-Output "ERRO Vi o campo $campo, mas não achei o valor ao lado do rótulo. O filtro do processo não foi alterado."
  exit 0
}
if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
  $caixa = New-Object HcCampo+RECT
  [void][HcCampo]::GetWindowRect($edicao, [ref]$caixa)
  if ($env:HC_SO_OLHAR -eq "1") {
    $atual = New-Object System.Text.StringBuilder 180
    [void][HcCampo]::SendMessage($edicao, 13, [IntPtr]180, $atual)
    Write-Output "OK vi campo=$campo edicao=$([int](($caixa.L+$caixa.R)/2)),$([int](($caixa.T+$caixa.B)/2)) texto=$($atual.ToString().Trim())"
    exit 0
  }
  $cliqueX = [int](($caixa.L + $caixa.R) / 2)
  $cliqueY = [int](($caixa.T + $caixa.B) / 2)
} else {
  if ($env:HC_SO_OLHAR -eq "1") { Write-Output "OK vi campo=$campo celula=$($celula.Meio),$($celula.Y)"; exit 0 }
  $cliqueX = $origem.L + $celula.Meio
  $cliqueY = $origem.T + $celula.Y
}
$classeEdicao = ""
if ($env:HC_SO_OLHAR -ne "1") {
  [void](Clicar-NaBarra "ALTERAR")
  if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) { $edicao = Edicao-AoLado $rotulo $origem }
}
if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
  $nomeEdicao = New-Object System.Text.StringBuilder 60
  [void][HcCampo]::GetClassName($edicao, $nomeEdicao, 60)
  $classeEdicao = $nomeEdicao.ToString()
}
if ($classeEdicao -match "Combo") {
  if ($valor -match "^\d{1,2}/\d{1,2}/\d{4}$") {
    [HcCampo]::Tecla(0x1B, $false)
    Write-Output "ERRO O campo ao lado de $campo é uma lista, não a data. Nada foi alterado."
    exit 0
  }
  $porNome = Selecionar-PorCodigo $edicao $valor
  if ($porNome -eq "ok") {
    Concluir-Preenchimento "selecionou"
    exit 0
  }
  $codigoEscolha = ""
  if ($script:dica -and $script:dica.lista -and $script:dica.codigo) { $codigoEscolha = [string]$script:dica.codigo }
  if ($codigoEscolha) {
    $porCodigo = Selecionar-PorCodigo $edicao $codigoEscolha
    if ($porCodigo -eq "ok") {
      Concluir-Preenchimento "selecionou"
      exit 0
    }
    if ($porCodigo -eq "ausente") {
      Write-Output "ERRO A opção $valor não está na lista do campo $campo deste processo."
      exit 0
    }
  }
  [HcCampo]::Ativar($script:janela)
  [void][HcCampo]::Enviar($edicao, 0x014F, [IntPtr]1, [IntPtr]::Zero)
  $aberta = [IntPtr]::Zero
  for ($i = 0; $i -lt 8 -and $aberta -eq [IntPtr]::Zero; $i++) {
    Start-Sleep -Milliseconds 120
    $aberta = Lista-Aberta
  }
  if ($aberta -ne [IntPtr]::Zero) {
    $marcado = Escolher-Item $valor
    if ($marcado -eq "ambiguo") {
      Write-Output "ERRO $script:erroEscolha"
      exit 0
    }
  }
  if ($aberta -ne [IntPtr]::Zero -and $marcado -eq "ok") {
    [void][HcCampo]::Enviar($edicao, 0xBD11, [IntPtr]0x10000, [IntPtr]::Zero)
    [void][HcCampo]::Enviar($edicao, 0xBD11, [IntPtr]0x90000, [IntPtr]::Zero)
    Start-Sleep -Milliseconds 400
    $pintado = Palavras-Ampliadas $edicao 4 $true
    $textoPintado = ""
    if ($pintado) { $textoPintado = (($pintado.Palavras | ForEach-Object { $_.T }) -join "") }
    if (Texto-Confere $textoPintado $valor) {
      Concluir-Preenchimento "selecionou"
      exit 0
    }
    $conferencia = Foto-Janela
    $visto = Palavras-DaFoto $conferencia
    $conferencia.Bitmap.Dispose()
    if (Viu-Valor $visto $rotulo $valor) {
      Concluir-Preenchimento "selecionou"
      exit 0
    }
    Write-Output "ERRO O bot viu $valor na lista de $campo, mas o clique não selecionou o item."
    exit 0
  }
  [void][HcCampo]::Enviar($edicao, 0x014F, [IntPtr]::Zero, [IntPtr]::Zero)
  [HcCampo]::Tecla(0x1B, $false)
  Write-Output "ERRO O bot achou $campo, mas a lista não ficou em $valor. Nada foi alterado."
  exit 0
}
[HcCampo]::Ativar($script:janela)
[HcCampo]::Clicar($cliqueX, $cliqueY)
Start-Sleep -Milliseconds 220
if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
  [void][HcCampo]::Enviar($edicao, 0xB1, [IntPtr]::Zero, [IntPtr](-1))
}
Start-Sleep -Milliseconds 80
[HcCampo]::Tecla(0x24, $false)
Start-Sleep -Milliseconds 40
$digitar = $valor
if ($valor -match "^\d{1,2}/\d{1,2}/\d{4}$") { $digitar = $valor -replace "\D", "" }
if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
  $porUia = $false
  if ($valor -notmatch "^\d{1,2}/\d{1,2}/\d{4}$") { $porUia = Definir-ValorUia $edicao $digitar }
  if (-not $porUia) { [void][HcCampo]::DefinirTexto($edicao, 0xC2, [IntPtr]1, $digitar) }
  Start-Sleep -Milliseconds 80
  $lidoTroca = New-Object System.Text.StringBuilder 180
  [void][HcCampo]::SendMessage($edicao, 13, [IntPtr]180, $lidoTroca)
  $trocado = $lidoTroca.ToString().Trim()
  $okTroca = (Texto-Confere $trocado $valor) -or (($trocado -replace "\D") -and ($trocado -replace "\D") -eq ($valor -replace "\D"))
  if (-not $okTroca) {
    [HcCampo]::Clicar($cliqueX, $cliqueY)
    Start-Sleep -Milliseconds 80
    [HcCampo]::Tecla(0x41, $true)
    Start-Sleep -Milliseconds 40
    [HcCampo]::Digitar($digitar)
  }
} else {
  [HcCampo]::Digitar($digitar)
}
Start-Sleep -Milliseconds 80
[HcCampo]::Tecla(0x09, $false)
Start-Sleep -Milliseconds 700
$conferencia = Foto-Janela
$visto = Palavras-DaFoto $conferencia
$conferencia.Bitmap.Dispose()
$noCampo = ""
if ($edicao -ne $null -and $edicao -ne [IntPtr]::Zero) {
  $atual = New-Object System.Text.StringBuilder 180
  [void][HcCampo]::SendMessage($edicao, 13, [IntPtr]180, $atual)
  $noCampo = $atual.ToString().Trim()
}
$digitosCampo = $noCampo -replace "\D", ""
$digitosValor = $valor -replace "\D", ""
$confirmou = (Viu-Valor $visto $rotulo $valor) -or (Texto-Confere $noCampo $valor) -or ($digitosCampo -and $digitosCampo -eq $digitosValor)
if (-not $confirmou -and $edicao -ne $null -and $edicao -ne [IntPtr]::Zero -and $valor -notmatch "^\d{1,2}/\d{1,2}/\d{4}$") {
  $pesquisou = Pesquisa-NoCampo $rotulo $origem $valor
  if ($script:erroEscolha) {
    Write-Output "ERRO $script:erroEscolha"
    exit 0
  }
  if ($pesquisou) {
    $atual = New-Object System.Text.StringBuilder 180
    [void][HcCampo]::SendMessage($edicao, 13, [IntPtr]180, $atual)
    $confirmou = Texto-Confere $atual.ToString().Trim() $valor
    if ($confirmou) {
      Concluir-Preenchimento "selecionou"
      exit 0
    }
  }
}
if ($confirmou) {
  Concluir-Preenchimento "digitou"
} else {
  Write-Output "ERRO O bot clicou em $campo, mas a tela do HeadCargo não mostrou $valor. Nada foi gravado no banco."
}
