/* =====================================================================
   PORTFY · js/models/templates.model.js
   Camada: Model
   Catálogo de modelos (MODELS) e os "construtores" de layout de cada um.
   Cada modelo é uma função que recebe a paleta (P), o par de fontes (F) e
   os textos (c) e devolve { w, h, bg, els } no formato do editor.
   Para criar um modelo novo: escreva um construtor em LAYOUTS e adicione uma
   linha em MODELS (veja docs/COMO-EDITAR.md).
   ===================================================================== */

/* ---------- Cores ---------- */
const rgb = (h) => { h = String(h).replace('#', ''); if (h.length === 3) h = [...h].map((x) => x + x).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (c) => { const [r, g, b] = rgb(c); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/** Paleta completa a partir de uma cor de destaque. */
function palette(a) {
  const dk = lum(a) < 0.62;
  return {
    a, dark: mix(a, '#000000', 0.42), mid: mix(a, '#ffffff', 0.72), soft: mix(a, '#ffffff', 0.92),
    on: dk ? '#ffffff' : '#0A1430', onMut: dk ? mix(a, '#ffffff', 0.78) : mix(a, '#000000', 0.45),
    ink: '#0F172A', mut: '#475569', line: '#DCE3F2', night: '#0B1020',
  };
}

/* ---------- Cores e fontes que a pessoa pode escolher ao usar um modelo ---------- */
const PALETTES = [['Azul', '#2F5BEA'], ['Marinho', '#0A1A3F'], ['Verde-água', '#0E9F8E'], ['Roxo', '#6D4AFF'], ['Vinho', '#9B1C4B'], ['Laranja', '#E8590C'], ['Grafite', '#1F2937'], ['Esmeralda', '#0F8B5F']];
const FONT_PAIRS = {
  moderna: ['Moderna', 'Bricolage Grotesque', 'Inter'],
  classica: ['Clássica', 'Playfair Display', 'Lora'],
  tech: ['Tecnológica', 'Space Grotesk', 'DM Sans'],
  limpa: ['Limpa', 'Poppins', 'Inter'],
  editorial: ['Editorial', 'Oswald', 'Roboto Slab'],
};

/* ---------- Textos: marcadores ou dados do perfil ---------- */
function tplContent(o = {}) {
  const fill = !!o.fill, prof = (fill && typeof D !== 'undefined' && D && D.prof) || {};
  const who = (typeof me !== 'undefined' && me) || null;
  const name = o.name || ((fill || o.nameOnly) && who && who.name) || 'Seu Nome';
  const parts = fill ? [who && who.email, prof.phone, prof.loc, prof.link].filter(Boolean) : [];
  const skills = fill && (prof.skills || []).length ? prof.skills : null;
  return {
    name, role: (fill && prof.role) || 'Sua profissão',
    contact: parts.length ? parts.join(' · ') : 'email@exemplo.com · (61) 90000-0000 · linkedin.com/in/voce',
    email: (fill && who && who.email) || 'email@exemplo.com', phone: (fill && prof.phone) || '(61) 90000-0000',
    loc: (fill && prof.loc) || 'Brasília, DF', link: (fill && (prof.link || prof.li)) || 'seusite.com.br',
    bio: (fill && prof.bio) || '', skills, skillsLine: skills ? skills.join(' · ') : 'Figma · React · Python · Comunicação',
    heading: o.heading, sub: o.sub, first: String(name).split(' ')[0],
  };
}

/* Tamanho de fonte que faz um texto curto caber na largura (evita nomes longos quebrando por cima de outros textos) */
const fitFs = (txt, w, fs, min) => Math.max(min || Math.round(fs * 0.5), Math.min(fs, Math.floor(w / (Math.max(1, String(txt).length) * 0.56))));

/* ---------- Ferramenta de desenho dos construtores ---------- */
function canvas(w, h, bg, P, F) {
  const els = [];
  const api = {
    P, F, w, h,
    /** texto: o.ff = 'h' (fonte de título) ou 'b' (fonte de texto, padrão) */
    T(x, y, tw, th, txt, fs, color, o = {}) {
      const e = { k: 'text', x, y, w: tw, h: th, txt, fs, color, fw: o.fw ?? 400, ta: o.ta || 'left', ff: o.ff === 'h' ? F[0] : o.ff && o.ff !== 'b' ? o.ff : F[1] };
      if (o.lh) e.lh = o.lh; if (o.ls) e.ls = o.ls; if (o.up) e.up = true; if (o.it) e.it = true; if (o.bg) e.bg = o.bg;
      els.push(e); return e;
    },
    R(x, y, rw, rh, c, r = 0, o = {}) { const e = { k: 'rect', x, y, w: rw, h: rh, bg: c, r }; if (o.bd) { e.bd = o.bd; e.bdc = o.bdc; } if (o.op) e.op = o.op; if (o.name) e.name = o.name; els.push(e); return e; },
    E(x, y, ew, eh, c, o = {}) { const e = { k: 'ellipse', x, y, w: ew, h: eh, bg: c }; if (o.op) e.op = o.op; if (o.name) e.name = o.name; els.push(e); return e; },
    S(kind, x, y, sw, sh, c, o = {}) { const e = { k: kind, x, y, w: sw, h: sh, bg: c }; if (o.op) e.op = o.op; els.push(e); return e; },
    done: () => ({ w, h, bg, els: els.map((e, i) => ({ id: i + 1, ...e })) }),
  };
  return api;
}

/* Cabeçalho de seção em currículos: título em caixa alta + linha */
const secHead = (d, x, y, w, t, color) => { d.T(x, y, w, 24, t.toUpperCase(), 14, color || d.P.a, { fw: 700, ls: 1.2, ff: 'h' }); d.R(x, y + 28, w, 2, d.P.line); };

/* ===================== CONSTRUTORES ===================== */
const LAYOUTS = {};

/* ---- Currículos (A4: 794 x 1123) ---- */
LAYOUTS.cvProfissional = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(0, 0, 794, 190, P.a, 0, { name: 'Cabeçalho' });
  d.T(48, 40, 700, 70, c.name, fitFs(c.name, 700, 40, 26), P.on, { fw: 700, ff: 'h' });
  d.T(48, 112, 700, 28, c.role, 19, P.onMut);
  d.T(48, 150, 700, 24, c.contact, 13, P.onMut);
  [['Resumo', c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já fez e o que busca.', 230, 90], ['Experiência', 'Empresa · Cargo · 2024 – atual\nDescreva resultados com números.\n\nEmpresa · Cargo · 2022 – 2024\nO que você entregou e como medir o impacto.', 360, 160], ['Educação', 'Instituição · Curso · 2022 – 2026', 590, 40], ['Habilidades', c.skillsLine, 700, 40], ['Projetos', 'Nome do projeto: o problema, o que você fez e o resultado.', 820, 80]].forEach(([t, b, y, h]) => {
    secHead(d, 48, y, 698, t);
    d.T(48, y + 44, 698, h, b, 14, '#33415f', { lh: 1.45 });
  });
  return d.done();
};

LAYOUTS.cvModerno = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(0, 0, 262, 1123, P.a, 0, { name: 'Barra lateral' });
  d.E(66, 54, 130, 130, P.mid, { name: 'Foto' });
  d.T(66, 96, 130, 50, String(c.name).split(' ').filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase(), 44, P.dark, { fw: 700, ta: 'center', ff: 'h' });
  d.T(30, 210, 202, 90, c.name, fitFs(c.name, 202, 28, 20), P.on, { fw: 700, ff: 'h', lh: 1.15 });
  d.T(30, 302, 202, 44, c.role, 15, P.onMut, { lh: 1.3 });
  d.R(30, 360, 48, 3, P.on, 0, { op: 55 });
  d.T(30, 384, 202, 20, 'CONTATO', 12, P.on, { fw: 700, ls: 1.4 });
  d.T(30, 412, 202, 130, [c.email, c.phone, c.loc, c.link].join('\n'), 12.5, P.onMut, { lh: 1.7 });
  d.T(30, 570, 202, 20, 'HABILIDADES', 12, P.on, { fw: 700, ls: 1.4 });
  d.T(30, 598, 202, 190, (c.skills || ['Figma', 'React', 'Python', 'Comunicação', 'Liderança']).join('\n'), 13, P.onMut, { lh: 1.8 });
  d.T(30, 820, 202, 20, 'IDIOMAS', 12, P.on, { fw: 700, ls: 1.4 });
  d.T(30, 848, 202, 80, 'Português · nativo\nInglês · intermediário', 13, P.onMut, { lh: 1.8 });
  const X = 298, W = 450;
  [['Perfil', c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já fez e o que busca.', 60, 100], ['Experiência', 'Empresa · Cargo\n2024 – atual\nDescreva resultados com números.\n\nEmpresa · Cargo\n2022 – 2024\nO que você entregou e o impacto gerado.', 205, 220], ['Formação', 'Instituição · Curso\n2022 – 2026', 480, 70], ['Projetos', 'Nome do projeto\nO problema, o que você fez e o resultado.', 620, 90]].forEach(([t, b, y, h]) => {
    d.T(X, y, W, 26, t, 20, P.a, { fw: 700, ff: 'h' });
    d.R(X, y + 32, 36, 3, P.a);
    d.T(X, y + 48, W, h, b, 14, '#33415f', { lh: 1.5 });
  });
  return d.done();
};

