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
      mk('Matemática Básica', 'Operações e lógica no dia a dia', 'facil', [
        Q('Se você tem 3 maçãs e ganha mais 2, com quantas fica?', ['4 maçãs', '5 maçãs', '6 maçãs', '7 maçãs'], 1, '3 + 2 = 5. Somando as quantidades, ficamos com 5 maçãs.'),
        Q('Quanto é o dobro de 4?', ['6', '8', '10', '12'], 1, 'O dobro de um número é ele somado com ele mesmo: 4 + 4 = 8.'),
        Q('Qual figura geométrica tem 3 lados?', ['Quadrado', 'Círculo', 'Triângulo', 'Retângulo'], 2, 'O triângulo é a forma geométrica que possui exatamente 3 lados.'),
        Q('Se uma caixa tem 10 lápis e tiramos 3, quantos sobram?', ['5 lápis', '6 lápis', '7 lápis', '8 lápis'], 2, '10 - 3 = 7. Restam 7 lápis na caixa.'),
        Q('Qual número vem logo depois do 29?', ['20', '30', '40', '39'], 1, 'Na contagem, o número que sucede o 29 é o 30.'),
        Q('Quanto é 5 vezes 2?', ['7', '10', '15', '20'], 1, '5 x 2 significa somar o 5 duas vezes: 5 + 5 = 10.'),
        Q('Ana tem 8 balas e chupou 3. Com quantas balas ela ficou?', ['3 balas', '4 balas', '5 balas', '6 balas'], 2, '8 - 3 = 5 balas.'),
        Q('Quantos minutos tem uma hora?', ['30 minutos', '50 minutos', '60 minutos', '100 minutos'], 2, 'Uma hora é composta por 60 minutos exatos.')
      ]),
      mk('Português e Linguagem', 'Palavras, sílabas e leitura', 'facil', [
        Q('Qual destas palavras é o nome de um animal?', ['Bicicleta', 'Cachorro', 'Mochila', 'Caderno'], 1, 'Cachorro é um animal de estimação; os outros são objetos.'),
        Q('Qual palavra começa com a letra "A"?', ['Bola', 'Escola', 'Avião', 'Dado'], 2, 'A palavra "Avião" inicia-se com a vogal A.'),
        Q('Quantas sílabas tem a palavra "CASA"?', ['1 sílaba', '2 sílabas', '3 sílabas', '4 sílabas'], 1, 'CA-SA possui duas sílabas.'),
        Q('Qual destas palavras rima com "GATO"?', ['Pato', 'Mesa', 'Livro', 'Janela'], 0, 'Gato e pato possuem o final com o mesmo som (-ato).'),
        Q('Qual destas opções é uma vogal?', ['B', 'M', 'E', 'S'], 2, 'As vogais do alfabeto são A, E, I, O, U.'),
        Q('O ponto final (.) serve para…', ['Fazer uma pergunta', 'Indicar o fim de uma frase', 'Mostrar susto ou admiração', 'Separar itens numa lista'], 1, 'Usamos o ponto final para encerrar uma frase que declarou algo.'),
        Q('Qual é o plural de "flor"?', ['Flores', 'Florzinha', 'Florões', 'Floresas'], 0, 'O plural de flor é flores.'),
        Q('Quem escreve livros ou histórias é chamado de…', ['Ilustrador', 'Ator', 'Escritor', 'Cantor'], 2, 'O escritor é o autor responsável por criar e escrever as histórias.')
      ])
    ];
  }

  Object.assign(Nivel, {
    Q,
    seedBanks
  });
})();
