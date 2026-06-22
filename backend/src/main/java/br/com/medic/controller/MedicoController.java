package br.com.medic.controller;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import br.com.medic.dto.DadosCadastroMedicoDto;
import br.com.medic.entity.Medico;
import br.com.medic.repository.MedicoRepository;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/medicos")
public class MedicoController {

    @Autowired
    private MedicoRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder; // Injetamos o codificador

    @PostMapping
    @Transactional
    public ResponseEntity cadastrar(@RequestBody @Valid DadosCadastroMedicoDto dados, UriComponentsBuilder uriBuilder) {
    	
    	if (repository.findByEmail(dados.email()) != null) {
            return ResponseEntity.badRequest().body("Este email já está cadastrado.");
        }
    	
        var medico = new Medico();
        medico.setNome(dados.nome());
        medico.setEmail(dados.email());
        medico.setCrm(dados.crm());
        
        // AQUI ESTÁ O SEGREDO: Criptografamos a senha antes de salvar
        String senhaCriptografada = passwordEncoder.encode(dados.senha());
        medico.setSenha(senhaCriptografada);

        repository.save(medico);

        var uri = uriBuilder.path("/medicos/{id}").buildAndExpand(medico.getId()).toUri();

        return ResponseEntity.created(uri).build();
    }
}