LAYOUTS.cvMinimal = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.T(56, 56, 680, 70, c.name, fitFs(c.name, 680, 52, 30), P.ink, { fw: 700, ff: 'h' });
  d.T(56, 130, 680, 26, c.role.toUpperCase(), 14, P.a, { fw: 600, ls: 2.2 });
  d.R(56, 176, 682, 2, P.ink);
  d.T(56, 190, 682, 24, c.contact, 12.5, P.mut);
  [['Perfil', c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já fez e o que busca.', 250, 80], ['Experiência', 'Empresa · Cargo\n2024 – atual\nDescreva resultados com números.\n\nEmpresa · Cargo\n2022 – 2024\nO que você entregou e o impacto gerado.', 360, 200], ['Formação', 'Instituição · Curso\n2022 – 2026', 620, 60], ['Habilidades', c.skillsLine, 720, 40], ['Projetos', 'Nome do projeto\nO problema, o que você fez e o resultado.', 800, 80]].forEach(([t, b, y, h]) => {
    d.R(56, y, 682, 1, P.line);
    d.T(56, y + 22, 150, 22, t.toUpperCase(), 12, P.a, { fw: 700, ls: 1.6 });
    d.T(228, y + 20, 510, h, b, 14, '#33415f', { lh: 1.5 });
  });
  return d.done();
};

