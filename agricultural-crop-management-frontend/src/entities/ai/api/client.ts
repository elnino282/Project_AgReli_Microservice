import httpClient from '@/shared/api/http';
import { parseApiResponse } from '@/shared/api/types';
import { z } from 'zod';
import {
    AiSuggestionSchema,
    AiSuggestionParamsSchema,
    YieldPredictionSchema,
    YieldPredictionParamsSchema,
    CostOptimizationSchema,
    CostOptimizationParamsSchema,
    AiChatRequestSchema,
    AiChatResponseSchema,
    BuyerAiChatRequestSchema,
    BuyerAiChatResponseSchema,
    AiQaRequestSchema,
    AiQaResponseSchema,
    PredictHarvestRequestSchema,
    PredictHarvestResponseSchema
} from '../model/schemas';
import type {
    AiSuggestion,
    AiSuggestionParams,
    YieldPrediction,
    YieldPredictionParams,
    CostOptimization,
    CostOptimizationParams,
    AiChatRequest,
    AiChatResponse,
    BuyerAiChatRequest,
    BuyerAiChatResponse,
    AiQaRequest,
    AiQaResponse,
    PredictHarvestRequest,
    PredictHarvestResponse
} from '../model/types';

export const aiApi = {
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // FARMER AI ENDPOINTS
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

    /** POST /api/v1/farmer/ai/chat - Agronomy Q&A chat */
    chat: async (data: AiChatRequest): Promise<AiChatResponse> => {
        const validatedPayload = AiChatRequestSchema.parse(data);
        const response = await httpClient.post('/api/v1/farmer/ai/chat', validatedPayload);
        return parseApiResponse(response.data, AiChatResponseSchema);
    },

    /** GET /api/v1/farmer/ai/suggestions - Get AI suggestions for season */
    getSuggestions: async (params: AiSuggestionParams): Promise<AiSuggestion[]> => {
        const validatedParams = AiSuggestionParamsSchema.parse(params);
        const response = await httpClient.get('/api/v1/farmer/ai/suggestions', { params: validatedParams });
        return parseApiResponse(response.data, z.array(AiSuggestionSchema));
    },

    /** GET /api/v1/farmer/ai/predict-yield - Predict yield for season */
    predictYield: async (params: YieldPredictionParams): Promise<YieldPrediction> => {
        const validatedParams = YieldPredictionParamsSchema.parse(params);
        const response = await httpClient.get('/api/v1/farmer/ai/predict-yield', { params: validatedParams });
        return parseApiResponse(response.data, YieldPredictionSchema);
    },

    /** GET /api/v1/farmer/ai/optimize-cost - Get cost optimization suggestions */
    optimizeCost: async (params: CostOptimizationParams): Promise<CostOptimization> => {
        const validatedParams = CostOptimizationParamsSchema.parse(params);
        const response = await httpClient.get('/api/v1/farmer/ai/optimize-cost', { params: validatedParams });
        return parseApiResponse(response.data, CostOptimizationSchema);
    },

    /** POST /api/v1/farmer/ai/predict-harvest - Predict harvest time */
    predictHarvest: async (data: PredictHarvestRequest): Promise<PredictHarvestResponse> => {
        const validatedPayload = PredictHarvestRequestSchema.parse(data);
        const response = await httpClient.post('/api/v1/farmer/ai/predict-harvest', validatedPayload);
        
        let rawData = response.data.result || response.data.data;
        if (typeof rawData === 'string') {
            let jsonString = rawData;
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/```json\n?/, '').replace(/```\n?$/, '');
            }
            rawData = JSON.parse(jsonString);
        }
        
        // We can't use parseApiResponse directly if the response.data.result was a string and we just parsed it.
        // We'll reconstruct a response-like object to pass to parseApiResponse, or just parse the result directly.
        // Since we know we want to return PredictHarvestResponse, we just parse rawData with the schema.
        return PredictHarvestResponseSchema.parse(rawData);
    },

    // ════════════════════════════════════════════════════════════════════════════
    // BUYER AI ENDPOINTS
    // ════════════════════════════════════════════════════════════════════════════

    /** POST /api/v1/buyer/ai/chat - Buyer procurement Q&A chat */
    buyerChat: async (data: BuyerAiChatRequest): Promise<BuyerAiChatResponse> => {
        const validatedPayload = BuyerAiChatRequestSchema.parse(data);
        const response = await httpClient.post('/api/v1/buyer/ai/chat', validatedPayload);
        return parseApiResponse(response.data, BuyerAiChatResponseSchema);
    },

    /** GET /api/v1/ai/qa - AI Q&A (Buyer) */
    askQuestion: async (data: AiQaRequest): Promise<AiQaResponse> => {
        const validatedPayload = AiQaRequestSchema.parse(data);
        const response = await httpClient.get('/api/v1/ai/qa', { params: validatedPayload });
        return parseApiResponse(response.data, AiQaResponseSchema);
    },
};
