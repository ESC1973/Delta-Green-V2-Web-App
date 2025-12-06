
export type Sender = 'player' | 'handler';

export interface BaseMessage {
  sender: Sender;
  content: string;
}

export interface HandlerMessage extends BaseMessage {
  sender: 'handler';
  choices?: string[];
}

export interface PlayerMessageContent extends BaseMessage {
  sender: 'player';
}

export type ChatMessage = HandlerMessage | PlayerMessageContent;

export interface PlayerInputMessage {
    type: 'ic' | 'ooc' | 'roll' | 'choice';
    content: string;
}

export interface HandlerResponse {
    narrative: string;
    choices: string[];
    awaitsRoll: boolean;
}
