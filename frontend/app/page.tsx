    'use client';

    import { useState, useEffect } from 'react';
    import { useRouter } from 'next/navigation';
    import { 
    Search, Users, Calendar, ArrowRight, 
    Clock, UserPlus, FileText, Home, Database, Bell, Settings, X, Loader2, Save, User, Edit3, History
    } from 'lucide-react';

    // --- INTERFACES ---
    interface Paciente {
    id: number;
    nome: string;
    cpf: string;
    email?: string;
    telefone?: string;
    sexo?: string; 
    idade?: number; 
    ultimaConsulta?: string;
    status?: string;
    avatar?: string;
    }

    interface ConsultaHistorico {
    id: number;
    dataConsulta: string; 
    status: string; 
    }

    interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    bg: string;
    }

    interface NavItemProps {
    icon: React.ReactNode;
    active?: boolean;
    hasDot?: boolean;
    }

    // --- CONFIG ---
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    export default function HomePacientes() {
    const router = useRouter();
    const [medicoNome, setMedicoNome] = useState("Doutor");
    const [searchTerm, setSearchTerm] = useState("");
    
    // Estados de Carregamento e Dados
    const [isCheckingToken, setIsCheckingToken] = useState(true); // Novo estado para evitar "flash" de conteúdo
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(true);

    const [isHistoricoModalOpen, setIsHistoricoModalOpen] = useState(false);
    const [pacienteSelecionado, setPacienteSelecionado] = useState<Paciente | null>(null);
    const [historicoConsultas, setHistoricoConsultas] = useState<ConsultaHistorico[]>([]);
    const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
    
    // Estatísticas
    const [stats, setStats] = useState({ consultasHoje: 0, emAndamento: 0, laudosGerados: 0 });

    // Estados de Ação
    const [isStartingConsulta, setIsStartingConsulta] = useState<number | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    const [novoPaciente, setNovoPaciente] = useState({
        nome: "",
        cpf: "",
        email: "",
        telefone: "",
        sexo: "Masculino",
        dataNascimento: "" 
    });

    // --- 1. VERIFICAÇÃO DE SEGURANÇA E CARREGAMENTO ---
    useEffect(() => {
        const token = localStorage.getItem('medic_token');
        
        // Se não tem token, tchau imediato
        if (!token) {
            router.push('/login');
            return;
        }

        setIsCheckingToken(false);
        setMedicoNome(localStorage.getItem('medic_nome') || "Doutor");
        fetchPacientes(token);
        fetchEstatisticas(token);
    }, []);

    const fetchEstatisticas = async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/consultas/estatisticas`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (e) {
            console.warn("Erro ao buscar estatísticas", e);
        }
    };

    const fetchPacientes = async (token: string) => {
        try {
            const res = await fetch(`${API_URL}/pacientes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // --- AQUI ESTÁ A CORREÇÃO DE SEGURANÇA ---
            if (res.status === 403 || res.status === 401) {
                console.warn("Token expirado ou inválido. Redirecionando...");
                localStorage.removeItem('medic_token'); // Limpa o lixo
                localStorage.removeItem('medic_nome');
                localStorage.removeItem('medic_id');
                router.push('/login');
                return;
            }
            // ------------------------------------------
            
            if (res.ok) {
                const data = await res.json() as Paciente[];
                const pacientesTratados = data.map((p) => ({
                    ...p,
                    status: p.status || 'Ativo',
                    avatar: p.id ? String(p.id % 15) : "1",
                    ultimaConsulta: p.ultimaConsulta || '-',
                    sexo: p.sexo || 'Não informado',
                    idade: p.idade || 0 
                }));
                setPacientes(pacientesTratados);
            }
        } catch (e) {
            console.error("Erro ao buscar pacientes", e);
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleAbrirHistorico = async (paciente: Paciente) => {
        setPacienteSelecionado(paciente);
        setIsHistoricoModalOpen(true);
        setIsLoadingHistorico(true);
        
        try {
            const token = localStorage.getItem('medic_token');
            const res = await fetch(`${API_URL}/consultas/paciente/${paciente.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setHistoricoConsultas(data);
            }
        } catch (e) {
            console.error("Erro ao buscar histórico", e);
        } finally {
            setIsLoadingHistorico(false);
        }
    };

    // --- 2. FILTRAGEM NO FRONTEND ---
    const filteredPacientes = pacientes.filter(p => 
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpf.includes(searchTerm)
    );

    // --- 3. AÇÃO: INICIAR CONSULTA ---
    const handleIniciarConsulta = async (pacienteId: number) => {
    setIsStartingConsulta(pacienteId);
    try {
        const token = localStorage.getItem('medic_token');
        if (!token) { router.push('/login'); return; }


        const medicoId = localStorage.getItem('medic_id');

        const res = await fetch(`${API_URL}/consultas/iniciar?pacienteId=${pacienteId}&medicoId=${medicoId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

            if (res.status === 403 || res.status === 401) {
                localStorage.removeItem('medic_token');
                router.push('/login');
                return;
            }

            if (res.ok) {
                const data = await res.json();
                router.push(`/consulta/${data.id}`); 
            } else {
                alert("Erro ao iniciar consulta.");
            }

        } catch (e) {
            console.error(e);
            alert("Erro de conexão.");
        } finally {
            setIsStartingConsulta(null);
        }
    };

    // --- 4. AÇÃO: SALVAR NOVO PACIENTE ---
    const handleSalvarPaciente = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        try {
            const token = localStorage.getItem('medic_token');
            if (!token) { 
                router.push('/login'); 
                return; 
            }

            // ✅ LIMPA O CPF (remove pontos e traço)
            const cpfLimpo = novoPaciente.cpf.replace(/\D/g, '');

            const res = await fetch(`${API_URL}/pacientes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...novoPaciente,
                    cpf: cpfLimpo // ✅ envia CPF só com números
                })
            });

            if (res.status === 403 || res.status === 401) {
                localStorage.removeItem('medic_token');
                router.push('/login');
                return;
            }

            if (res.ok) {
                alert("Paciente cadastrado com sucesso!");
                setIsModalOpen(false);
                setNovoPaciente({ 
                    nome: "", 
                    cpf: "", 
                    email: "", 
                    telefone: "", 
                    sexo: "Masculino", 
                    dataNascimento: "" 
                }); 
                fetchPacientes(token); 
            } else {
                const erro = await res.text();
                alert(`Erro ao cadastrar: ${erro}`);
            }

        } catch (err) {
            console.error(err);
            alert("Erro de conexão com o servidor.");
        } finally {
            setIsSaving(false);
        }
    };

    // Se estiver checando o token, não mostra nada (ou um loader de tela cheia)
    if (isCheckingToken) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc]">
                <Loader2 className="animate-spin text-[#00c985]" size={48} />
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] font-sans text-slate-600 selection:bg-[#0fc679]/20 overflow-hidden">
        
        {/* SIDEBAR */}
        <aside className="hidden md:flex flex-col items-center gap-6 w-[72px] z-20 fixed left-6 top-10">
            <nav className="flex flex-col gap-2 w-full py-4 items-center bg-[#3ed28c] rounded-[40px] shadow-[0_8px_30px_rgba(62,210,140,0.25)]">
            <NavItem icon={<Home size={24} strokeWidth={2} />} active={true} />
            <NavItem icon={<Database size={24} strokeWidth={2} />} />
            </nav>
            <nav className="flex flex-col gap-2 w-full py-4 items-center bg-[#3ed28c] rounded-[40px] shadow-[0_8px_30px_rgba(62,210,140,0.25)]">
            <NavItem icon={<Bell size={24} strokeWidth={2} />} hasDot={true} />
            <NavItem icon={<Settings size={24} strokeWidth={2} />} />
            </nav>
        </aside>

        {/* CONTEÚDO PRINCIPAL */}
        <main className="flex-1 flex flex-col h-full relative z-10 pl-[120px] pr-8 py-8 overflow-y-auto custom-scrollbar">
            
            {/* HEADER */}
            <header className="flex justify-between items-center mb-10 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Meus Pacientes</h1>
                    <p className="text-slate-400 text-sm mt-1">Gerencie seus atendimentos e prontuários</p>
                </div>
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-[#00c985] hover:bg-[#00b074] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-emerald-200/50 transition-all transform hover:-translate-y-0.5"
                    >
                        <UserPlus size={20} /> Novo Paciente
                    </button>
                    <div className="flex items-center gap-3 pl-6 border-l border-slate-200">
                    <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold text-slate-700">Olá, {medicoNome}</p>
                            <p className="text-xs text-slate-400">Médico</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-[#00c985]/10 flex items-center justify-center text-[#00c985]">
                            <User size={20} />
                    </div>
                    </div>
                </div>
            </header>

            {/* ESTATÍSTICAS */}
            <div className="grid grid-cols-4 gap-6 mb-8 shrink-0">
                <StatCard title="Total de Pacientes" value={pacientes.length.toString()} icon={<Users className="text-blue-500"/>} bg="bg-blue-50" />
                <StatCard title="Consultas Hoje" value={stats.consultasHoje.toString()} icon={<Calendar className="text-[#00c985]"/>} bg="bg-emerald-50" />
                <StatCard title="Em Andamento" value={stats.emAndamento.toString()} icon={<Clock className="text-amber-500"/>} bg="bg-amber-50" />
                <StatCard title="Laudos Gerados" value={stats.laudosGerados.toString()} icon={<FileText className="text-purple-500"/>} bg="bg-purple-50" />
            </div>

            {/* BARRA DE BUSCA */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 mb-6 flex items-center justify-between shrink-0">
                <div className="relative flex-1 max-w-lg ml-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                    <input 
                        type="text" 
                        placeholder="Buscar por nome, CPF ou prontuário..." 
                        className="w-full bg-transparent border-none py-4 pl-12 pr-6 text-sm focus:outline-none placeholder:text-slate-400 text-slate-700"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3 mr-2">
                    <select className="bg-slate-50 border border-slate-200 text-slate-600 text-sm rounded-xl px-4 py-2.5 focus:outline-none hover:border-slate-300 cursor-pointer">
                        <option>Todos os Status</option>
                        <option>Ativos</option>
                        <option>Inativos</option>
                    </select>
                </div>
            </div>

            {/* LISTA DE PACIENTES */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex-1 flex flex-col min-h-[400px]">
                {isLoadingList ? (
                    <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                        <Loader2 className="animate-spin" /> Carregando pacientes...
                    </div>
                ) : (
                    <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                                <tr>
                                    <th className="px-8 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Paciente</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">CPF/Contato</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Última Consulta</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredPacientes.map((paciente) => (
                                    <tr key={paciente.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                {/* Avatar de Iniciais */}
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                                    {paciente.nome ? paciente.nome.substring(0,2) : "PA"}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-700 text-sm group-hover:text-[#00c985] transition-colors">{paciente.nome}</p>
                                                    <p className="text-xs text-slate-400">ID: #{String(paciente.id).padStart(4, '0')}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-sm text-slate-600 font-mono">{paciente.cpf}</p>
                                            <p className="text-xs text-slate-400">{paciente.email || paciente.telefone || "Sem contato"}</p>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-slate-500 flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-300"/>
                                            {paciente.ultimaConsulta}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${paciente.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${paciente.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                {paciente.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {/* BOTÃO EDITAR */}
                                                <button className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition" title="Editar Paciente">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleIniciarConsulta(paciente.id)}
                                                    disabled={isStartingConsulta === paciente.id}
                                                    className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-[#00c985] hover:text-[#00c985] text-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm hover:shadow-md"
                                                >
                                                    {isStartingConsulta === paciente.id ? <Loader2 size={14} className="animate-spin"/> : <>Iniciar Consulta <ArrowRight size={14}/></>}
                                                </button>
                                                <button 
                                                    onClick={() => handleAbrirHistorico(paciente)}
                                                    className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition" 
                                                    title="Ver Histórico"
                                                >
                                                    <History size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        
                        {filteredPacientes.length === 0 && (
                            <div className="p-12 text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-3 opacity-20"/>
                                <p>Nenhum paciente encontrado.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </main>

        {/* --- MODAL DE NOVO PACIENTE --- */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-lg text-slate-700">Cadastrar Novo Paciente</h3>
                        <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <form onSubmit={handleSalvarPaciente} className="p-6 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome Completo *</label>
                            <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                value={novoPaciente.nome} onChange={e => setNovoPaciente({...novoPaciente, nome: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CPF *</label>
                                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                    value={novoPaciente.cpf} onChange={e => setNovoPaciente({...novoPaciente, cpf: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Telefone</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                    value={novoPaciente.telefone} onChange={e => setNovoPaciente({...novoPaciente, telefone: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                            <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                value={novoPaciente.email} onChange={e => setNovoPaciente({...novoPaciente, email: e.target.value})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Sexo</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                    value={novoPaciente.sexo} onChange={e => setNovoPaciente({...novoPaciente, sexo: e.target.value})}>
                                    <option value="Masculino">Masculino</option>
                                    <option value="Feminino">Feminino</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data Nascimento</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-slate-700 focus:outline-none focus:border-[#00c985]"
                                    value={novoPaciente.dataNascimento} onChange={e => setNovoPaciente({...novoPaciente, dataNascimento: e.target.value})} />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-50 transition">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="flex-1 bg-[#00c985] hover:bg-[#00b074] text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition flex justify-center items-center gap-2">
                                {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Salvar Paciente</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {/* --- MODAL DE HISTÓRICO --- */}
            {isHistoricoModalOpen && pacienteSelecionado && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 scale-100 animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-700">Histórico de Consultas</h3>
                                <p className="text-sm text-slate-500">{pacienteSelecionado.nome}</p>
                            </div>
                            <button onClick={() => setIsHistoricoModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoadingHistorico ? (
                                <div className="flex justify-center items-center py-10 text-slate-400 gap-2">
                                    <Loader2 className="animate-spin" /> Carregando histórico...
                                </div>
                            ) : historicoConsultas.length === 0 ? (
                                <div className="text-center py-10 text-slate-400">
                                    <FileText size={40} className="mx-auto mb-3 opacity-20" />
                                    <p>Nenhuma consulta registrada para este paciente.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {historicoConsultas.map((consulta) => (
                                        <div key={consulta.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition">
                                            <div className="flex flex-col">
                                                {/* Ajuste a exibição da data conforme o retorno do seu DTO */}
                                                <span className="font-bold text-slate-700">Consulta #{consulta.id}</span>
                                                <span className="text-xs text-slate-400">Status: {consulta.status}</span>
                                            </div>
                                            <button
                                                onClick={() => router.push(`/consulta/${consulta.id}`)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                                    consulta.status === 'CRIADA' 
                                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                                                }`}
                                            >
                                                {consulta.status === 'CRIADA' ? 'Continuar Consulta' : 'Ver Prontuário'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
        </div>
    );
    }

    // --- SUB-COMPONENTES ---
    const NavItem = ({ icon, active, hasDot }: NavItemProps) => (
    <button className={`p-3 rounded-full transition-all duration-300 flex justify-center items-center relative w-[52px] h-[52px] 
        ${active ? 'text-[#3ed28c] bg-white shadow-md scale-105' : 'text-white hover:bg-white/20'}`}>
        <div className="relative z-10 flex items-center justify-center">
        {icon}
        {hasDot && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#42f5ce] border-2 border-[#3ed28c] rounded-full"></span>}
        </div>
    </button>
    );

    const StatCard = ({ title, value, icon, bg }: StatCardProps) => (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
            <div><p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{title}</p><p className="text-2xl font-bold text-slate-700">{value}</p></div>
        </div>
    );