LAYOUTS.cvExecutivo = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.T(48, 48, 698, 64, c.name, fitFs(c.name, 698, 42, 28), P.ink, { fw: 700, ta: 'center', ff: 'h' });
  d.T(48, 116, 698, 28, c.role, 18, P.a, { ta: 'center', it: true });
  d.T(48, 152, 698, 22, c.contact, 12.5, P.mut, { ta: 'center' });
  d.R(48, 188, 698, 3, P.a); d.R(48, 196, 698, 1, P.a);
  const sec = (t, y) => { d.T(48, y, 698, 24, t.toUpperCase(), 14, P.ink, { fw: 700, ls: 3, ta: 'center', ff: 'h' }); d.R(48, y + 30, 698, 1, P.line); };
  sec('Perfil profissional', 224); d.T(48, 268, 698, 84, c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já fez e o que busca.', 14, '#33415f', { ta: 'center', lh: 1.55 });
  sec('Experiência', 380);
  [[430, 'Empresa · Cargo', '2024 – atual'], [560, 'Empresa · Cargo', '2022 – 2024']].forEach(([y, t, dt]) => {
    d.T(48, y, 500, 24, t, 16, P.ink, { fw: 700, ff: 'h' }); d.T(548, y + 2, 198, 22, dt, 13, P.mut, { ta: 'right', it: true });
    d.T(48, y + 30, 698, 80, 'Descreva responsabilidades e resultados com números.\nDestaque conquistas e liderança.', 14, '#33415f', { lh: 1.5 });
  });
  sec('Formação', 700); d.T(48, 744, 500, 24, 'Instituição · Curso', 16, P.ink, { fw: 700, ff: 'h' }); d.T(548, 746, 198, 22, '2018 – 2022', 13, P.mut, { ta: 'right', it: true });
  sec('Competências', 810); d.T(48, 854, 698, 60, c.skillsLine, 14, '#33415f', { ta: 'center', lh: 1.6 });
  sec('Idiomas e certificações', 930); d.T(48, 974, 698, 60, 'Português · nativo   |   Inglês · avançado\nCertificação ou curso relevante', 14, '#33415f', { ta: 'center', lh: 1.6 });
  return d.done();
};

LAYOUTS.cvCriativo = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.E(520, -150, 420, 420, P.mid, { name: 'Círculo grande' });
  d.E(640, 40, 130, 130, P.a, { name: 'Círculo' });
  d.R(0, 0, 18, 1123, P.a, 0, { name: 'Faixa lateral' });
  d.T(56, 64, 520, 130, c.name, fitFs(c.name, 520, 56, 32), P.ink, { fw: 800, ff: 'h', lh: 1.05 });
  d.T(56, 206, 520, 30, c.role, 20, P.a, { fw: 600 });
  d.T(56, 248, 640, 22, c.contact, 12.5, P.mut);
  const chip = (t, y) => { d.R(56, y, 170, 34, P.a, 17); d.T(56, y + 6, 170, 24, t, 14, P.on, { fw: 700, ta: 'center', ff: 'h' }); };
  chip('Sobre mim', 320); d.T(56, 368, 682, 90, c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já fez e o que busca.', 14.5, '#33415f', { lh: 1.55 });
  chip('Experiência', 490); d.T(56, 538, 682, 190, 'Empresa · Cargo · 2024 – atual\nDescreva resultados com números.\n\nEmpresa · Cargo · 2022 – 2024\nO que você entregou e o impacto gerado.', 14.5, '#33415f', { lh: 1.55 });
  chip('Formação', 750); d.T(56, 798, 682, 50, 'Instituição · Curso · 2022 – 2026', 14.5, '#33415f');
  chip('Habilidades', 870);
  (c.skills || ['Figma', 'React', 'Python', 'UX', 'Gestão']).slice(0, 6).forEach((s, i) => { const x = 56 + (i % 3) * 232, y = 922 + Math.floor(i / 3) * 52; d.R(x, y, 216, 38, P.soft, 19, { bd: 1, bdc: P.mid }); d.T(x, y + 8, 216, 24, s, 14, P.dark, { fw: 600, ta: 'center' }); });
  d.T(56, 1050, 682, 24, 'Portfólio: ' + c.link, 13, P.a, { fw: 600 });
  return d.done();
};

LAYOUTS.cvEstagio = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(48, 56, 8, 110, P.a, 4, { name: 'Detalhe' });
  d.T(74, 52, 670, 64, c.name, fitFs(c.name, 670, 40, 26), P.ink, { fw: 700, ff: 'h' });
  d.T(74, 116, 670, 26, c.role === 'Sua profissão' ? 'Estudante de [curso] · Busco estágio em [área]' : c.role, 17, P.a, { fw: 600 });
  d.T(74, 148, 670, 22, c.contact, 12.5, P.mut);
  d.R(48, 200, 698, 110, P.soft, 14, { name: 'Objetivo' });
  d.T(70, 214, 654, 22, 'OBJETIVO', 12, P.a, { fw: 700, ls: 1.6 });
  d.T(70, 240, 654, 60, c.bio || 'Conquistar uma vaga de estágio para aplicar o que aprendo na faculdade, contribuir com a equipe e crescer profissionalmente.', 14, '#33415f', { lh: 1.5 });
  [['Formação acadêmica', 'Instituição · Curso\nPrevisão de conclusão: 2027', 340, 70], ['Cursos e certificados', 'Nome do curso · Instituição · Carga horária\nNome do curso · Instituição · Carga horária', 470, 70], ['Experiências e projetos', 'Projeto acadêmico, voluntariado ou trabalho\nO que você fez e o que aprendeu.', 600, 90], ['Habilidades', c.skillsLine, 750, 40], ['Idiomas', 'Português · nativo\nInglês · básico', 850, 60]].forEach(([t, b, y, h]) => { secHead(d, 48, y, 698, t); d.T(48, y + 44, 698, h, b, 14, '#33415f', { lh: 1.5 }); });
  return d.done();
};

