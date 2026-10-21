/* =====================================================================
   PORTFY · js/models/constants.js
   Camada: Model
   Catálogos fixos: menu, planos, modelos, fontes e cores
   ===================================================================== */

/* Menu lateral: [id da página, texto, nome do ícone no sprite do index.html] */
const NAV = [
  ['dash', 'Início', 'home'], ['proj', 'Projetos', 'folder'], ['mod', 'Modelos', 'layout'], ['por', 'Meus arquivos', 'briefcase'],
  ['notas', 'Notas', 'note'], ['cal', 'Calendário', 'calendar'], ['age', 'Agenda', 'clock'],
  ['ia', 'Agente de IA', 'sparkles'],
  ['plan', 'Planos', 'star'], ['perf', 'Perfil', 'user'], ['cfg', 'Configurações', 'settings'],
];

/* Como o menu é agrupado na tela (títulos pequenos entre os grupos) */
const NAV_GROUPS = [['Geral', ['dash', 'proj', 'mod', 'por']], ['Organização', ['notas', 'cal', 'age']], ['Inteligência', ['ia']], ['Conta', ['plan', 'perf', 'cfg']]];

const PL={A:['Gratuito','R$ 0',['Modelos gratuitos','Agenda e tarefas','Notas e projetos']],B:['Pro','R$ 29',['Tudo do plano Gratuito','Modelos Pro','Agente de IA ampliado']],C:['Premium','R$ 59',['Tudo do plano Pro','Suporte prioritário','Exportação sem marca']]};

const MODS=[['Currículo Profissional','Limpo e objetivo para o mercado tradicional','curriculo','Gratuito'],['Portfólio Criativo','Destaque seus projetos com visual impactante','portfolio','Gratuito'],['Perfil LinkedIn','Otimize seu perfil para recrutadores','linkedin','Gratuito'],['Case de Projeto','Documente um projeto de ponta a ponta','projeto','Pro'],['Currículo Moderno','Design contemporâneo para áreas criativas','curriculo','Pro'],['Portfólio Tech','Ideal para desenvolvedores e engenheiros','portfolio','Pro']];

const COV=['linear-gradient(135deg,#2F5BEA,#0A1A3F)','linear-gradient(135deg,#6C93FF,#2F5BEA)','linear-gradient(135deg,#0A1A3F,#355f94)'];

const ACC = {'Currículo Profissional':'#0A1A3F','Portfólio Criativo':'#2F5BEA','Perfil LinkedIn':'#1F44C9','Case de Projeto':'#0A1A3F','Currículo Moderno':'#3A5BD9','Portfólio Tech':'#101B3D'};

const KIND = {curriculo:'curriculo', portfolio:'portfolio', linkedin:'portfolio', projeto:'projeto'};

const KIND_LABEL = {curriculo:'Currículo', portfolio:'Portfólio', projeto:'Projeto'};

const FONTS = ['Inter', 'Bricolage Grotesque', 'Georgia', 'Courier New'];

/* Textos das janelas de informação do rodapé (index.html chama info('chave')) */
const INFO = {
  termos: ['Termos de uso', '<p>O Portfy é um projeto acadêmico criado para fins de aprendizado. Ao usar o site você concorda em informar dados verdadeiros e em não tentar acessar contas de outras pessoas.</p><h4>Planos e pagamentos</h4><p>Os planos Pro e Premium são uma simulação. Nenhuma cobrança real é feita e nenhum dado de cartão é solicitado.</p><h4>Disponibilidade</h4><p>Por ser um projeto de estudo, o serviço pode ficar indisponível ou ser reiniciado sem aviso.</p>'],
  privacidade: ['Política de privacidade', '<p>Guardamos apenas o necessário para o site funcionar: nome, e-mail, o conteúdo que você cria (arquivos, tarefas, notas, projetos) e as conversas com o Agente de IA.</p><h4>Como usamos</h4><p>Seus dados aparecem somente para você. Nenhum dado é vendido ou compartilhado com terceiros para publicidade.</p><h4>Agente de IA</h4><p>Ao conversar, sua mensagem e um resumo do seu perfil (profissão, fase acadêmica, mercado de interesse) são enviados ao modelo de IA para gerar a resposta.</p><h4>Exclusão</h4><p>Você pode apagar conversas, arquivos e itens a qualquer momento dentro do aplicativo.</p>'],
  seguranca: ['Segurança dos dados', '<p>O acesso usa autenticação por e-mail e senha (Supabase Auth). A senha precisa de 8 caracteres, uma letra maiúscula e um número.</p><h4>Isolamento por conta</h4><p>O banco de dados aplica RLS (Row Level Security): cada consulta só enxerga as linhas do usuário logado.</p><h4>Chaves</h4><p>A chave da IA e a chave de servidor ficam apenas no servidor (Edge Functions). No navegador há somente a chave pública do projeto.</p>'],
  tecnologias: ['Tecnologias', '<p><b>Front-end:</b> HTML, CSS e JavaScript puro, organizado em MVC (models, views e controllers).</p><p><b>Back-end:</b> Supabase, com Auth (login), Postgres com RLS (dados), Storage (imagens) e Edge Functions em Deno (IA e lembretes).</p><p><b>Inteligência artificial:</b> modelo Gemini, chamado somente pelo servidor.</p>'],
  arquitetura: ['Arquitetura MVC', '<p><b>Model</b> (js/models): estado, catálogos e regras dos arquivos e das conversas.</p><p><b>View</b> (index.html, css e js/views): tudo o que aparece na tela.</p><p><b>Controller</b> (js/controllers): reage aos cliques e conversa com os serviços.</p><p><b>Services</b> (js/services): acesso ao Supabase e ao armazenamento local.</p>'],
  ceub: ['Projeto Integrador · CEUB', '<p>O Portfy foi desenvolvido como Projeto Integrador no Centro Universitário de Brasília (CEUB), em 2026.</p><p>O objetivo é reunir, em uma aplicação completa, front-end, banco de dados, segurança e inteligência artificial.</p>'],
  status: ['Status do sistema', '<p id="status-detail">Verificando a conexão com o banco de dados…</p>'],
};
