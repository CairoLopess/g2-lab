package br.com.medic.repository;

import br.com.medic.entity.Consulta;
import br.com.medic.enums.StatusConsulta;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ConsultaRepository extends JpaRepository<Consulta, Long> {
    List<Consulta> findByPacienteIdOrderByDataConsultaDesc(Long pacienteId);

    long countByMedicoIdAndDataConsultaBetween(UUID medicoId, LocalDateTime inicio, LocalDateTime fim);

    long countByMedicoIdAndStatus(UUID medicoId, StatusConsulta status);

    long countByMedicoIdAndProntuarioGeradoAndDataConsultaBetween(UUID medicoId, Boolean prontuarioGerado, LocalDateTime inicio, LocalDateTime fim);
}