LAYOUTS.cvTech = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(0, 0, 794, 200, P.night, 0, { name: 'Cabeçalho' });
  d.R(48, 168, 90, 4, P.a);
  d.T(48, 40, 698, 66, c.name, fitFs(c.name, 698, 42, 28), '#ffffff', { fw: 700, ff: 'h' });
  d.T(48, 108, 698, 28, '> ' + (c.role === 'Sua profissão' ? 'Desenvolvedor(a) de software' : c.role), 18, mix(P.a, '#ffffff', 0.55), { ff: F[0] });
  d.T(48, 140, 698, 22, c.contact, 12.5, '#9AA7C7');
  const sec = (t, y) => { d.R(48, y + 2, 10, 20, P.a, 3); d.T(68, y, 400, 24, t, 17, P.ink, { fw: 700, ff: 'h' }); };
  sec('Resumo', 232); d.T(48, 266, 698, 70, c.bio || 'Escreva 2 ou 3 linhas sobre quem você é, o que já construiu e o que busca.', 14, '#33415f', { lh: 1.5 });
  sec('Stack', 358);
  (c.skills || ['JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'Git', 'Docker', 'AWS']).slice(0, 12).forEach((s, i) => { const col = i % 4, row = Math.floor(i / 4), x = 48 + col * 176, y = 398 + row * 46; d.R(x, y, 162, 34, P.soft, 8, { bd: 1, bdc: P.mid }); d.T(x, y + 7, 162, 22, s, 13, P.dark, { fw: 600, ta: 'center' }); });
  sec('Experiência', 560); d.T(48, 598, 698, 200, 'Empresa · Cargo · 2024 – atual\n• O que você construiu e a tecnologia usada\n• Resultado com número (ex.: reduziu o tempo em 40%)\n\nEmpresa · Cargo · 2022 – 2024\n• Responsabilidade principal\n• Resultado mensurável', 14, '#33415f', { lh: 1.55 });
  sec('Projetos', 830); d.T(48, 868, 698, 110, 'nome-do-projeto  ·  github.com/voce/projeto\n• Problema que resolve e stack utilizada\n• Link para demonstração', 14, '#33415f', { lh: 1.55 });
  sec('Formação', 990); d.T(48, 1026, 698, 40, 'Instituição · Curso · 2022 – 2026', 14, '#33415f');
  return d.done();
};

LAYOUTS.carta = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(0, 0, 794, 14, P.a);
  d.T(72, 64, 650, 44, c.name, fitFs(c.name, 650, 30, 22), P.ink, { fw: 700, ff: 'h' });
  d.T(72, 108, 650, 40, c.role + '\n' + c.contact, 12.5, P.mut, { lh: 1.5 });
  d.T(72, 190, 650, 24, 'Brasília, ' + new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }), 13.5, P.mut);
  d.T(72, 240, 650, 66, 'Nome da pessoa responsável pela vaga\nEmpresa · Cargo', 14, P.ink, { fw: 600, lh: 1.5 });
  d.T(72, 330, 650, 26, 'Assunto: Candidatura à vaga de [cargo]', 14.5, P.a, { fw: 700 });
  d.T(72, 382, 650, 24, 'Prezado(a) [nome],', 14.5, '#33415f');
  d.T(72, 426, 650, 130, 'Abra a carta dizendo qual vaga te interessa e por que a empresa chamou a sua atenção. Seja direto e específico, em uma ou duas frases.', 14.5, '#33415f', { lh: 1.6 });
  d.T(72, 570, 650, 150, 'No segundo parágrafo, conte duas experiências ou conquistas que mostram que você é a pessoa certa. Use números sempre que puder e conecte o que você fez ao que a vaga pede.', 14.5, '#33415f', { lh: 1.6 });
  d.T(72, 734, 650, 110, 'Encerre agradecendo a atenção e se colocando à disposição para uma conversa. Informe a melhor forma de contato.', 14.5, '#33415f', { lh: 1.6 });
  d.T(72, 880, 650, 24, 'Atenciosamente,', 14.5, '#33415f');
  d.R(72, 960, 200, 1, P.ink);
  d.T(72, 970, 650, 26, c.name, 15, P.ink, { fw: 700 });
  return d.done();
};

/* ---- Portfólios e slides (16:9 = 1280 x 720) ---- */
LAYOUTS.pfCriativo = (P, F, c) => {
  const d = canvas(1280, 720, P.a, P, F);
  d.T(90, 110, 1100, 110, c.heading || c.name, fitFs(c.heading || c.name, 1100, 84, 48), P.on, { fw: 700, ff: 'h' });
  d.T(90, 246, 900, 50, c.sub || (c.role === 'Sua profissão' ? 'Designer · Desenvolvedor · Criador' : c.role), 28, P.onMut);
  d.R(90, 330, 200, 56, P.on, 28, { name: 'Botão' });
  d.T(90, 344, 200, 30, 'Ver projetos', 18, P.a, { fw: 700, ta: 'center' });
  [0, 1, 2].forEach((i) => {
    d.R(90 + i * 370, 450, 340, 190, P.on, 18, { op: 14 });
    d.T(116 + i * 370, 476, 290, 36, 'Projeto ' + (i + 1), 24, P.on, { fw: 700, ff: 'h' });
    d.T(116 + i * 370, 524, 290, 90, 'Descrição curta do que você fez.', 16, P.onMut);
  });
  return d.done();
};

LAYOUTS.pfTech = (P, F, c) => {
  const d = canvas(1280, 720, P.night, P, F);
  d.E(860, -180, 620, 620, P.a, { op: 22, name: 'Brilho' });
  d.T(90, 96, 600, 30, '<olá mundo />', 20, mix(P.a, '#ffffff', 0.5), { ff: F[0], fw: 600 });
  d.T(90, 144, 700, 150, c.name, fitFs(c.name, 700, 76, 44), '#ffffff', { fw: 700, ff: 'h', lh: 1.05 });
  d.T(90, 312, 640, 40, c.role === 'Sua profissão' ? 'Desenvolvedor(a) full-stack' : c.role, 26, '#A9B6D9');
  (c.skills || ['JavaScript', 'React', 'Node.js', 'SQL', 'Docker']).slice(0, 5).forEach((s, i) => { const x = 90 + i * 150; d.R(x, 392, 136, 40, P.a, 10, { op: 30 }); d.T(x, 400, 136, 26, s, 14, '#E6ECFF', { fw: 600, ta: 'center' }); });
  d.R(90, 480, 190, 54, P.a, 12); d.T(90, 493, 190, 28, 'Ver projetos', 17, P.on, { fw: 700, ta: 'center' });
  d.R(300, 480, 190, 54, '#ffffff', 12, { op: 10, bd: 1, bdc: '#3A4670' }); d.T(300, 493, 190, 28, 'GitHub', 17, '#ffffff', { fw: 600, ta: 'center' });
  d.R(760, 150, 430, 400, '#111A33', 18, { bd: 1, bdc: '#2A3558', name: 'Janela de código' });
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((cl, i) => d.E(786 + i * 26, 174, 14, 14, cl));
  d.T(786, 220, 380, 300, 'const dev = {\n  nome: "' + c.first + '",\n  foco: ["web", "dados"],\n  disponivel: true,\n};\n\ndev.criar("algo incrível");', 17, '#9FB4FF', { ff: 'Courier New', lh: 1.65 });
  return d.done();
};

