import { AiFixPatchProposal, MinimalCodeContext, AiFixProviderType } from '../types';

export interface CodeFixProvider {
  name: string;
  providerType: AiFixProviderType;
  generatePatch(
    context: MinimalCodeContext,
    customApiKey?: string
  ): Promise<AiFixPatchProposal>;
}
