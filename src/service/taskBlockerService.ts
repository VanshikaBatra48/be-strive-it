
import { Op } from 'sequelize';

import Task from '../models/tasks';
import TaskBlockerConversation from '../models/taskBlockerConversation';
import TaskBlockerMessage from '../models/taskBlockerMessage';
import { sequelize } from '../config/database';

interface ServiceError extends Error {
  statusCode?: number;
}

const createError = (message: string, statusCode: number): ServiceError => {
  const error = new Error(message) as ServiceError;
  error.statusCode = statusCode;
  return error;
};

const validateMessage = (message: string): string => {
  if (!message || !message.trim()) {
    throw createError('Message cannot be empty', 400);
  }

  return message.trim();
};

/**
 * Raise a blocker for a task.
 * Creates a conversation if one does not exist.
 * If an old conversation is resolved, reopens it.
 * Saves the first message.
 */
export const raiseBlocker = async (
  taskId: number,
  menteeId: number,
  message: string
) => {
  const cleanMessage = validateMessage(message);

  return await sequelize.transaction(async (transaction) => {
    // 1. Find the task
    const task = await Task.findByPk(taskId, { transaction });

    if (!task) {
      throw createError('Task not found', 404);
    }

    // 2. Verify that the logged-in user owns this task
    if (Number(task.mentee_id) !== menteeId) {
      throw createError(
        'You are not authorized to raise a blocker for this task',
        403
      );
    }

    // 3. Get the assigned mentor
    // Assumption: assigned_by stores the mentor's user ID.
    const mentorId = Number(task.assigned_by);

    if (!mentorId || mentorId === menteeId) {
      throw createError('No valid mentor is assigned to this task', 400);
    }

    // 4. Find an existing conversation for this task
    let conversation = await TaskBlockerConversation.findOne({
      where: { taskId: taskId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // 5. Create a conversation if this task has never had one
    if (!conversation) {
      conversation = await TaskBlockerConversation.create(
        {
          taskId: taskId,
          menteeId: menteeId,
          mentorId: mentorId,
          status: 'open',
        },
        { transaction }
      );
    } else {
      // Check that the participants still match the task
      if (
        Number(conversation.menteeId) !== menteeId ||
        Number(conversation.mentorId) !== mentorId
      ) {
        throw createError(
          'The existing blocker conversation has different participants',
          409
        );
      }

      // Reopen a previously resolved conversation
      if (conversation.status === 'resolved') {
        await conversation.update(
          {
            status: 'open'
          },
          { transaction }
        );
      }
    }

    // 6. Update task status
    await task.update(
      { status: 'blocker' },
      { transaction }
    );

    // 7. Save the initial blocker message
    const blockerMessage = await TaskBlockerMessage.create(
      {
        conversationId: conversation.id,
        senderId: menteeId,
        message: cleanMessage,
      },
      { transaction }
    );

    return {
      conversation,
      message: blockerMessage,
      mentorId,
    };
  });
};

/**
 * Send a message in an existing blocker conversation.
 */
export const sendBlockerMessage = async (
  conversationId: number,
  senderId: number,
  message: string
) => {
  const cleanMessage = validateMessage(message);

  return await sequelize.transaction(async (transaction) => {
    const conversation = await TaskBlockerConversation.findByPk(
      conversationId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }
    );

    if (!conversation) {
      throw createError('Blocker conversation not found', 404);
    }

    // Only the assigned mentee and mentor can send messages
    const isParticipant =
      Number(conversation.menteeId) === senderId ||
      Number(conversation.mentorId) === senderId;

    if (!isParticipant) {
      throw createError('You cannot access this conversation', 403);
    }

    if (conversation.status !== 'open') {
      throw createError(
        'This blocker conversation is resolved',
        400
      );
    }

    const newMessage = await TaskBlockerMessage.create(
      {
        conversationId: conversationId,
        senderId: senderId,
        message: cleanMessage,
      },
      { transaction }
    );

    return {
      conversation,
      message: newMessage,
      recipientId:
        Number(conversation.menteeId) === senderId
          ? Number(conversation.mentorId)
          : Number(conversation.menteeId),
    };
  });
};

/**
 * Get blocker conversation for a task.
 */
export const getBlockerConversation = async (
  taskId: number,
  userId: number
) => {
  const conversation = await TaskBlockerConversation.findOne({
    where: { taskId: taskId },
  });

  if (!conversation) {
    throw createError('No blocker conversation found', 404);
  }

  const isParticipant =
    Number(conversation.menteeId) === userId ||
    Number(conversation.mentorId) === userId;

  if (!isParticipant) {
    throw createError('You cannot access this conversation', 403);
  }

  return conversation;
};

/**
 * Get messages with pagination.
 * Defaults to 20 messages per request.
 */
export const getBlockerMessages = async (
  conversationId: number,
  userId: number,
  page = 1,
  limit = 20
) => {
  const conversation = await TaskBlockerConversation.findByPk(
    conversationId
  );

  if (!conversation) {
    throw createError('Blocker conversation not found', 404);
  }

  const isParticipant =
    Number(conversation.menteeId) === userId ||
    Number(conversation.mentorId) === userId;

  if (!isParticipant) {
    throw createError('You cannot access this conversation', 403);
  }

  const safePage = Math.max(1, page);
  const safeLimit = Math.min(100, Math.max(1, limit));
  const offset = (safePage - 1) * safeLimit;

  const { count, rows } = await TaskBlockerMessage.findAndCountAll({
    where: { conversationId: conversationId },
    order: [['created_at', 'DESC']],
    limit: safeLimit,
    offset,
  });

  return {
    messages: rows.reverse(),
    pagination: {
      totalMessages: count,
      currentPage: safePage,
      totalPages: Math.ceil(count / safeLimit),
      limit: safeLimit,
    },
  };
};

/**
 * Resolve a blocker conversation.
 * Only the assigned mentor can resolve it.
 */
export const resolveBlocker = async (
  conversationId: number,
  userId: number
) => {
  return await sequelize.transaction(async (transaction) => {

    // 1. Find blocker conversation
    const conversation = await TaskBlockerConversation.findByPk(
      conversationId,
      {
        transaction,
        lock: transaction.LOCK.UPDATE,
      }
    );

    if (!conversation) {
      throw createError('Blocker conversation not found', 404);
    }

    // 2. Only the mentee who raised the blocker can resolve it
    if (Number(conversation.menteeId) !== userId) {
      throw createError(
        'Only the mentee who raised this blocker can resolve it',
        403
      );
    }

    // 3. Check whether already resolved
    if (conversation.status === 'resolved') {
      throw createError(
        'This blocker is already resolved',
        400
      );
    }

    // 4. Mark conversation as resolved
    await conversation.update(
      {
        status: 'resolved'
      },
      { transaction }
    );

    // 5. Update task status
    const task = await Task.findByPk(conversation.taskId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!task) {
      throw createError('Associated task not found', 404);
    }

    await task.update(
      {
        status: 'in-progress',
      },
      { transaction }
    );

    return {
      conversation,
      task,
      mentorId: conversation.mentorId,
    };
  });
};