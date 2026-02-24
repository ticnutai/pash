export interface SearchableItem {
  type: 'pasuk' | 'question' | 'perush';
  id: string;
  sefer: number;
  perek: number;
  pasuk_num: number;
  text: string;
  mefaresh?: string;
  questionText?: string;
  originalItem: any;
}