LAYOUTS.pfMinimal = (P, F, c) => {
  const d = canvas(1280, 720, '#ffffff', P, F);
  d.T(80, 56, 500, 22, 'PORTFÓLIO ' + new Date().getFullYear(), 14, P.mut, { fw: 600, ls: 3 });
  d.T(80, 96, 1120, 190, c.heading || c.name, fitFs(c.heading || c.name, 1120, 120, 60), P.ink, { fw: 800, ff: 'h', lh: 1 });
  d.T(80, 300, 700, 40, c.sub || (c.role === 'Sua profissão' ? 'Designer · Desenvolvedor · Criador' : c.role), 26, P.a, { fw: 600 });
  d.R(80, 400, 1120, 2, P.ink);
  [0, 1, 2].forEach((i) => {
    const x = 80 + i * 384;
    d.T(x, 424, 80, 40, '0' + (i + 1), 30, P.a, { fw: 700, ff: 'h' });
    d.T(x, 478, 340, 36, 'Nome do projeto', 24, P.ink, { fw: 700, ff: 'h' });
    d.T(x, 522, 330, 80, 'Uma frase sobre o problema e o resultado que você entregou.', 16, P.mut, { lh: 1.5 });
  });
  d.T(80, 660, 800, 24, c.email + '   ·   ' + c.link, 14, P.mut);
  return d.done();
};

LAYOUTS.pfFoto = (P, F, c) => {
  const d = canvas(1280, 720, '#0C0C10', P, F);
  d.T(70, 50, 700, 70, c.heading || c.name, fitFs(c.heading || c.name, 700, 56, 36), '#ffffff', { fw: 700, ff: 'h' });
  d.T(70, 120, 700, 30, c.sub || 'Fotografia · Direção de arte · Vídeo', 18, '#9A9AAE', { ls: 1 });
  d.R(1010, 58, 200, 46, P.a, 23); d.T(1010, 68, 200, 28, 'Contato', 16, P.on, { fw: 700, ta: 'center' });
  const ph = (x, y, w, h, t) => { d.R(x, y, w, h, '#1B1B24', 12, { bd: 1, bdc: '#2D2D3A', name: 'Foto' }); d.T(x, y + h / 2 - 14, w, 28, t, 15, '#6C6C80', { ta: 'center', fw: 500 }); };
  ph(70, 180, 520, 470, 'Foto principal'); ph(610, 180, 285, 225, 'Foto 2'); ph(915, 180, 295, 225, 'Foto 3'); ph(610, 425, 190, 225, 'Foto 4'); ph(820, 425, 390, 225, 'Foto 5');
  d.T(70, 672, 600, 22, 'Troque as áreas cinza por suas fotos (menu Imagem ou Anexos).', 12.5, '#6C6C80');
  return d.done();
};

LAYOUTS.pfSobre = (P, F, c) => {
  const d = canvas(1280, 720, P.soft, P, F);
  d.R(0, 0, 440, 720, P.a, 0, { name: 'Painel' });
  d.E(100, 150, 240, 240, P.mid, { name: 'Foto' });
  d.T(100, 232, 240, 80, String(c.name).split(' ').filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase(), 72, P.dark, { fw: 800, ta: 'center', ff: 'h' });
  d.T(60, 430, 320, 80, c.name, fitFs(c.name, 320, 34, 22), P.on, { fw: 700, ta: 'center', ff: 'h', lh: 1.15 });
  d.T(60, 520, 320, 30, c.role, 18, P.onMut, { ta: 'center' });
  d.T(500, 90, 700, 24, 'SOBRE MIM', 14, P.a, { fw: 700, ls: 3 });
  d.T(500, 130, 700, 150, 'Conte sua história em poucas linhas.', 48, P.ink, { fw: 700, ff: 'h', lh: 1.1 });
  d.T(500, 300, 680, 150, c.bio || 'Quem você é, o que já fez e o que busca. Fale do seu jeito de trabalhar, do que te motiva e do tipo de projeto em que você rende mais.', 19, '#33415f', { lh: 1.6 });
  [['+20', 'projetos'], ['3', 'anos de estudo'], ['5', 'ferramentas']].forEach(([n, l], i) => { const x = 500 + i * 230; d.R(x, 500, 210, 130, '#ffffff', 16, { bd: 1, bdc: P.mid }); d.T(x, 516, 210, 56, n, 44, P.a, { fw: 800, ta: 'center', ff: 'h' }); d.T(x, 580, 210, 24, l, 15, P.mut, { ta: 'center' }); });
  return d.done();
};

