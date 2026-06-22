package br.com.medic.service;

import br.com.medic.entity.Consulta;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import org.xhtmlrenderer.pdf.ITextRenderer;
import com.lowagie.text.DocumentException;

import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
public class PdfService {

    private final TemplateEngine templateEngine;

    public PdfService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    public byte[] gerarProntuarioPdf(Consulta consulta) {
        Context context = new Context();

        var paciente = consulta.getPaciente();
        var medico = consulta.getMedico();

        context.setVariable("pacienteNome", paciente.getNome());
        context.setVariable("pacienteCpf", paciente.getCpf());
        context.setVariable("pacienteIdade", paciente.getIdade() != null ? paciente.getIdade().toString() : "N/A");
        context.setVariable("medicoNome", medico.getNome());
        context.setVariable("medicoCrm", medico.getCrm() != null ? medico.getCrm() : "N/A");
        context.setVariable("dataConsulta", consulta.getDataConsulta().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")));
        context.setVariable("documento", consulta.getAnamneseFormatada() != null ? consulta.getAnamneseFormatada() : "Prontuário não gerado.");

        String html = templateEngine.process("prontuario", context);

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            ITextRenderer renderer = new ITextRenderer();
            renderer.setDocumentFromString(html);
            renderer.layout();
            renderer.createPDF(baos);
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF do prontuário", e);
        }
    }
}
