export type Transaction = {
  id: string;
  date: string;
  medicationName: string;
  quantity: number;
  type: 'IN' | 'OUT';
  patientType: 'Rawat Jalan' | 'Rawat Inap';
  paymentMethod: 'BPJS' | 'UMUM';
  context: string;
  totalPrice: number;
};

export type Medication = {
  id: string;
  name: string;
  stock: number;
  price: number;
};

export type AbcAnalysisResult = {
  report: string;
  summary: string;
};

export type SalesData = {
  name: string;
  total: number;
};
