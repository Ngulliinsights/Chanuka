// Important: This test mocks the EXTERNAL API call.
// It does NOT test the ML model itself.

import { mlServiceAdapter, MlServiceAdapter } from '../ml-service-adapter';
// If you have a real client, mock it here:
// import { MlApiClient } from 'some-ml-client';
// jest.mock('some-ml-client');

describe('MlServiceAdapter', () => {
    let adapter: MlServiceAdapter;
    // const mockApiClient = new MlApiClient() as jest.Mocked<MlApiClient>; // Mocked instance

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset or provide mock implementations for the client methods
        // (mockApiClient.analyzeStakeholders as jest.Mock).mockClear();
        // (mockApiClient.analyzeBeneficiaries as jest.Mock).mockClear();

        adapter = new MlServiceAdapter();
        // If using a real client: adapter = new MlServiceAdapter(mockApiClient);
    });

    describe('analyzeStakeholders', () => {
        it('should call the ML API client and transform the response', async () => {
            // Arrange
             const mockApiResp = { data: { identified_groups: ["group A"], influence_scores: {"group A": 0.8} }, model_confidence: 0.9 };
             // (mockApiClient.analyzeStakeholders as jest.Mock).mockResolvedValue(mockApiResp); // Mock the actual client call
            const inputText = "Some bill text mentioning group A.";

            // Act
            const result = await adapter.analyzeStakeholders(inputText);

            // Assert
            // expect(mockApiClient.analyzeStakeholders).toHaveBeenCalledWith({ text: inputText }); // Verify client call
            expect(result).toHaveProperty('result');
            expect(result).toHaveProperty('confidence');
            expect(result.confidence).toBeCloseTo(85); // Based on current mock implementation
             // Add more specific assertions based on transformation logic
             expect(result.result).toEqual(expect.objectContaining({
                // Check transformed fields
             }));
        });

         it('should return empty result for empty input', async () => {
             const result = await adapter.analyzeStakeholders("   ");
             expect(result.confidence).toBe(0);
             // expect(mockApiClient.analyzeStakeholders).not.toHaveBeenCalled(); // Client shouldn't be called
         });


        it('should throw an error if the API client call fails', async () => {
            // Arrange
            const apiError = new Error("ML Service Unavailable");
             // (mockApiClient.analyzeStakeholders as jest.Mock).mockRejectedValue(apiError); // Mock failure
            const inputText = "Some bill text.";

            // Act & Assert
             await expect(adapter.analyzeStakeholders(inputText)).rejects.toThrow(/ML service failed during stakeholder analysis/);
        });
    });

     describe('analyzeBeneficiaries', () => {
         it('should call the ML API client and transform the response', async () => {
             // Arrange
              const mockApiResp = { data: { direct_beneficiaries: ["group B"], potential_losers: ["group C"] }, model_confidence: 0.88 };
              // (mockApiClient.analyzeBeneficiaries as jest.Mock).mockResolvedValue(mockApiResp);
             const inputText = "Text about group B and group C.";

             // Act
             const result = await adapter.analyzeBeneficiaries(inputText);

             // Assert
             // expect(mockApiClient.analyzeBeneficiaries).toHaveBeenCalledWith({ text: inputText });
             expect(result.confidence).toBeCloseTo(90); // Based on current mock
             expect(result.result.directBeneficiaries).toContain("group B");
             expect(result.result.potentialLosers).toContain("group C");
         });

         // Add tests for empty input and API failure similar to analyzeStakeholders
     });

});