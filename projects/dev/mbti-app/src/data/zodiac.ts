import { ZodiacDefinition } from '../types';

export const zodiacSigns: ZodiacDefinition[] = [
  { sign: 'aries', nameJP: '牡羊座', emoji: '♈', dateRange: '3/21〜4/19' },
  { sign: 'taurus', nameJP: '牡牛座', emoji: '♉', dateRange: '4/20〜5/20' },
  { sign: 'gemini', nameJP: '双子座', emoji: '♊', dateRange: '5/21〜6/21' },
  { sign: 'cancer', nameJP: '蟹座', emoji: '♋', dateRange: '6/22〜7/22' },
  { sign: 'leo', nameJP: '獅子座', emoji: '♌', dateRange: '7/23〜8/22' },
  { sign: 'virgo', nameJP: '乙女座', emoji: '♍', dateRange: '8/23〜9/22' },
  { sign: 'libra', nameJP: '天秤座', emoji: '♎', dateRange: '9/23〜10/23' },
  { sign: 'scorpio', nameJP: '蠍座', emoji: '♏', dateRange: '10/24〜11/22' },
  { sign: 'sagittarius', nameJP: '射手座', emoji: '♐', dateRange: '11/23〜12/21' },
  { sign: 'capricorn', nameJP: '山羊座', emoji: '♑', dateRange: '12/22〜1/19' },
  { sign: 'aquarius', nameJP: '水瓶座', emoji: '♒', dateRange: '1/20〜2/18' },
  { sign: 'pisces', nameJP: '魚座', emoji: '♓', dateRange: '2/19〜3/20' },
];

// 誕生日から星座を取得
export function getZodiacFromBirthday(month: number, day: number): string {
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return 'gemini';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return 'libra';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return 'scorpio';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  return 'pisces';
}
