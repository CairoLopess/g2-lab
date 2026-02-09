package br.com.medic.dto;

import jakarta.validation.constraints.NotBlank;

public record DadosCadastroPacienteDto(
    @NotBlank String nome,
    @NotBlank String cpf,
    String telefone,
    String email
) {}
