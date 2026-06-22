package br.com.medic.service;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.medic.dto.ConsultaResponseDto;
import br.com.medic.dto.CopilotoResponseDto;
import br.com.medic.entity.Consulta;
import br.com.medic.entity.Medico;
import br.com.medic.entity.Paciente;
import br.com.medic.enums.StatusConsulta;
import br.com.medic.repository.ConsultaRepository;
import br.com.medic.repository.MedicoRepository;
import br.com.medic.repository.PacienteRepository;
import br.com.medic.service.ai.MedicoAssistenteAi;
import dev.langchain4j.service.Result;

@Service
public class ConsultaService {

    private static final Logger log = LoggerFactory.getLogger(ConsultaService.class);
    
    private final ConsultaRepository consultaRepository;
    private final PacienteRepository pacienteRepository;
    private final MedicoRepository medicoRepository;
    private final ObjectMapper objectMapper;
    private final MedicoAssistenteAi medicoAi;

    public ConsultaService(ConsultaRepository consultaRepository,
                           PacienteRepository pacienteRepository,
                           MedicoRepository medicoRepository,
                           ObjectMapper objectMapper,
                           MedicoAssistenteAi medicoAi) {
        this.consultaRepository = consultaRepository;
        this.pacienteRepository = pacienteRepository;
        this.medicoRepository = medicoRepository;
        this.objectMapper = objectMapper;
        this.medicoAi = medicoAi;
    }

    @Transactional
    public Consulta iniciarConsulta(Long pacienteId, UUID medicoId) {
        Paciente paciente = pacienteRepository.findById(pacienteId)
                .orElseThrow(() -> new RuntimeException("Paciente não encontrado"));
        Medico medico = medicoRepository.findById(medicoId)
                .orElseThrow(() -> new RuntimeException("Médico não encontrado"));

        Consulta consulta = new Consulta(paciente, medico); // Usa o construtor limpo
        return consultaRepository.save(consulta);
    }
    
    @Transactional
    public void atualizarRascunho(Long consultaId, String transcricao, Object resumoObj) {
        Consulta consulta = consultaRepository.findById(consultaId)
                .orElseThrow(() -> new RuntimeException("Consulta não encontrada"));
        
        consulta.setTranscricaoBruta(transcricao);
        
        try {
            if (resumoObj != null) {
                // Transforma o objeto do frontend em String JSON segura para o AES encriptar
                consulta.setIaDadosEstruturados(objectMapper.writeValueAsString(resumoObj));
            }
        } catch (Exception e) {
            log.warn("Erro ao converter resumo para JSON", e);
        }
        
        consultaRepository.save(consulta);
    }

    @Transactional
    public Map<String, String> gerarDocumentoUnificado(Long consultaId, String transcricao, String resumoJson) {
        Consulta consulta = consultaRepository.findById(consultaId)
                .orElseThrow(() -> new RuntimeException("Consulta não encontrada"));

        // TRAVA DE ECONOMIA: Impede requisições duplicadas à OpenAI
        if (Boolean.TRUE.equals(consulta.getProntuarioGerado())) {
            throw new IllegalStateException("O prontuário desta consulta já foi gerado.");
        }
        
        Paciente p = consulta.getPaciente();

        StringBuilder doc = new StringBuilder();
        doc.append("PRONTUÁRIO MÉDICO\n");
        doc.append("==================================================\n");
        doc.append("PACIENTE: ").append(p.getNome()).append("\n");
        doc.append("IDADE: ").append(p.getIdade()).append(" anos  |  SEXO: ").append(p.getSexo()).append("\n");
        doc.append("DATA: ").append(consulta.getDataConsulta().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))).append("\n");
        doc.append("MÉDICO: ").append(consulta.getMedico().getNome()).append("\n");
        doc.append("==================================================\n\n");

        log.info("[AI] Redigindo corpo do prontuário para consulta {}", consultaId);
        String contextoResumo = (resumoJson != null) ? resumoJson : "";
        
        Result<String> resultadoAi = medicoAi.redigirProntuarioTexto(
            "TRANSCRICAO:\n" + transcricao,
            "RESUMO:\n" + contextoResumo
        );

        doc.append(resultadoAi.content());

        // SALVA TUDO E ATIVA A TRAVA
        consulta.setAnamneseFormatada(doc.toString());
        consulta.setProntuarioGerado(true);
        consultaRepository.save(consulta);

        Map<String, String> response = new HashMap<>();
        response.put("documento", doc.toString());
        return response;
    }

    // MODELO NOVO: Agora só precisamos salvar o textão final e fechar a consulta
    @Transactional
    public Consulta finalizarConsulta(Long consultaId, String documentoFinalEditado) {
        Consulta consulta = consultaRepository.findById(consultaId)
                .orElseThrow(() -> new RuntimeException("Consulta não encontrada"));

        consulta.setAnamneseFormatada(documentoFinalEditado);
        consulta.setStatus(StatusConsulta.FINALIZADA);
        
        return consultaRepository.save(consulta);
    }
    
    @Transactional
    public String obterSugestoesIA(Long consultaId) {
        Consulta consulta = consultaRepository.findById(consultaId)
                .orElseThrow(() -> new RuntimeException("Consulta não encontrada"));
        
        try {
            // Usa o JSON guardado no rascunho como contexto
            String jsonContexto = consulta.getIaDadosEstruturados();
            if (jsonContexto == null || jsonContexto.isEmpty()) {
                return "Sem dados clínicos suficientes para sugestões.";
            }

            Result<String> resultado = medicoAi.gerarSugestoesClinicas(jsonContexto);
            consultaRepository.save(consulta);

            return resultado.content();
        } catch (Exception e) {
            log.error("Erro ao gerar sugestões", e);
            return "Erro ao gerar sugestões.";
        }
    }

    public CopilotoResponseDto analisarTempoReal(String transcricaoParcial) {
        if (transcricaoParcial == null || transcricaoParcial.trim().length() < 20) {
            return new CopilotoResponseDto(List.of(), List.of(),
                new CopilotoResponseDto.DadosExtraidos(
                    List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of()));
        }

        try {
            Result<CopilotoResponseDto> resultado = medicoAi.analisarCopilotoTempoReal(transcricaoParcial);
            return resultado.content();
        } catch (Exception e) {
            log.error("Erro no copiloto tempo real", e);
            return new CopilotoResponseDto(List.of(), List.of(),
                new CopilotoResponseDto.DadosExtraidos(
                    List.of(), List.of(), List.of(), List.of(), List.of(), List.of(), List.of()));
        }
    }

    @Transactional(readOnly = true)
    public List<ConsultaResponseDto> listarPorPaciente(Long pacienteId) {
        return consultaRepository.findByPacienteIdOrderByDataConsultaDesc(pacienteId)
                .stream()
                .map(ConsultaResponseDto::fromEntity)
                .toList();
    }
}