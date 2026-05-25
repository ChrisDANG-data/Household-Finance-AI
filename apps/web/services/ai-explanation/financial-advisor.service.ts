import {
  generateFinancialAdvice,
  type FinancialAdviceResponse,
  type GenerateFinancialAdviceInput,
} from "@/services/ai/advisor";

/**
 * AI Explanation Layer facade — delegates to services/ai/advisor.
 */
export class FinancialAdvisorService {
  generateAdvice(
    input: GenerateFinancialAdviceInput,
  ): Promise<FinancialAdviceResponse> {
    return generateFinancialAdvice(input);
  }
}

export const financialAdvisorService = new FinancialAdvisorService();
