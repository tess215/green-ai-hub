import React, { useState } from 'react';
import { X, Sparkles, Wand2, LayoutTemplate, Layers } from 'lucide-react';
import { AgentPolicy, globalPolicyStore } from '../../policies';
import { AgentTemplate } from '../../config';
import { createPolicyFromTemplate } from '../../agentBuilder';
import { TemplateGallery } from './TemplateGallery';
import { AgentWizard } from './AgentWizard';
import { AgentFromPrompt } from './AgentFromPrompt';
import { AgentPreview } from './AgentPreview';

interface AgentBuilderModalProps {
  existingPolicies: AgentPolicy[];
  initialMode?: 'template' | 'wizard' | 'prompt';
  initialPolicyForEdit?: AgentPolicy;
  onClose: () => void;
  onAgentCreated: (policy: AgentPolicy) => void;
}

export const AgentBuilderModal: React.FC<AgentBuilderModalProps> = ({
  existingPolicies,
  initialMode = 'template',
  initialPolicyForEdit,
  onClose,
  onAgentCreated,
}) => {
  const [activeTab, setActiveTab] = useState<'template' | 'wizard' | 'prompt'>(initialMode);
  const [previewData, setPreviewData] = useState<{
    policy: AgentPolicy;
    yamlContent: string;
    tokensUsed?: number;
  } | null>(
    initialPolicyForEdit
      ? {
          policy: initialPolicyForEdit,
          yamlContent: initialPolicyForEdit.rawYaml,
          tokensUsed: 0,
        }
      : null
  );

  const handleSelectTemplate = (template: AgentTemplate) => {
    const policy = createPolicyFromTemplate(template);
    setPreviewData({
      policy,
      yamlContent: policy.rawYaml,
      tokensUsed: 0,
    });
  };

  const handleWizardComplete = (policy: AgentPolicy, yamlContent: string) => {
    setPreviewData({
      policy,
      yamlContent,
      tokensUsed: 0,
    });
  };

  const handlePromptSuccess = (policy: AgentPolicy, yamlContent: string, tokensUsed: number) => {
    setPreviewData({
      policy,
      yamlContent,
      tokensUsed,
    });
  };

  const handleFinalStartAgent = async (policy: AgentPolicy, yamlContent: string) => {
    await globalPolicyStore.savePolicy(policy.filename, yamlContent);
    onAgentCreated(policy);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-white shadow-sm">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                Neuer Kolibri-Agent
              </h2>
              <p className="text-xs text-slate-300 font-medium">
                Erstelle oder passe nachhaltige Agenten mit klarer Richtlinie an
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pathway Tabs (only if not in Preview mode) */}
        {!previewData && (
          <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50">
            <button
              type="button"
              onClick={() => setActiveTab('template')}
              className={`py-3 px-4 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'template'
                  ? 'border-rose-600 text-rose-800 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              <span>Aus Vorlage</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('wizard')}
              className={`py-3 px-4 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'wizard'
                  ? 'border-rose-600 text-rose-800 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Selbst bauen (Assistent)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('prompt')}
              className={`py-3 px-4 text-xs font-bold text-center border-b-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'prompt'
                  ? 'border-rose-600 text-rose-800 bg-white shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Bauen lassen (Prompt)</span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto max-h-[75vh]">
          {previewData ? (
            <AgentPreview
              policy={previewData.policy}
              yamlContent={previewData.yamlContent}
              tokensSpentOnGeneration={previewData.tokensUsed}
              onBack={() => setPreviewData(null)}
              onStartAgent={handleFinalStartAgent}
            />
          ) : activeTab === 'template' ? (
            <TemplateGallery
              existingPolicies={existingPolicies}
              onSelectTemplate={handleSelectTemplate}
            />
          ) : activeTab === 'wizard' ? (
            <AgentWizard
              initialPolicy={initialPolicyForEdit}
              onComplete={handleWizardComplete}
              onCancel={onClose}
            />
          ) : (
            <AgentFromPrompt
              onSuccess={handlePromptSuccess}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
