import React from 'react';
import { User, Bot } from 'lucide-react';
import { PipelineExecutionResult } from '../chain';
import { ReceiptCard } from './ReceiptCard';

import { getAgentIcon } from './Icons';
import { AgentPolicy } from '../policies';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  result?: PipelineExecutionResult;
  agent?: AgentPolicy | null;
}

interface ChatMessageItemProps {
  message: ChatMessage;
  onOpenProtocol: (result: PipelineExecutionResult) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message, onOpenProtocol }) => {
  const isUser = message.role === 'user';
  const activeAgent = message.agent || message.result?.activeAgent;
  const AgentIcon = activeAgent ? getAgentIcon(activeAgent.icon) : Bot;

  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div
          className="w-8 h-8 rounded-lg text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5"
          style={{ backgroundColor: activeAgent?.farbe || '#be123c' }}
        >
          <AgentIcon className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-2xl ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-bold text-slate-800">
            {isUser ? 'Du' : 'Kolibri KI-Pipeline'}
          </span>
          {activeAgent && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.2 rounded-md text-[10px] font-bold border"
              style={{
                backgroundColor: `${activeAgent.farbe || '#0F766E'}18`,
                borderColor: `${activeAgent.farbe || '#0F766E'}40`,
                color: activeAgent.farbe || '#0F766E',
              }}
            >
              <AgentIcon className="w-2.5 h-2.5" />
              <span>{activeAgent.agent}</span>
            </span>
          )}
          <span className="text-[11px] font-medium text-slate-500">
            {message.timestamp}
          </span>
        </div>

        <div
          className={`p-4 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-rose-600 text-white rounded-tr-xs shadow-2xs font-medium'
              : 'bg-white text-slate-900 border border-slate-200 rounded-tl-xs shadow-xs font-normal'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>

          {!isUser && message.result && (
            <ReceiptCard
              result={message.result}
              onOpenProtocol={() => onOpenProtocol(message.result!)}
            />
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
