package br.com.medic.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record DadosCadastroMedicoDto(
    @NotBlank
    String nome,
    
    @NotBlank
    @Email
    String email,	
    
    @NotBlank
    String crm,
    
    @NotBlank
    String senha 
) {}