/* ---- LinkedIn e redes ---- */
LAYOUTS.liBanner = (P, F, c) => {
  const d = canvas(1584, 396, P.a, P, F);
  d.E(1120, -220, 620, 620, P.on, { op: 10 }); d.E(1300, 120, 360, 360, P.on, { op: 12 });
  d.T(90, 96, 960, 110, c.name, fitFs(c.name, 960, 74, 44), P.on, { fw: 800, ff: 'h' });
  d.T(90, 210, 960, 44, c.role === 'Sua profissão' ? 'Sua profissão · Sua especialidade' : c.role, 28, P.onMut);
  d.R(90, 276, 90, 5, P.on, 2, { op: 70 });
  d.T(90, 298, 960, 30, 'Abro portas para: estágio · projetos · parcerias', 19, P.onMut);
  return d.done();
};

LAYOUTS.liPost = (P, F, c) => {
  const d = canvas(1080, 1080, P.a, P, F);
  d.E(-160, -160, 520, 520, P.on, { op: 10 }); d.E(760, 760, 520, 520, P.on, { op: 10 });
  d.T(90, 120, 200, 200, '“', 220, P.on, { fw: 800, ff: 'h', lh: 1 });
  d.T(90, 330, 900, 360, 'Escreva aqui a frase, dica ou aprendizado que você quer compartilhar.', 62, P.on, { fw: 700, ff: 'h', lh: 1.2 });
  d.R(90, 800, 80, 5, P.on, 2, { op: 70 });
  d.T(90, 830, 800, 40, c.name, 30, P.on, { fw: 700 }); d.T(90, 874, 800, 36, c.role, 22, P.onMut);
  return d.done();
};

LAYOUTS.liCarrossel = (P, F, c) => {
  const d = canvas(1080, 1350, P.night, P, F);
  d.E(540, -260, 900, 900, P.a, { op: 24 });
  d.R(90, 130, 180, 44, P.a, 22); d.T(90, 139, 180, 28, 'GUIA RÁPIDO', 15, P.on, { fw: 700, ta: 'center', ls: 1.5 });
  d.T(90, 250, 900, 520, 'Título forte que prende a atenção em 3 segundos', 84, '#ffffff', { fw: 800, ff: 'h', lh: 1.08 });
  d.T(90, 800, 860, 100, 'Deslize para ver o passo a passo →', 30, '#A9B6D9');
  d.R(90, 1130, 100, 100, P.a, 50); d.T(90, 1156, 100, 50, String(c.name).split(' ').filter(Boolean).map((x) => x[0]).join('').slice(0, 2).toUpperCase(), 34, P.on, { fw: 800, ta: 'center', ff: 'h' });
  d.T(214, 1146, 700, 36, c.name, 26, '#ffffff', { fw: 700 }); d.T(214, 1184, 700, 30, c.role, 19, '#A9B6D9');
  return d.done();
};

/* ---- Projetos e apresentações ---- */
LAYOUTS.prCase = (P, F, c) => {
  const d = canvas(1280, 720, '#ffffff', P, F);
  d.R(0, 0, 1280, 18, P.a);
  d.T(80, 70, 1120, 80, c.heading || 'Título do projeto', 54, P.a, { fw: 700, ff: 'h' });
  d.T(80, 160, 1000, 40, 'Resumo de uma linha sobre o projeto', 22, '#55627F');
  [['Problema', 80], ['Solução', 460], ['Resultado', 840]].forEach(([t, x]) => {
    d.R(x, 260, 360, 320, P.soft, 16);
    d.T(x + 28, 288, 300, 36, t, 26, P.a, { fw: 700, ff: 'h' });
    d.T(x + 28, 340, 304, 220, 'Descreva aqui.', 18, '#33415f', { lh: 1.5 });
  });
  d.T(80, 630, 900, 26, 'Seu papel · Período · Ferramentas', 15, P.mut);
  return d.done();
};

LAYOUTS.prPitch = (P, F, c) => {
  const d = canvas(1280, 720, '#ffffff', P, F);
  d.R(760, 0, 520, 720, P.a, 0, { name: 'Painel' });
  d.E(820, 150, 400, 400, P.on, { op: 14 }); d.E(920, 250, 200, 200, P.on, { op: 18 });
  d.T(80, 64, 500, 26, 'APRESENTAÇÃO DO PROJETO', 15, P.a, { fw: 700, ls: 2.5 });
  d.T(80, 190, 620, 230, 'Título que resume a sua ideia', 66, P.ink, { fw: 800, ff: 'h', lh: 1.08 });
  d.T(80, 440, 600, 70, 'Uma frase de apoio sobre o problema que você resolve.', 22, P.mut, { lh: 1.4 });
  d.R(80, 560, 70, 5, P.a, 2);
  d.T(80, 586, 600, 30, c.name, 20, P.ink, { fw: 700 }); d.T(80, 618, 600, 26, c.role + ' · ' + new Date().getFullYear(), 15, P.mut);
  return d.done();
};

LAYOUTS.prResultados = (P, F, c) => {
  const d = canvas(1280, 720, P.soft, P, F);
  d.T(80, 64, 900, 26, 'RESULTADOS', 15, P.a, { fw: 700, ls: 3 });
  d.T(80, 100, 1100, 80, 'O que mudou depois do projeto', 50, P.ink, { fw: 800, ff: 'h' });
  [['+120%', 'métrica principal'], ['3x', 'mais rápido'], ['-40%', 'custo ou tempo'], ['98%', 'satisfação']].forEach(([n, l], i) => {
    const x = 80 + i * 285; d.R(x, 250, 262, 250, '#ffffff', 18, { bd: 1, bdc: P.mid });
    d.T(x, 290, 262, 90, n, 66, P.a, { fw: 800, ta: 'center', ff: 'h' }); d.T(x, 400, 262, 60, l, 19, P.mut, { ta: 'center' });
  });
  d.T(80, 560, 1100, 90, 'Explique em duas linhas como você chegou a esses números e o que aprendeu.', 22, '#33415f', { lh: 1.5 });
  return d.done();
};

