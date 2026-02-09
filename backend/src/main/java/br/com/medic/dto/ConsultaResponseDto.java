package br.com.medic.dto;


import br.com.medic.entity.Consulta;
import java.time.LocalDateTime;

public record ConsultaResponseDto(
    Long id,
    String status,
    LocalDateTime dataConsulta,
    
    Long pacienteId,
    String nomePaciente,
    String nomeMedico,

    // Dados da IA
    String transcricao,
    String queixaPrincipal,
    String hda,
    String alergias,
    String medicamentosEmUso,
    String antecedentesPessoais,
    String historicoFamiliar,
    String habitos,
    String exameFisico,
    String hipoteseDiagnostica,
    String conduta,
    String examesSolicitados
) {
    public static ConsultaResponseDto fromEntity(Consulta c) {
        return new ConsultaResponseDto(
            c.getId(),
            c.getStatus().toString(),
            c.getDataConsulta(),
            c.getPaciente().getId(),
            c.getPaciente().getNome(), // Aqui o Hibernate busca o nome
            c.getMedico().getNome(),   // Aqui o Hibernate busca o nome
            c.getTranscricaoBruta(),
            c.getQueixaPrincipal(),
            c.getHda(),
            c.getAlergias(),
            c.getMedicamentosEmUso(),
            c.getAntecedentesPessoais(),
            c.getHistoricoFamiliar(),
            c.getHabitos(),
            c.getExameFisico(),
            c.getHipoteseDiagnostica(),
            c.getConduta(),
            c.getExamesSolicitados()
        );
    }
}