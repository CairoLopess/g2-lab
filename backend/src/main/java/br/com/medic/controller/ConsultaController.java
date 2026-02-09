package br.com.medic.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.com.medic.dto.ConsultaResponseDto;
import br.com.medic.dto.ProntuarioEdicaoDto;
import br.com.medic.entity.Consulta;
import br.com.medic.service.ConsultaService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/consultas")
@RequiredArgsConstructor
public class ConsultaController {

    private final ConsultaService consultaService;
    
    public ConsultaController(ConsultaService consultaService) {
    	
    	this.consultaService = consultaService;
    }
    
    // Endpoint 1: Iniciar
    @PostMapping("/iniciar")
    public ResponseEntity<ConsultaResponseDto> iniciar(
            @RequestParam Long pacienteId,
            @RequestParam UUID medicoId) {
        
        // 1. Chama o serviço que retorna a Entidade
        Consulta consulta = consultaService.iniciarConsulta(pacienteId, medicoId);
        
        // 2. Converte para DTO antes de devolver
        return ResponseEntity.ok(ConsultaResponseDto.fromEntity(consulta));
    }

    // Endpoint 2: Upload e Processamento
    @PostMapping("/{id}/upload")
    public ResponseEntity<ConsultaResponseDto> uploadAudio(
            @PathVariable Long id,
            @RequestParam("audio") MultipartFile arquivo) {
        
        try {
            // 1. Chama o serviço
            Consulta consulta = consultaService.processarAudio(id, arquivo);
            
            // 2. Converte para DTO
            return ResponseEntity.ok(ConsultaResponseDto.fromEntity(consulta));
            
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }
    
    
    // Passo 3: Médico revisa e finaliza
    @PutMapping("/{id}/finalizar")
    public ResponseEntity<ConsultaResponseDto> finalizar(
            @PathVariable Long id,
            @RequestBody ProntuarioEdicaoDto dados) {
        
        var consulta = consultaService.finalizarConsulta(id, dados);
        return ResponseEntity.ok(ConsultaResponseDto.fromEntity(consulta));
    }
    
    @GetMapping("/{id}/sugestoes")
    public ResponseEntity<String> getSugestoes(@PathVariable Long id) {
        // Retorna texto puro (Markdown)
        return ResponseEntity.ok(consultaService.obterSugestoesIA(id)); 
    }

    // Endpoint para gerar o documento final
    // GET /consultas/{id}/imprimir
    @GetMapping("/{id}/imprimir")
    public ResponseEntity<String> getDocumentoImpressao(@PathVariable Long id) {
        return ResponseEntity.ok(consultaService.gerarDocumentoImpressao(id));
    }
}