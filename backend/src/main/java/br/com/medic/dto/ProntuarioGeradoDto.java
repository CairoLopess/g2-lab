package br.com.medic.dto;

public record ProntuarioGeradoDto(
    String queixaPrincipal,
    String resumoProntuario, // Novo
    String hda,
    String revisaoSistemas,  // Novo
    String antecedentesPessoais,
    String antecedentesFamiliares,
    String medicamentosEmUso,
    String alergias,
    String habitosDeVida,
    String exameFisico,
    String examesComplementares,
    String impressaoDiagnostica, // Antigo 'hipoteseDiagnostica'
    String conduta
) {}