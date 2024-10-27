export type Model = string;

export interface TranslationRequest {
    text: string;
    from: string;
    to: string;
    model_name: string;
    force_refresh?: boolean;
}

export interface TranslationResponse {
    translated_text: string;
    model_name: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
}
