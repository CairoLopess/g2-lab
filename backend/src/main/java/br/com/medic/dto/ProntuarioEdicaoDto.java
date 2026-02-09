package br.com.medic.dto;

public record ProntuarioEdicaoDto(
    String queixaPrincipal,
    String hda,
    String conduta,
    String alergias,
    String medicamentosEmUso,
    String antecedentesPessoais,
    String historicoFamiliar,
    String habitos,
    String exameFisico,
    String hipoteseDiagnostica,
    String examesSolicitados,
    String anamneseFormatada
) {}