LAYOUTS.prTimeline = (P, F, c) => {
  const d = canvas(1280, 720, '#ffffff', P, F);
  d.T(80, 64, 900, 26, 'LINHA DO TEMPO', 15, P.a, { fw: 700, ls: 3 });
  d.T(80, 100, 1100, 80, 'Do início à entrega', 50, P.ink, { fw: 800, ff: 'h' });
  d.R(190, 355, 900, 4, P.mid);
  [['Mês 1', 'Pesquisa'], ['Mês 2', 'Protótipo'], ['Mês 3', 'Desenvolvimento'], ['Mês 4', 'Entrega']].forEach(([m, t], i) => {
    const x = 190 + i * 300; d.E(x - 18, 339, 36, 36, P.a); d.T(x - 100, 280, 200, 30, m, 20, P.a, { fw: 700, ta: 'center', ff: 'h' });
    d.T(x - 130, 400, 260, 36, t, 24, P.ink, { fw: 700, ta: 'center', ff: 'h' }); d.T(x - 130, 446, 260, 80, 'Descreva a entrega principal desta etapa.', 16, P.mut, { ta: 'center', lh: 1.45 });
  });
  return d.done();
};

LAYOUTS.prOnePager = (P, F, c) => {
  const d = canvas(794, 1123, '#ffffff', P, F);
  d.R(0, 0, 794, 14, P.a);
  d.T(56, 56, 682, 90, c.heading || 'Título do projeto', 40, P.ink, { fw: 800, ff: 'h', lh: 1.1 });
  d.T(56, 150, 682, 50, 'Resumo de uma ou duas linhas sobre o projeto e para quem ele foi feito.', 16, P.mut, { lh: 1.45 });
  [['Papel', 'Seu papel'], ['Período', '2026'], ['Ferramentas', 'Figma · React']].forEach(([l, v], i) => { const x = 56 + i * 232; d.R(x, 226, 218, 70, P.soft, 12); d.T(x + 16, 238, 190, 18, l.toUpperCase(), 11, P.a, { fw: 700, ls: 1.4 }); d.T(x + 16, 262, 190, 26, v, 16, P.ink, { fw: 600 }); });
  [['Problema', 330, 110], ['Solução', 470, 110], ['Resultado', 610, 110]].forEach(([t, y, h]) => { d.R(56, y + 4, 5, h - 16, P.a, 3); d.T(76, y, 660, 26, t, 20, P.a, { fw: 700, ff: 'h' }); d.T(76, y + 34, 660, h - 36, 'Descreva aqui em poucas linhas.', 14.5, '#33415f', { lh: 1.55 }); });
  [0, 1].forEach((i) => { const x = 56 + i * 346; d.R(x, 770, 336, 230, '#F1F4FA', 14, { bd: 1, bdc: P.line }); d.T(x, 872, 336, 26, 'Imagem do projeto', 14, '#8793B0', { ta: 'center' }); });
  d.T(56, 1040, 682, 22, c.name + ' · ' + c.email, 12.5, P.mut);
  return d.done();
};

LAYOUTS.blankA4 = (P, F) => canvas(794, 1123, '#ffffff', P, F).done();
LAYOUTS.blankSlide = (P, F) => canvas(1280, 720, '#ffffff', P, F).done();

/* ===================== CATÁLOGO =====================
   id · nome · descrição · categoria (filtro) · tipo do arquivo (curriculo | portfolio | projeto)
   · plano ('A' gratuito | 'B' Pro) · cor de destaque · fontes · construtor · formato */
