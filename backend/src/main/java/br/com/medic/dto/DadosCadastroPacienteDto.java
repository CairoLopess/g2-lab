package br.com.medic.dto;

import java.time.LocalDate;

import org.hibernate.validator.constraints.br.CPF;

import jakarta.validation.constraints.NotBlank;

public record DadosCadastroPacienteDto(
    @NotBlank String nome,
    @CPF(message = "CPF inválido")
    String cpf,
    String telefone,
    String email,
    LocalDate dataNascimento, 
    String sexo
) {}
