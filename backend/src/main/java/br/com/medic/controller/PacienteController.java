package br.com.medic.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import br.com.medic.dto.DadosCadastroPacienteDto;
import br.com.medic.dto.PacienteResponseDto;
import br.com.medic.entity.Medico;
import br.com.medic.entity.Paciente;
import br.com.medic.repository.PacienteRepository;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/pacientes")
public class PacienteController {


	private static final Logger log = LoggerFactory.getLogger(PacienteController.class);

    private PacienteRepository repository;

    public PacienteController(PacienteRepository repository) {
    	this.repository = repository;
    }

    @GetMapping
    public ResponseEntity<List<PacienteResponseDto>> listar() {
        var medicoLogado = getMedicoLogado();

        log.info("[PACIENTES] Médico '{}' (ID: {}) solicitou a lista de pacientes.",
                medicoLogado.getNome(), medicoLogado.getId());

        var pacientes = repository.findByMedicoResponsavelId(medicoLogado.getId());

        var dtos = pacientes.stream()
                .map(PacienteResponseDto::fromEntity)
                .toList();

        log.info("[PACIENTES] Foram encontrados {} pacientes.", dtos.size());

        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    @Transactional
    public ResponseEntity cadastrar(@RequestBody @Valid DadosCadastroPacienteDto dados) {
        var medicoLogado = getMedicoLogado();

        log.info("[PACIENTES] Iniciando cadastro. Médico: {}, CPF Alvo: {}",
                medicoLogado.getNome(), dados.cpf());

        boolean jaCadastrado = repository.existsByCpfAndMedicoResponsavelId(dados.cpf(), medicoLogado.getId());

        if (jaCadastrado) {
            log.warn("[PACIENTES] Tentativa de duplicidade bloqueada. CPF {} já pertence ao médico {}.",
                    dados.cpf(), medicoLogado.getNome());

            return ResponseEntity.badRequest().body("Este CPF já está cadastrado na sua lista de pacientes.");
        }

        var paciente = new Paciente();
        paciente.setNome(dados.nome());
        paciente.setCpf(dados.cpf());
        paciente.setTelefone(dados.telefone());
        paciente.setEmail(dados.email());
        paciente.setMedicoResponsavel(medicoLogado);
        paciente.setSexo(dados.sexo());
        paciente.setDataNascimento(dados.dataNascimento());

        repository.save(paciente);

        log.info("[PACIENTES] Paciente salvo com sucesso! ID: {}", paciente.getId());

        return ResponseEntity.ok(paciente);
    }

    private Medico getMedicoLogado() {
        return (Medico) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
