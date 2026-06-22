package br.com.medic.dto;

import br.com.medic.entity.Consulta;
import java.time.LocalDateTime;

public record ConsultaResponseDto(
    Long id,
    LocalDateTime dataConsulta,
    String status,
    PacienteResponseDto paciente,
    String transcricaoBruta,      // <-- ADICIONADO
    String iaDadosEstruturados,   // <-- ADICIONADO
    String anamneseFormatada      // <-- ADICIONADO
) {
    public static ConsultaResponseDto fromEntity(Consulta consulta) {
        return new ConsultaResponseDto(
            consulta.getId(),
            consulta.getDataConsulta(),
            consulta.getStatus().name(),
            PacienteResponseDto.fromEntity(consulta.getPaciente()),
            consulta.getTranscricaoBruta(),     // <-- ADICIONADO
            consulta.getIaDadosEstruturados(),  // <-- ADICIONADO
            consulta.getAnamneseFormatada()     // <-- ADICIONADO
        );
    }
}