package br.com.medic.repository;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import br.com.medic.entity.Medico;

public interface MedicoRepository extends JpaRepository<Medico, UUID> {
    Medico findByEmail(String email);
}