package br.com.medic.service.ai;

import br.com.medic.dto.CopilotoResponseDto;
import br.com.medic.dto.ProntuarioGeradoDto;
import dev.langchain4j.service.Result;
import dev.langchain4j.service.SystemMessage;
import dev.langchain4j.service.UserMessage;
import dev.langchain4j.service.V;


public interface MedicoAssistenteAi {

	@SystemMessage("""
	        Você é um copiloto médico em tempo real. Analise a transcrição parcial de uma consulta médica em andamento.

	        Sua tarefa é retornar um JSON com EXATAMENTE esta estrutura:

	        1. **perguntasSugeridas**: Liste 2-4 perguntas que o médico deveria fazer ao paciente para complementar a anamnese.
	           Foque em perguntas que ainda NÃO foram respondidas na transcrição.
	        2. **hipotesesDiagnosticas**: Liste 1-3 hipóteses diagnósticas baseadas nos dados disponíveis até agora.
	           Inclua o grau de probabilidade (ex: "Pneumonia bacteriana (provável)").
	        3. **dadosExtraidos**: Extraia dados estruturados da transcrição nos campos:
	           - queixaPrincipal: lista de queixas principais mencionadas
	           - hda: lista de pontos da história da doença atual
	           - sintomasAssociados: lista de sintomas mencionados
	           - antecedentesPessoais: lista de antecedentes pessoais mencionados
	           - antecedentesFamiliares: lista de antecedentes familiares mencionados
	           - medicamentosEmUso: lista de medicamentos citados
	           - alergias: lista de alergias mencionadas

	        Se um campo não foi mencionado na transcrição, retorne lista vazia [].
	        Seja conciso e direto. Responda APENAS com o JSON estruturado.
	    """)
	Result<CopilotoResponseDto> analisarCopilotoTempoReal(@UserMessage String transcricaoParcial);

	@SystemMessage("""
	        Você é um médico auditor. Ouça a transcrição e gere um PRONTUÁRIO COMPLETO.
	        
	        DIRETRIZES DE PREENCHIMENTO:
	        1. **resumoProntuario**: Um parágrafo curto (3 linhas) sintetizando o caso para leitura rápida.
	        2. **revisaoSistemas**: Liste apenas sintomas positivos (que o paciente sente) por sistema (Cardio, Resp, Digest, etc).
	        3. **impressaoDiagnostica**: Liste as hipóteses com base técnica.
	        4. **conduta**: Liste medicamentos prescritos e orientações.
	        
	        Se uma informação não foi citada, retorne "Não relatado".
	        Mantenha tom formal e técnico.
	    """)
	    Result<ProntuarioGeradoDto> analisarConsulta(@UserMessage String transcricaoBruta);
	
	@SystemMessage("""
	        Você é um médico consultor sênior. Baseado nos dados estruturados do paciente:
	        1. Sugira 3 Hipóteses Diagnósticas prováveis.
	        2. Sugira exames complementares pertinentes para confirmar/descartar.
	        3. Cite diretrizes ou protocolos clínicos conhecidos (SBC, AMB, ADA, etc) que embasam sua sugestão.
	        
	        Use formato Markdown (listas com bullet points) para fácil leitura.
	        Seja direto e técnico.
	    """)
	Result<String> gerarSugestoesClinicas(@UserMessage String jsonDadosAtuais);

	@SystemMessage("""
	        Você é um assistente de documentação médica.
	        Sua tarefa é redigir o **corpo clínico** do prontuário com base nas entradas fornecidas pelo usuário.
	        
	        SAÍDA ESPERADA:
	        Gere um texto formatado, profissional e pronto para edição (estilo documento Word), seguindo ESTRITAMENTE esta estrutura:
	        
	        Queixa Principal:
	        [Texto aqui]
	        
	        Resumo do Prontuário:
	        [Texto aqui]
	        
	        HDA (História da Doença Atual):
	        [Texto narrativo cronológico aqui]
	        
	        Revisão de Sintomas:
	        [Texto aqui]
	        
	        Antecedentes Pessoais:
	        [Texto aqui]
	        
	        Antecedentes Familiares:
	        [Texto aqui]
	        
	        Medicamentos em Uso:
	        [Lista aqui]
	        
	        Alergias:
	        [Lista ou 'Nega']
	        
	        Hábitos de Vida:
	        [Texto aqui]
	        
	        Exame Físico:
	        [Descrição objetiva aqui]
	        
	        Exames Complementares:
	        [Texto aqui]
	        
	        Impressão Diagnóstica:
	        [Texto aqui]
	        
	        Conduta:
	        [Plano terapêutico detalhado aqui]
	        
	        REGRAS:
	        - Não inclua cabeçalho de paciente (nome, idade), pois o sistema adicionará isso.
	        - Use quebras de linha para separar bem as seções.
	        - Se algo não foi citado, escreva "Não relatado".
	    """)
	    @UserMessage("""
	        Por favor, gere o prontuário com base nestas informações:

	        1. TRANSCRICAO (Conversa bruta):
	        {{transcricao}}

	        2. RESUMO PRELIMINAR (Tópicos capturados):
	        {{resumo}}
	    """)
	    Result<String> redigirProntuarioTexto(
	        @V("transcricao") String transcricao, 
	        @V("resumo") String resumoPreliminar
	    );
}