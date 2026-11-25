# Generate one WAV per narration segment with the built-in Windows voice.
param([string]$Voice = 'Microsoft Zira Desktop', [int]$Rate = 0)
Add-Type -AssemblyName System.Speech
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$out = Join-Path $here 'build'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$json = [System.IO.File]::ReadAllText((Join-Path $here 'narration.json'), [System.Text.Encoding]::UTF8)
$segments = $json | ConvertFrom-Json

# Spell a few words the way the voice should say them (screen text is unaffected).
$say = @{ 'README' = 'read me'; '404' = 'four oh four'; 'Séance' = 'Say-ahnce'; 'EARS' = 'ears' }

foreach ($seg in $segments) {
  $text = $seg.text
  foreach ($k in $say.Keys) { $text = $text.Replace($k, $say[$k]) }
  $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $synth.SelectVoice($Voice)
  $synth.Rate = $Rate
  $synth.SetOutputToWaveFile((Join-Path $out ($seg.id + '.wav')))
  $synth.Speak($text)
  $synth.Dispose()
  Write-Output ("wrote " + $seg.id)
}
