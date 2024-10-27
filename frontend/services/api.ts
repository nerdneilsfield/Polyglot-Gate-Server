import { ApiResponse, Model, TranslationRequest, TranslationResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL;

export const getModels = async () => {
  const response = await fetch(`${API_URL}/api/models`);
  if (!response.ok) {
    throw new Error('Failed to fetch models');
  }
  return response.json() as Promise<ApiResponse<Model[]>>;
};

export const translate = async (params: TranslationRequest & { token: string }) => {
  const { token, ...requestBody } = params;
  const response = await fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    throw new Error('Translation failed');
  }
  return response.json() as Promise<ApiResponse<TranslationResponse>>;
};