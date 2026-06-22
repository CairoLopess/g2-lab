package br.com.medic.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import br.com.medic.repository.MedicoRepository;

@Service
public class AutenticacaoService implements UserDetailsService {

	
	private static final Logger log = LoggerFactory.getLogger(AutenticacaoService.class);
	
    @Autowired
    private MedicoRepository repository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        
        // Log de entrada (DEBUG ou INFO)
        log.info("[AUTH] Buscando usuário no banco de dados: {}", username);
        
        var usuario = repository.findByEmail(username);

        // Verificação defensiva (Spring Security exige que lance exceção se for null)
        if (usuario == null) {
            log.warn("[AUTH] Falha no login: Usuário '{}' não encontrado.", username);
            throw new UsernameNotFoundException("Dados inválidos ou usuário inexistente.");
        }

        // Log de sucesso
        log.info("[AUTH] Usuário encontrado com sucesso: {}", username);

        return usuario;
    }
}