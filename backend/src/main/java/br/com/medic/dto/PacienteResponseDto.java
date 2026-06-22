package br.com.medic.dto;


import br.com.medic.entity.Paciente;
import java.time.LocalDate;

public record PacienteResponseDto(
    Long id,
    String nome,
    String cpf,
    String email,
    String telefone,
    String sexo,
    Integer idade, // Calculado ou bruto
    LocalDate dataCadastro
) {
    // Método auxiliar para converter Entidade -> DTO
    public static PacienteResponseDto fromEntity(Paciente paciente) {

        return new PacienteResponseDto(
            paciente.getId(),
            paciente.getNome(),
            paciente.getCpf(),
            paciente.getEmail(),
            paciente.getTelefone(),
            paciente.getSexo(),
            paciente.getIdade(),
            paciente.getDataCadastro()
        );
    }
}