const CATS = [['todos', 'Todos'], ['curriculo', 'Currículo'], ['carta', 'Carta'], ['portfolio', 'Portfólio'], ['linkedin', 'LinkedIn'], ['projeto', 'Projeto'], ['apresentacao', 'Apresentação'], ['branco', 'Em branco']];
const CAT_LABEL = Object.fromEntries(CATS);
const MODELS = [
  { id: 'curriculo-profissional', name: 'Currículo Profissional', desc: 'Limpo e objetivo para o mercado tradicional', cat: 'curriculo', kind: 'curriculo', plan: 'A', accent: '#0A1A3F', fp: 'moderna', b: 'cvProfissional', fmt: 'A4' },
  { id: 'curriculo-minimalista', name: 'Currículo Minimalista', desc: 'Muito espaço em branco e foco no conteúdo', cat: 'curriculo', kind: 'curriculo', plan: 'A', accent: '#2F5BEA', fp: 'limpa', b: 'cvMinimal', fmt: 'A4' },
  { id: 'curriculo-estagio', name: 'Primeiro Emprego e Estágio', desc: 'Destaca objetivo, cursos e projetos acadêmicos', cat: 'curriculo', kind: 'curriculo', plan: 'A', accent: '#0E9F8E', fp: 'moderna', b: 'cvEstagio', fmt: 'A4' },
  { id: 'curriculo-moderno', name: 'Currículo Moderno', desc: 'Barra lateral colorida e duas colunas', cat: 'curriculo', kind: 'curriculo', plan: 'B', accent: '#3A5BD9', fp: 'moderna', b: 'cvModerno', fmt: 'A4' },
  { id: 'curriculo-executivo', name: 'Currículo Executivo', desc: 'Elegante, com fonte clássica e cabeçalho centralizado', cat: 'curriculo', kind: 'curriculo', plan: 'B', accent: '#7A1F3D', fp: 'classica', b: 'cvExecutivo', fmt: 'A4' },
  { id: 'curriculo-criativo', name: 'Currículo Criativo', desc: 'Formas, cor e personalidade para áreas criativas', cat: 'curriculo', kind: 'curriculo', plan: 'B', accent: '#6D4AFF', fp: 'limpa', b: 'cvCriativo', fmt: 'A4' },
  { id: 'curriculo-tech', name: 'Currículo Tech', desc: 'Stack em destaque para desenvolvedores', cat: 'curriculo', kind: 'curriculo', plan: 'B', accent: '#2F5BEA', fp: 'tech', b: 'cvTech', fmt: 'A4' },
  { id: 'carta-apresentacao', name: 'Carta de Apresentação', desc: 'Estrutura pronta para acompanhar o currículo', cat: 'carta', kind: 'curriculo', plan: 'A', accent: '#0A1A3F', fp: 'moderna', b: 'carta', fmt: 'A4' },
  { id: 'portfolio-criativo', name: 'Portfólio Criativo', desc: 'Destaque seus projetos com visual impactante', cat: 'portfolio', kind: 'portfolio', plan: 'A', accent: '#2F5BEA', fp: 'moderna', b: 'pfCriativo', fmt: '16:9' },
  { id: 'portfolio-minimalista', name: 'Portfólio Minimalista', desc: 'Tipografia grande e projetos numerados', cat: 'portfolio', kind: 'portfolio', plan: 'A', accent: '#E8590C', fp: 'editorial', b: 'pfMinimal', fmt: '16:9' },
  { id: 'portfolio-tech', name: 'Portfólio Tech', desc: 'Ideal para desenvolvedores e engenheiros', cat: 'portfolio', kind: 'portfolio', plan: 'B', accent: '#3B82F6', fp: 'tech', b: 'pfTech', fmt: '16:9' },
  { id: 'portfolio-fotografia', name: 'Portfólio Fotografia', desc: 'Mosaico de fotos em fundo escuro', cat: 'portfolio', kind: 'portfolio', plan: 'B', accent: '#F59E0B', fp: 'limpa', b: 'pfFoto', fmt: '16:9' },
  { id: 'portfolio-sobre-mim', name: 'Sobre Mim', desc: 'Slide de apresentação pessoal com números', cat: 'portfolio', kind: 'portfolio', plan: 'B', accent: '#0F8B5F', fp: 'moderna', b: 'pfSobre', fmt: '16:9' },
  { id: 'perfil-linkedin', name: 'Banner do LinkedIn', desc: 'Capa pronta para o seu perfil (1584 × 396)', cat: 'linkedin', kind: 'portfolio', plan: 'A', accent: '#1F44C9', fp: 'moderna', b: 'liBanner', fmt: 'Banner' },
  { id: 'linkedin-post', name: 'Post com Frase', desc: 'Quadrado para publicar uma ideia ou aprendizado', cat: 'linkedin', kind: 'portfolio', plan: 'A', accent: '#6D4AFF', fp: 'limpa', b: 'liPost', fmt: '1:1' },
  { id: 'linkedin-carrossel', name: 'Carrossel: capa', desc: 'Capa vertical para carrosséis (1080 × 1350)', cat: 'linkedin', kind: 'portfolio', plan: 'B', accent: '#2F5BEA', fp: 'moderna', b: 'liCarrossel', fmt: '4:5' },
  { id: 'case-de-projeto', name: 'Case de Projeto', desc: 'Documente um projeto de ponta a ponta', cat: 'projeto', kind: 'projeto', plan: 'B', accent: '#0A1A3F', fp: 'moderna', b: 'prCase', fmt: '16:9' },
  { id: 'projeto-resumo', name: 'Resumo de Projeto (1 página)', desc: 'Problema, solução e resultado em uma folha A4', cat: 'projeto', kind: 'projeto', plan: 'B', accent: '#0E9F8E', fp: 'limpa', b: 'prOnePager', fmt: 'A4' },
  { id: 'apresentacao-pitch', name: 'Capa de Apresentação', desc: 'Slide de abertura para apresentar uma ideia', cat: 'apresentacao', kind: 'projeto', plan: 'A', accent: '#2F5BEA', fp: 'moderna', b: 'prPitch', fmt: '16:9' },
  { id: 'apresentacao-resultados', name: 'Slide de Resultados', desc: 'Quatro números grandes para mostrar impacto', cat: 'apresentacao', kind: 'projeto', plan: 'A', accent: '#6D4AFF', fp: 'moderna', b: 'prResultados', fmt: '16:9' },
  { id: 'apresentacao-timeline', name: 'Linha do Tempo', desc: 'Etapas do projeto, do início à entrega', cat: 'apresentacao', kind: 'projeto', plan: 'B', accent: '#E8590C', fp: 'limpa', b: 'prTimeline', fmt: '16:9' },
  { id: 'em-branco-a4', name: 'Página em branco (A4)', desc: 'Comece do zero com uma folha A4', cat: 'branco', kind: 'curriculo', plan: 'A', accent: '#2F5BEA', fp: 'moderna', b: 'blankA4', fmt: 'A4' },
  { id: 'em-branco-slide', name: 'Slide em branco (16:9)', desc: 'Comece do zero com um slide', cat: 'branco', kind: 'projeto', plan: 'A', accent: '#2F5BEA', fp: 'moderna', b: 'blankSlide', fmt: '16:9' },
];
const modelById = (id) => MODELS.find((m) => m.id === id);
/** Modelo padrão de cada tipo (usado nas contas novas e na migração de dados antigos). */
const DEFAULT_MODEL = { curriculo: 'curriculo-profissional', portfolio: 'portfolio-criativo', projeto: 'case-de-projeto' };

/**
 * Monta o layout de um modelo.
 * o = { accent, fp (chave de FONT_PAIRS), fill (usar dados do perfil), nameOnly, name, heading, sub }
 */
function buildDoc(id, o = {}) {
  const m = modelById(id) || modelById('em-branco-a4');
  const P = palette(o.accent || m.accent), F = FONT_PAIRS[o.fp || m.fp] || FONT_PAIRS.moderna;
  const d = LAYOUTS[m.b](P, [F[1], F[2]], tplContent(o));
  return { ...d, model: m.id };
}
