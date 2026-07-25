import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../shared/types';
import { AssistantService } from './assistant.service';
import { BadRequestError } from '../../shared/errors';

export const handleChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      throw new BadRequestError('Conversation history "messages" is required and must be an array.');
    }

    // Call service to interact with Groq LLM
    const response = await AssistantService.processChat(messages);
    
    sendSuccess(res, response);
  } catch (error) {
    next(error);
  }
};
