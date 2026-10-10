# TTS on-device em pt-BR para iOS (10/10/2026)

Use on-device **só** para texto dinâmico (gerado em runtime). Diálogo fixo é pré-renderizado e embarcado.

## Modelos

| Modelo | Licença | Tamanho | pt-BR | Clonagem | Medidas |
| --- | --- | --- | --- | --- | --- |
| **Kokoro-82M** | Apache-2.0 (pesos inclusive) | CoreML fp16+int8 ≈80 MB (≈170 MB em outra conversão); ≈350 MB via download do swift-tts | sim (`p`, Brazilian Portuguese; G2P `misaki` com fallback espeak-ng) | não | ≈16,9× tempo real no iPhone 16 Pro, pipeline quase todo no Neural Engine (kokoro-coreml-ane); MLX-Swift ≈3,3× RT no iPhone 13 Pro (kokoro-ios) |
| **Chatterbox Nano** 110M / Multilingual V3 500M / fine-tune pt-BR | MIT; watermark Perth em toda saída | 416 MB (Mac) | sim | zero-shot | ≈3× RT em 8 núcleos de CPU (sem medida de iPhone) |
| **Qwen3-TTS** 0,6B/1,7B | Apache-2.0 | — | sim (português) | 3 s | sem porta iOS verificada; swift-tts só Mac via MLX |
| **Kyutai Pocket TTS** ~100M | código MIT; licença dos pesos não declarada; vozes com licenças próprias | — | PT oficial | sim (WAV) | ≈6× RT em M4 CPU 2 núcleos; iOS via sherpa-onnx (comunidade) |
| Supertonic 3 99M | pesos OpenRAIL-M (restrições de uso); repo arquivado | ≈382 MB | 31 idiomas | Voice Builder encerrado 31/08/2026 | swift-tts marca `hasLicenseRestrictions` |

## Pacotes Swift

- **FluidAudio** (Apache-2.0; SPM `from: "0.12.4"`): Kokoro 82M (SSML, 9 idiomas; "Kokoro ANE v3" exige iOS 18/macOS 15), PocketTTS (streaming + clonagem), Chatterbox Multilingual 520M e Nano 110M (beta), Paradee 8M. O README também tem uma linha conflitante "TTS currently supports American English only" — teste pt-BR antes de prometer.
- **swift-tts** (MIT, 2026): protocolo único `TTSEngine` sobre vozes do sistema, Kokoro (CoreML/ANE), PocketTTS (CoreML, recomendado para mobile), Supertonic 3 (ONNX); Chatterbox/Qwen3-TTS só Mac via MLX; core iOS 17+/macOS 14+; exclui Fish S2, F5-TTS, XTTS e Orpheus por licença.
- **mlalma/kokoro-ios** (MIT): porta MLX-Swift, iOS 18+/macOS 15+, modelo e estilos fornecidos pelo app.
- **sherpa-onnx** (Apache-2.0): TTS offline em iOS/Android/Swift com Matcha, Piper/VITS, Kokoro (apps comunitários), Supertonic, ZipVoice, Pocket TTS.
- **AVSpeechSynthesizer** (sistema): fallback sem download; Personal Voice gera no dispositivo; regressões reportadas no iOS 26 (voz padrão devolvida, Personal Voice silenciando em betas) — teste no iOS alvo.

## Restrições iOS

- GPU em segundo plano é suspensa antes do iOS 26; iOS 26 adiciona o entitlement `com.apple.developer.background-tasks.continued-processing.gpu`; prefira Neural Engine/CPU (como o kokoro-coreml-ane).
- Tamanho: ≥80 MB extra no app; use On-Demand Resources ou Apple-Hosted Background Assets se o bundle estourar o orçamento.
- Mínimo de OS: swift-tts iOS 17+; FluidAudio Kokoro ANE v3 iOS 18+; kokoro-ios iOS 18+.
- Qualquer modelo que gere fala para chat entra na classificação etária (chatbot conta) e precisa de filtro/denúncia (Guidelines 1.2/4.7.1) — ver skills de IA em runtime.

## Receita de integração (fase 7)

1. Adicionar FluidAudio ou swift-tts por SPM; baixar/empacotar o modelo Kokoro; selecionar voz pt-BR.
2. Sintetizar para `AVAudioPCMBuffer` (24 kHz) e tocar via `AVAudioPlayerNode` no bus de voz do `AVAudioEngine` (ver `/audio-adaptativo-no-engine`); aplicar ducking de música.
3. Medir RTF e memória no simulador e no dispositivo real; registrar em `production/evidencias/`.
4. Fallback para `AVSpeechSynthesizer` se o modelo não carregar.
5. Legendas sempre: o texto já existe, mostre-o.

## URLs

- https://github.com/hexgrad/kokoro · https://github.com/Jon-Schneider/kokoro-coreml-ane · https://huggingface.co/aufklarer/Kokoro-82M-CoreML
- https://github.com/FluidInference/FluidAudio · https://github.com/arraypress/swift-tts · https://github.com/mlalma/kokoro-ios · https://github.com/k2-fsa/sherpa-onnx
- https://github.com/resemble-ai/chatterbox · https://github.com/QwenLM/Qwen3-TTS · https://github.com/kyutai-labs/pocket-tts · https://github.com/supertone-inc/supertonic
- https://developer.apple.com/forums/thread/804648 · https://developer.apple.com/forums/thread/792409 · https://developer.apple.com/videos/play/wwdc2023/10033/
