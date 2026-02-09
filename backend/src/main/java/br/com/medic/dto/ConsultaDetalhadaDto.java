package br.com.medic.dto;


import java.time.LocalDateTime;

public record ConsultaDetalhadaDto(
    Long id,
    String nomePaciente, // Só o nome, não o objeto inteiro
    String nomeMedico,   // Só o nome
    LocalDateTime data,
    String transcricao,
    String conduta,
    String status
) {}