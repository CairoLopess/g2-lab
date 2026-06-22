package br.com.medic.dto;

import java.util.List;

public record CopilotoResponseDto(
    List<String> perguntasSugeridas,
    List<String> hipotesesDiagnosticas,
    DadosExtraidos dadosExtraidos
) {
    public record DadosExtraidos(
        List<String> queixaPrincipal,
        List<String> hda,
        List<String> sintomasAssociados,
        List<String> antecedentesPessoais,
        List<String> antecedentesFamiliares,
        List<String> medicamentosEmUso,
        List<String> alergias
    ) {}
}
