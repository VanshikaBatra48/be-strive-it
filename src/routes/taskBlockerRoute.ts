
import { Router } from 'express';

import {
  raiseTaskBlocker,
  getTaskBlockerConversation,
  getTaskBlockerMessages,
  sendTaskBlockerMessage,
  resolveTaskBlocker,
} from '../controllers/taskBlockerController';

import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// All blocker routes require authentication
router.use(authenticate);

// Raise a blocker for a task
router.post(
  '/tasks/:taskId',
  raiseTaskBlocker
);

// Get the blocker conversation for a task
router.get(
  '/tasks/:taskId',
  getTaskBlockerConversation
);

// Get messages with pagination
router.get(
  '/:conversationId/messages',
  getTaskBlockerMessages
);

// Send a message
router.post(
  '/:conversationId/messages',
  sendTaskBlockerMessage
);

// Resolve a blocker
router.patch(
  '/:conversationId/resolve',
  resolveTaskBlocker
);

export default router;
