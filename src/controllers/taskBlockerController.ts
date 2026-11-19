
import { Request, Response } from 'express';

import {
  raiseBlocker,
  sendBlockerMessage,
  getBlockerConversation,
  getBlockerMessages,
  resolveBlocker,
} from '../service/taskBlockerService';


export const someController = async (
  req: Request,
  res: Response
) => {
  const userId = req.user?.id;
  const userRole = req.user?.role;
};

interface ControllerError extends Error {
  statusCode?: number;
}

// Common error handler
const handleError = (res: Response, error: unknown) => {
  const err = error as ControllerError;

  console.error('Task blocker error:', err);

  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
};

// Validate logged-in user
const getUserId = (req: Request): number => {
  const userId = Number(req.user?.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('Invalid or missing authenticated user');
  }

  return userId;
};

// 1. Raise blocker
export const raiseTaskBlocker = async (
  req: Request,
  res: Response
) => {
  try {
    const taskId = Number(req.params.taskId);
    const menteeId = getUserId(req);
    const { message } = req.body;

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      });
    }

    const result = await raiseBlocker(
      taskId,
      menteeId,
      message
    );

    return res.status(201).json({
      success: true,
      message: 'Blocker raised successfully',
      data: {
        conversation: result.conversation,
        message: result.message,
        recipientId: result.mentorId,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 2. Get conversation for a task
export const getTaskBlockerConversation = async (
  req: Request,
  res: Response
) => {
  try {
    const taskId = Number(req.params.taskId);
    const userId = getUserId(req);

    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid task ID',
      });
    }

    const conversation = await getBlockerConversation(
      taskId,
      userId
    );

    return res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 3. Get conversation messages
export const getTaskBlockerMessages = async (
  req: Request,
  res: Response
) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const userId = getUserId(req);

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    if (
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const result = await getBlockerMessages(
      conversationId,
      userId,
      page,
      limit
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 4. Send a message
export const sendTaskBlockerMessage = async (
  req: Request,
  res: Response
) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const senderId = getUserId(req);
    const { message } = req.body;

    if (
      !Number.isInteger(conversationId) ||
      conversationId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid conversation ID',
      });
    }

    const result = await sendBlockerMessage(
      conversationId,
      senderId,
      message
    );

    return res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message: result.message,
        recipientId: result.recipientId,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

// 5. Resolve blocker
export const resolveTaskBlocker = async (
  req: Request,
  res: Response
) => {
  try {
    const conversationId = Number(req.params.conversationId);
    const userId = getUserId(req);

    const result = await resolveBlocker(
      conversationId,
      userId
    );

    return res.status(200).json({
      success: true,
      message: 'Blocker resolved successfully',
      data: {
        conversation: result.conversation,
        task: result.task,
        recipientId: result.mentorId,
      },
    });

  } catch (error) {
    return handleError(res, error);
  }
};
