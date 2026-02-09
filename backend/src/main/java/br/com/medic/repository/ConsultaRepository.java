package br.com.medic.repository;

import br.com.medic.entity.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ConsultaRepository extends JpaRepository<Consulta, Long> {
    List<Consulta> findByPacienteIdOrderByDataConsultaDesc(Long pacienteId);
}