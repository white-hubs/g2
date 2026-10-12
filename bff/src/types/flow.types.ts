export interface FlowExecutionInputFileRef {
  id?: string | null;
  name?: string | null;
  path?: string | null;
  file_path?: string | null;
  filePath?: string | null;
  url?: string | null;
  mime?: string | null;
  ext?: Record<string, unknown> | null;
}

export interface FlowFileUploadResult extends FlowExecutionInputFileRef {
  flowId?: string | null;
  raw?: unknown;
}

export interface FlowExecutionInput {
  query?: string;
  files?: FlowExecutionInputFileRef[] | null;
  history?: Array<{ role: string; content: string; ext?: Record<string, unknown> | null }> | null;
  ext?: Record<string, unknown> | null;
}

export interface FlowRunPayload extends Record<string, unknown> {
  input?: string | FlowExecutionInput | null;
  sessionId?: string | null;
  inputType?: string | null;
  outputType?: string | null;
  tweaks?: Record<string, unknown> | null;
  variables?: Record<string, unknown> | null;
}

export interface FlowRunResult extends Record<string, unknown> {
  raw?: {
    outputs?: unknown[];
    session_id?: string | null;
  } | null;
}
