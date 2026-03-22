import { MBTIType, QuizScore } from '../types';
import { questions } from '../data/questions';

export function calculateMBTI(answers: Record<number, 'left' | 'right'>): MBTIType {
  const score: QuizScore = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  questions.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;

    const axis = answer === 'left' ? q.leftAxis : q.rightAxis;
    score[axis] = (score[axis] || 0) + 1;
  });

  const type = [
    score.E >= score.I ? 'E' : 'I',
    score.S >= score.N ? 'S' : 'N',
    score.T >= score.F ? 'T' : 'F',
    score.J >= score.P ? 'J' : 'P',
  ].join('') as MBTIType;

  return type;
}

// 各軸のスコア割合を返す（結果画面の詳細表示用）
export function getAxisPercentages(answers: Record<number, 'left' | 'right'>): {
  EI: { E: number; I: number };
  SN: { S: number; N: number };
  TF: { T: number; F: number };
  JP: { J: number; P: number };
} {
  const score: QuizScore = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };

  questions.forEach((q) => {
    const answer = answers[q.id];
    if (!answer) return;
    const axis = answer === 'left' ? q.leftAxis : q.rightAxis;
    score[axis] = (score[axis] || 0) + 1;
  });

  const toPercent = (a: number, b: number) => {
    const total = a + b || 1;
    return { first: Math.round((a / total) * 100), second: Math.round((b / total) * 100) };
  };

  const ei = toPercent(score.E, score.I);
  const sn = toPercent(score.S, score.N);
  const tf = toPercent(score.T, score.F);
  const jp = toPercent(score.J, score.P);

  return {
    EI: { E: ei.first, I: ei.second },
    SN: { S: sn.first, N: sn.second },
    TF: { T: tf.first, F: tf.second },
    JP: { J: jp.first, P: jp.second },
  };
}
