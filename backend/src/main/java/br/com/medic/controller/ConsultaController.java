package br.com.medic.controller;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.medic.dto.ConsultaResponseDto;
import br.com.medic.dto.CopilotoResponseDto;
import br.com.medic.entity.Consulta;
import br.com.medic.repository.ConsultaRepository;
import br.com.medic.service.ConsultaService;
import br.com.medic.service.DeepgramService;
import br.com.medic.service.PdfService;

@RestController
@RequestMapping("/consultas")
public class ConsultaController {
    
    private static final Logger log = LoggerFactory.getLogger(ConsultaController.class);
    
    private final ConsultaService consultaService;
    private final DeepgramService deepgramService;
    private final ConsultaRepository consultaRepository;
    private final ObjectMapper objectMapper;
    private final PdfService pdfService;

    public ConsultaController(ConsultaService consultaService, DeepgramService deepgramService, ConsultaRepository consultaRepository, ObjectMapper objectMapper, PdfService pdfService) {
        this.consultaService = consultaService;
        this.deepgramService = deepgramService;
        this.consultaRepository = consultaRepository;
        this.objectMapper = objectMapper;
        this.pdfService = pdfService;
    }
    
    @PostMapping("/iniciar")
    public ResponseEntity<ConsultaResponseDto> iniciar(
            @RequestParam Long pacienteId,
            @RequestParam UUID medicoId) {
        
        log.info("[CONSULTA] Iniciando nova consulta. PacienteID: {}, MedicoID: {}", pacienteId, medicoId);
        Consulta consulta = consultaService.iniciarConsulta(pacienteId, medicoId);
        return ResponseEntity.ok(ConsultaResponseDto.fromEntity(consulta));
    }

    @PostMapping("/{id}/gerar-documento")
    public ResponseEntity<Map<String, String>> gerarDocumento(
            @PathVariable Long id, 
            @RequestBody Map<String, Object> payload) {
        
        String texto = (String) payload.get("textoTranscrito");
        String resumo = ""; 
        
        try {
             Object resumoObj = payload.get("resumoPreliminar");
             if(resumoObj != null) resumo = objectMapper.writeValueAsString(resumoObj);
        } catch (Exception e) {
             log.warn("Falha ao converter resumo preliminar");
        }

        try {
            // Chama o service. Se a trava (prontuarioGerado == true) for disparada, ele lança IllegalStateException
            return ResponseEntity.ok(consultaService.gerarDocumentoUnificado(id, texto, resumo));
        } catch (IllegalStateException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, ex.getMessage());
        }
    }
    
    // ATUALIZADO: Agora só recebe o texto final do frontend
    @PutMapping("/{id}/finalizar")
    public ResponseEntity<ConsultaResponseDto> finalizar(
            @PathVariable Long id,
            @RequestBody Map<String, String> payload) {
        
        log.info("[FINALIZACAO] Médico finalizando ConsultaID: {}", id);
        String documentoEditado = payload.get("documentoFinal");
        
        var consulta = consultaService.finalizarConsulta(id, documentoEditado);
        return ResponseEntity.ok(ConsultaResponseDto.fromEntity(consulta));
    }
    
    @GetMapping("/{id}/sugestoes")
    public ResponseEntity<String> getSugestoes(@PathVariable Long id) {
        return ResponseEntity.ok(consultaService.obterSugestoesIA(id));
    }

    @PostMapping("/sugestoes-tempo-real")
    public ResponseEntity<CopilotoResponseDto> sugestoesTempoReal(@RequestBody Map<String, String> payload) {
        String transcricao = payload.get("transcricao");
        CopilotoResponseDto resposta = consultaService.analisarTempoReal(transcricao);
        return ResponseEntity.ok(resposta);
    }

    @GetMapping("/paciente/{pacienteId}")
    public ResponseEntity<List<ConsultaResponseDto>> buscarHistoricoPaciente(@PathVariable Long pacienteId) {
        List<ConsultaResponseDto> historico = consultaService.listarPorPaciente(pacienteId);
        return ResponseEntity.ok(historico);
    }
    
    @GetMapping("/deepgram-token")
    public ResponseEntity<String> getDeepgramToken() {
        return ResponseEntity.ok(deepgramService.gerarChaveTemporaria());
    }
    
    // NOVO: Endpoint para o Auto-Save do Frontend
    @PatchMapping("/{id}/rascunho")
    public ResponseEntity<Void> salvarRascunho(
            @PathVariable Long id, 
            @RequestBody Map<String, Object> payload) {
        
        String transcricao = (String) payload.get("transcricao");
        Object resumoObj = payload.get("resumo");
        
        consultaService.atualizarRascunho(id, transcricao, resumoObj);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<ConsultaResponseDto> buscarPorId(@PathVariable Long id) {
        return consultaRepository.findById(id)
                .map(ConsultaResponseDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/download-pdf")
    public ResponseEntity<byte[]> downloadPdf(@PathVariable Long id) {
        Consulta consulta = consultaRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Consulta não encontrada"));

        if (consulta.getAnamneseFormatada() == null || consulta.getAnamneseFormatada().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Prontuário ainda não foi gerado.");
        }

        byte[] pdf = pdfService.gerarProntuarioPdf(consulta);

        String nomeArquivo = "prontuario_consulta_" + id + ".pdf";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDispositionFormData("attachment", nomeArquivo);

        return ResponseEntity.ok().headers(headers).body(pdf);
    }
}