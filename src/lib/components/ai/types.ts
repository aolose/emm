// Type definitions for the AI assistant feature.

export type AiStatus = 'checking' | 'available' | 'no_key' | 'invalid' | 'error';

export interface AiModel {
	id: string;
	owned_by: string;
}

export type DeepThinkMode = 'enabled' | 'disabled';

export interface AiMessage {
	role: 'user' | 'assistant' | 'tool' | 'system';
	content: string;
	reasoning_content?: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
}

export interface ToolCall {
	id: string;
	type: 'function';
	function: {
		name: string;
		arguments: string;
	};
}

export interface ToolDef {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, unknown>;
			required: string[];
		};
	};
}

export interface PendingAction {
	tool_calls: ToolCall[];
	toolLabels: string[];
	resolve: (approved: boolean) => void;
}
