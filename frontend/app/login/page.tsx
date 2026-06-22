'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, Lock, User, Hash, ArrowRight, Stethoscope } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [erro, setErro] = useState("");

    const [loginForm, setLoginForm] = useState({ email: "", senha: "" });
    const [cadastroForm, setCadastroForm] = useState({ nome: "", email: "", crm: "", senha: "", confirmarSenha: "" });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(loginForm)
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('medic_token', data.token);
                localStorage.setItem('medic_id', data.medicoId);
                localStorage.setItem('medic_nome', data.nome);
                router.push('/');
            } else if (res.status === 403) {
                setErro("E-mail ou senha incorretos.");
            } else {
                setErro("Erro ao fazer login. Tente novamente.");
            }
        } catch {
            setErro("Erro de conexão com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCadastro = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");

        if (cadastroForm.senha !== cadastroForm.confirmarSenha) {
            setErro("As senhas não coincidem.");
            return;
        }

        if (cadastroForm.senha.length < 6) {
            setErro("A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/medicos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nome: cadastroForm.nome,
                    email: cadastroForm.email,
                    crm: cadastroForm.crm,
                    senha: cadastroForm.senha
                })
            });

            if (res.ok || res.status === 201) {
                // Faz login automaticamente após cadastro
                const loginRes = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: cadastroForm.email, senha: cadastroForm.senha })
                });

                if (loginRes.ok) {
                    const data = await loginRes.json();
                    localStorage.setItem('medic_token', data.token);
                    localStorage.setItem('medic_id', data.medicoId);
                    localStorage.setItem('medic_nome', data.nome);
                    router.push('/');
                } else {
                    setIsLogin(true);
                    setLoginForm({ email: cadastroForm.email, senha: "" });
                    setErro("Conta criada! Faça login para continuar.");
                }
            } else {
                const texto = await res.text();
                setErro(texto || "Erro ao criar conta.");
            }
        } catch {
            setErro("Erro de conexão com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen w-full bg-[#f8fafc] font-sans">

            {/* LADO ESQUERDO — BRANDING */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] bg-gradient-to-br from-[#00c985] via-[#00b074] to-[#009960] p-12 text-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-20 -left-20 w-80 h-80 rounded-full bg-white/20" />
                    <div className="absolute bottom-20 right-10 w-60 h-60 rounded-full bg-white/10" />
                    <div className="absolute top-1/2 left-1/3 w-40 h-40 rounded-full bg-white/15" />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                            <Stethoscope size={28} />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Medic AI</h1>
                    </div>
                    <p className="text-white/70 text-sm">Assistente inteligente de documentação clínica</p>
                </div>

                <div className="relative z-10 space-y-8">
                    <div>
                        <h2 className="text-4xl font-bold leading-tight mb-4">
                            Consultas mais humanas.<br />
                            Prontuários automáticos.
                        </h2>
                        <p className="text-white/80 text-lg leading-relaxed max-w-md">
                            Grave a consulta, receba sugestões em tempo real e gere prontuários completos com inteligência artificial.
                        </p>
                    </div>

                    <div className="flex gap-6">
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex-1">
                            <p className="text-3xl font-bold">70%</p>
                            <p className="text-white/70 text-sm">menos tempo com documentação</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex-1">
                            <p className="text-3xl font-bold">IA</p>
                            <p className="text-white/70 text-sm">copiloto clínico em tempo real</p>
                        </div>
                    </div>
                </div>

                <p className="relative z-10 text-white/50 text-xs">&copy; 2024 Medic AI. Todos os direitos reservados.</p>
            </div>

            {/* LADO DIREITO — FORMULÁRIO */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">

                    {/* Logo mobile */}
                    <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                        <div className="w-10 h-10 bg-[#00c985] rounded-xl flex items-center justify-center text-white">
                            <Stethoscope size={22} />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-800">Medic AI</h1>
                    </div>

                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">
                            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
                        </h2>
                        <p className="text-slate-400 text-sm mt-1">
                            {isLogin ? "Entre com suas credenciais para acessar o sistema" : "Preencha os dados para começar a usar o Medic AI"}
                        </p>
                    </div>

                    {erro && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                            {erro}
                        </div>
                    )}

                    {isLogin ? (
                        /* FORMULÁRIO DE LOGIN */
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="email"
                                        placeholder="seu@email.com"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                        value={loginForm.email}
                                        onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="password"
                                        placeholder="Sua senha"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                        value={loginForm.senha}
                                        onChange={e => setLoginForm({...loginForm, senha: e.target.value})}
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#00c985] hover:bg-[#00b074] text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-6"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Entrar <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    ) : (
                        /* FORMULÁRIO DE CADASTRO */
                        <form onSubmit={handleCadastro} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nome completo</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Dr. João Silva"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                        value={cadastroForm.nome}
                                        onChange={e => setCadastroForm({...cadastroForm, nome: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="email"
                                            placeholder="seu@email.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                            value={cadastroForm.email}
                                            onChange={e => setCadastroForm({...cadastroForm, email: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">CRM</label>
                                    <div className="relative">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="text"
                                            placeholder="123456/SP"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                            value={cadastroForm.crm}
                                            onChange={e => setCadastroForm({...cadastroForm, crm: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="password"
                                            placeholder="Min. 6 caracteres"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                            value={cadastroForm.senha}
                                            onChange={e => setCadastroForm({...cadastroForm, senha: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmar Senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="password"
                                            placeholder="Repita a senha"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pl-11 text-slate-700 focus:outline-none focus:border-[#00c985] focus:ring-1 focus:ring-[#00c985]/20 transition"
                                            value={cadastroForm.confirmarSenha}
                                            onChange={e => setCadastroForm({...cadastroForm, confirmarSenha: e.target.value})}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-[#00c985] hover:bg-[#00b074] text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200/50 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 mt-6"
                            >
                                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <>Criar Conta <ArrowRight size={18} /></>}
                            </button>
                        </form>
                    )}

                    {/* TOGGLE LOGIN / CADASTRO */}
                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            {isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setErro(""); }}
                                className="text-[#00c985] font-bold ml-1 hover:text-[#00b074] transition"
                            >
                                {isLogin ? "Criar conta" : "Fazer login"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
