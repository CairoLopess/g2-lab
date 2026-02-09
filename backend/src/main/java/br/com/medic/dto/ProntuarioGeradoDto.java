package br.com.medic.dto;

public record ProntuarioGeradoDto(
    String queixaPrincipal,
    String hda,

    // Novos campos mapeados
    String alergias,
    String medicamentosEmUso,
    String antecedentesPessoais,
    String historicoFamiliar,
    String habitos,

    String exameFisico,
    String hipoteseDiagnostica,
    String conduta,
    String examesSolicitados,
    String anamneseFormatada
) {}
