export interface MemoNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemoDraft {
  title: string;
  content: string;
}
