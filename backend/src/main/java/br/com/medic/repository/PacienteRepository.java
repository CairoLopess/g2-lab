package br.com.medic.repository;

import br.com.medic.entity.Paciente;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface PacienteRepository extends JpaRepository<Paciente, Long> {
    List<Paciente> findByMedicoResponsavelId(UUID medicoId);
    
    List<Paciente> findByNomeContainingIgnoreCaseAndMedicoResponsavelId(String nome, UUID medicoId);
    
}