package br.com.medic.enums;


public enum StatusConsulta {
    CRIADA,             // Médico abriu a tela, mas não gravou
    PROCESSANDO_AUDIO,  // Whisper transcrevendo
    PROCESSANDO_IA,     // GPT estruturando
    AGUARDANDO_REVISAO, // IA terminou, médico está lendo
    FINALIZADA          // Médico salvou e fechou
}
