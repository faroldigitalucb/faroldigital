(() => {
  'use strict';

  const Nivel = (window.Nivel = window.Nivel || {});
  const { uid } = Nivel;

  /* =====================================================================
     Dados de exemplo (criados na configuração inicial)
     ===================================================================== */
  const Q = (text, options, correct, explanation) => ({
    id: uid(),
    text,
    options,
    correct,
    explanation
  });

  function seedBanks(owner) {
    const mk = (name, theme, level, questions) => ({
      id: uid(),
      name,
      theme,
      level,
      ownerId: owner.username,
      ownerName: owner.name,
      questions,
      updatedAt: Date.now()
    });

    return [
      mk('Educação financeira', 'Dinheiro no dia a dia', 'medio', [
        Q('O que é uma reserva de emergência?', ['Dinheiro separado para viagens','Dinheiro guardado para imprevistos, como um problema de saúde','Um tipo de empréstimo do banco','Um investimento de alto risco'], 1, 'Ela cobre gastos inesperados sem que você precise se endividar.'),
        Q('Você viu um tênis caro em promoção e quer muito. O que ajuda a evitar uma compra por impulso?', ['Comprar logo, antes que acabe','Pedir dinheiro emprestado para não perder','Parcelar em muitas vezes','Esperar alguns dias e ver se ainda faz sentido'], 3, 'Dar um tempo esfria a vontade e deixa você decidir com a cabeça.'),
        Q('Juros são…', ['Um desconto dado pelo vendedor','Um imposto sobre o salário','O valor cobrado ou pago pelo uso do dinheiro ao longo do tempo','Uma taxa para abrir conta'], 2, 'Quando você deve, paga juros. Quando investe, recebe juros.'),
        Q('Qual destes é uma necessidade, e não um desejo?', ['Um videogame novo','Comida do dia a dia','Skin de jogo','Ingresso de show'], 1, 'Necessidades são o que precisamos para viver bem. Desejos são o que queremos a mais.'),
        Q('Para que serve um orçamento pessoal?', ['Para planejar quanto dinheiro entra e quanto sai','Para pagar menos impostos','Para ganhar mais no fim do mês','Para conseguir empréstimo mais fácil'], 0, 'Com ele você enxerga para onde o dinheiro vai e evita sustos.'),
        Q('Você ganha R$ 100 e gasta R$ 120. O que aconteceu?', ['Sobraram R$ 20','O banco cobre a diferença de graça','Você gastou R$ 20 que não tinha e ficou devendo','O dinheiro rendeu juros'], 2, 'Gastar mais do que se ganha leva ao endividamento.'),
        Q('O cartão de crédito é…', ['Dinheiro extra que o banco dá de presente','Uma forma de pagar depois, mas a conta sempre chega','Uma conta de poupança','Um cartão que nunca cobra juros'], 1, 'Se você não paga a fatura inteira, os juros do cartão são muito altos.'),
        Q('Guardar R$ 20 por semana durante 10 semanas dá quanto, sem contar juros?', ['R$ 100','R$ 200','R$ 120','R$ 20'], 1, '20 × 10 = 200. Pequenos valores constantes viram uma boa quantia.')
      ]),
      mk('Emoções e convivência', 'Saúde emocional e relações', 'facil', [
        Q('Você está com muita raiva numa discussão. Qual atitude ajuda mais?', ['Gritar para o outro entender','Respirar fundo, dar um tempo e conversar depois','Ignorar a pessoa para sempre','Postar uma indireta nas redes'], 1, 'Com a cabeça mais calma, a conversa rende e ninguém se machuca.'),
        Q('Empatia é…', ['Concordar com tudo que os outros falam','Sentir pena de quem está mal','Tentar entender o que o outro sente, colocando-se no lugar dele','Dar conselhos sem ouvir'], 2, 'Empatia começa em ouvir de verdade.'),
        Q('Você vê um colega sofrendo bullying. O que fazer?', ['Rir para não virar alvo','Acolher o colega e avisar um adulto de confiança','Filmar e compartilhar','Fingir que não viu'], 1, 'Apoiar a vítima e pedir ajuda a um adulto ajuda a parar a situação.'),
        Q('Qual frase expressa um sentimento sem culpar o outro?', ['“Você sempre me irrita.”','“A culpa é toda sua.”','“Você é insuportável.”','“Eu me senti chateado quando isso aconteceu.”'], 3, 'Falar de como você se sente abre espaço para o diálogo.'),
        Q('Pedir ajuda quando a gente não está bem é…', ['Sinal de fraqueza','Exagero','Um jeito de cuidar de si, e faz parte de ser forte','Perda de tempo'], 2, 'Todo mundo precisa de apoio em algum momento.'),
        Q('Quantas horas de sono, em média, um adolescente precisa por noite?', ['De 4 a 5 horas','De 6 a 7 horas','De 8 a 10 horas','Mais de 12 horas'], 2, 'Dormir bem ajuda o humor, a memória e a concentração.'),
        Q('Qual destas atitudes pode ajudar a reduzir a ansiedade?', ['Praticar respiração, se movimentar e conversar com alguém','Ficar a noite toda no celular','Guardar tudo só para si','Pular refeições'], 0, 'Corpo e conversa andam juntos no cuidado com a mente.'),
        Q('Você discorda de um amigo. Qual é a melhor postura?', ['Vencer a discussão a qualquer custo','Parar de falar com ele','Falar mal dele para outros','Ouvir o ponto de vista dele e explicar o seu com respeito'], 3, 'Discordar faz parte. O respeito mantém a amizade.')
      ])
    ];
  }

  Object.assign(Nivel, {
    Q,
    seedBanks
  });
})();
